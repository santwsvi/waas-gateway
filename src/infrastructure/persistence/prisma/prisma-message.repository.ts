import { Injectable } from '@nestjs/common';
import type { IMessageRepository } from '@domain/messaging/ports/message-repository.port.js';
import { Message } from '@domain/messaging/message.aggregate.js';
import { MessageStatus, MessageDirection } from '@domain/messaging/message-status.js';
import { PhoneNumber } from '@domain/messaging/value-objects/phone-number.vo.js';
import {
  MessageContent,
  MessageContentType,
} from '@domain/messaging/value-objects/message-content.vo.js';
import { RetryPolicy } from '@domain/messaging/value-objects/retry-policy.vo.js';
import { ProviderMessageRef } from '@domain/messaging/value-objects/provider-message-ref.vo.js';
import {
  FailureReason,
  FailureCategory,
} from '@domain/messaging/value-objects/failure-reason.vo.js';
import {
  DeliveryAttempt,
  DeliveryAttemptStatus,
} from '@domain/messaging/entities/delivery-attempt.entity.js';
import { PrismaService } from './prisma.service.js';

interface MessageRow {
  id: string;
  workspaceId: string;
  channelId: string;
  direction: string;
  toPhone: string;
  fromPhone: string | null;
  contentType: string;
  contentBody: string;
  mediaUrl: string | null;
  mimeType: string | null;
  templateId: string | null;
  templateParams: unknown;
  status: string;
  idempotencyKey: string;
  providerExternalId: string | null;
  providerTimestamp: Date | null;
  retryMaxAttempts: number;
  retryBackoffBaseMs: number;
  retryBackoffMultiplier: number;
  failureCategory: string | null;
  failureMessage: string | null;
  failureRetryable: boolean | null;
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deliveryAttempts: Array<{
    id: string;
    messageId: string;
    attemptNumber: number;
    status: string;
    providerResponse: string | null;
    failureCode: string | null;
    failureMessage: string | null;
    failureRetryable: boolean | null;
    startedAt: Date;
    completedAt: Date | null;
    durationMs: number | null;
  }>;
}

@Injectable()
export class PrismaMessageRepository implements IMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Message | null> {
    const row = await this.prisma.message.findUnique({
      where: { id },
      include: { deliveryAttempts: true },
    });
    if (!row) return null;
    return this.toDomain(row as MessageRow);
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<Message | null> {
    const row = await this.prisma.message.findUnique({
      where: { idempotencyKey },
      include: { deliveryAttempts: true },
    });
    if (!row) return null;
    return this.toDomain(row as MessageRow);
  }

  async findByChannel(channelId: string): Promise<Message[]> {
    const rows = await this.prisma.message.findMany({
      where: { channelId },
      include: { deliveryAttempts: true },
    });
    return rows.map((r) => this.toDomain(r as MessageRow));
  }

  async findByChannelAndStatus(
    channelId: string,
    status: MessageStatus,
  ): Promise<Message[]> {
    const rows = await this.prisma.message.findMany({
      where: { channelId, status: status as string },
      include: { deliveryAttempts: true },
    });
    return rows.map((r) => this.toDomain(r as MessageRow));
  }

