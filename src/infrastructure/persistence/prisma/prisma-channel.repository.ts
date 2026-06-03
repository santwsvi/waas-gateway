import { Injectable } from '@nestjs/common';
import type { IChannelRepository } from '@domain/channel/ports/channel-repository.port.js';
import { Channel } from '@domain/channel/channel.aggregate.js';
import { ChannelStatus, ProviderType } from '@domain/channel/channel-status.js';
import { ChannelConfig } from '@domain/channel/value-objects/channel-config.vo.js';
import { EncryptedCreds } from '@domain/channel/value-objects/encrypted-creds.vo.js';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class PrismaChannelRepository implements IChannelRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Channel | null> {
    const row = await this.prisma.channel.findUnique({ where: { id } });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByWorkspace(workspaceId: string): Promise<Channel[]> {
    const rows = await this.prisma.channel.findMany({ where: { workspaceId } });
    return rows.map((r) => this.toDomain(r));
  }

  async findByWorkspaceAndStatus(
    workspaceId: string,
    status: ChannelStatus,
  ): Promise<Channel[]> {
    const rows = await this.prisma.channel.findMany({
      where: { workspaceId, status: status as string },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async save(channel: Channel): Promise<void> {
    const creds = channel.credentials;
    const configJson = JSON.parse(JSON.stringify({
      maxConcurrentSessions: channel.config.maxConcurrentSessions,
      webhookUrl: channel.config.webhookUrl,
      metadata: channel.config.metadata,
    }));

    await this.prisma.channel.upsert({
      where: { id: channel.id },
      create: {
        id: channel.id,
        workspaceId: channel.workspaceId,
        name: channel.name,
        providerType: channel.providerType as string,
        status: channel.status as string,
        config: configJson,
        encryptedCreds: creds
          ? Buffer.from(creds.encryptedPayload, 'base64')
          : null,
        credsAlgorithm: creds?.algorithm ?? null,
        credsKeyVersion: creds?.keyVersion ?? null,
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt,
      },
      update: {
        name: channel.name,
        providerType: channel.providerType as string,
        status: channel.status as string,
        config: configJson,
        encryptedCreds: creds
          ? Buffer.from(creds.encryptedPayload, 'base64')
          : null,
        credsAlgorithm: creds?.algorithm ?? null,
        credsKeyVersion: creds?.keyVersion ?? null,
        updatedAt: channel.updatedAt,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.channel.delete({ where: { id } });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomain(row: any): Channel {
    const cfg = row.config as {
      maxConcurrentSessions?: number;
      webhookUrl?: string | null;
      metadata?: Record<string, unknown>;
    };

    const config = ChannelConfig.create({
      maxConcurrentSessions: cfg.maxConcurrentSessions,
      webhookUrl: cfg.webhookUrl,
      metadata: cfg.metadata,
    });

    const credentials =
      row.encryptedCreds && row.credsAlgorithm
        ? EncryptedCreds.create({
            encryptedPayload: Buffer.from(row.encryptedCreds).toString('base64'),
            algorithm: row.credsAlgorithm,
            keyVersion: row.credsKeyVersion ?? 1,
          })
        : null;

    return Channel.reconstitute(row.id, {
      workspaceId: row.workspaceId,
      name: row.name,
      providerType: row.providerType as ProviderType,
      status: row.status as ChannelStatus,
      config,
      credentials,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