  async save(message: Message): Promise<void> {
    const content = message.content.data;
    const creds = message.providerRef;

    await this.prisma.$transaction(async (tx) => {
      await tx.message.upsert({
        where: { id: message.id },
        create: {
          id: message.id,
          workspaceId: message.workspaceId,
          channelId: message.channelId,
          direction: message.direction as string,
          toPhone: message.to?.value ?? '',
          fromPhone: message.from?.value ?? null,
          contentType: content.type as string,
          contentBody: this.extractBody(content),
          mediaUrl:
            content.type === MessageContentType.MEDIA ? content.url : null,
          mimeType:
            content.type === MessageContentType.MEDIA
              ? content.mimeType
              : null,
          templateId:
            content.type === MessageContentType.TEMPLATE
              ? content.templateName
              : null,
          templateParams:
            content.type === MessageContentType.TEMPLATE
              ? {
                  language: content.language,
                  parameters: content.parameters,
                }
              : undefined,
          status: message.status as string,
          idempotencyKey: message.idempotencyKey,
          providerExternalId: creds?.providerId ?? null,
          providerTimestamp: creds?.providerTimestamp ?? null,
          retryMaxAttempts: message.retryPolicy.maxAttempts,
          retryBackoffBaseMs: message.retryPolicy.backoffBaseMs,
          retryBackoffMultiplier: message.retryPolicy.backoffMultiplier,
          failureCategory: message.failureReason?.category ?? null,
          failureMessage: message.failureReason?.message ?? null,
          failureRetryable: message.failureReason?.retryable ?? null,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
        },
        update: {
          status: message.status as string,
          providerExternalId: creds?.providerId ?? null,
          providerTimestamp: creds?.providerTimestamp ?? null,
          failureCategory: message.failureReason?.category ?? null,
          failureMessage: message.failureReason?.message ?? null,
          failureRetryable: message.failureReason?.retryable ?? null,
          updatedAt: message.updatedAt,
        },
      });

      const existing = await tx.deliveryAttempt.findMany({
        where: { messageId: message.id },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((e) => e.id));

      const newAttempts = message.deliveryAttempts.filter(
        (a) => !existingIds.has(a.id),
      );

      if (newAttempts.length > 0) {
        await tx.deliveryAttempt.createMany({
          data: newAttempts.map((a) => ({
            id: a.id,
            messageId: message.id,
            attemptNumber: a.attemptNumber,
            status: a.status as string,
            failureCode: a.failureReason?.category ?? null,
            failureMessage: a.failureReason?.message ?? null,
            failureRetryable: a.failureReason?.retryable ?? null,
            startedAt: a.timestamp,
            completedAt: a.timestamp,
          })),
        });
      }
    });
  }

  private extractBody(content: {
    type: MessageContentType;
    body?: string;
    caption?: string;
    templateName?: string;
  }): string {
    switch (content.type) {
      case MessageContentType.TEXT:
        return content.body ?? '';
      case MessageContentType.MEDIA:
        return content.caption ?? '';
      case MessageContentType.TEMPLATE:
        return content.templateName ?? '';
    }
  }

  private toDomain(row: MessageRow): Message {
    const content = this.buildContent(row);
    const to = row.toPhone ? PhoneNumber.create(row.toPhone) : null;
    const from = row.fromPhone ? PhoneNumber.create(row.fromPhone) : null;

    const providerRef =
      row.providerExternalId
        ? ProviderMessageRef.create(
            row.providerExternalId,
            row.providerTimestamp ?? undefined,
          )
        : null;

    const failureReason =
      row.failureCategory && row.failureMessage
        ? FailureReason.create(
            row.failureCategory as FailureCategory,
            row.failureMessage,
            row.failureRetryable ?? undefined,
          )
        : null;

    const deliveryAttempts = row.deliveryAttempts.map((a) =>
      DeliveryAttempt.create({
        messageId: a.messageId,
        attemptNumber: a.attemptNumber,
        status: a.status as DeliveryAttemptStatus,
        failureReason:
          a.failureCode && a.failureMessage
            ? FailureReason.create(
                a.failureCode as FailureCategory,
                a.failureMessage,
                a.failureRetryable ?? undefined,
              )
            : null,
        id: a.id,
      }),
    );

    return Message.reconstitute(row.id, {
      workspaceId: row.workspaceId,
      channelId: row.channelId,
      direction: row.direction as MessageDirection,
      to: to as PhoneNumber,
      from,
      content,
      idempotencyKey: row.idempotencyKey,
      status: row.status as MessageStatus,
      retryPolicy: RetryPolicy.create(
        row.retryMaxAttempts,
        row.retryBackoffBaseMs,
        row.retryBackoffMultiplier,
      ),
      providerRef,
      failureReason,
      deliveryAttempts,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private buildContent(row: MessageRow): MessageContent {
    switch (row.contentType) {
      case MessageContentType.MEDIA:
        return MessageContent.media(
          row.mediaUrl ?? '',
          row.mimeType ?? 'application/octet-stream',
          row.contentBody || undefined,
        );
      case MessageContentType.TEMPLATE: {
        const params = row.templateParams as {
          language?: string;
          parameters?: string[];
        } | null;
        return MessageContent.template(
          row.templateId ?? '',
          params?.language ?? 'en',
          params?.parameters ?? [],
        );
      }
      default:
        return MessageContent.text(row.contentBody);
    }
  }
}
