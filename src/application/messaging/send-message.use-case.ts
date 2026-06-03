import { Message } from '@domain/messaging/message.aggregate.js';
import { PhoneNumber } from '@domain/messaging/value-objects/phone-number.vo.js';
import { MessageContent } from '@domain/messaging/value-objects/message-content.vo.js';
import { ChannelStatus } from '@domain/channel/channel-status.js';
import type { MessageStatus } from '@domain/messaging/message-status.js';
import type { IMessageRepository } from '@domain/messaging/ports/message-repository.port.js';
import type { IChannelRepository } from '@domain/channel/ports/channel-repository.port.js';
import type { IOutboxRepository } from '@domain/shared/ports/outbox-repository.port.js';
import type { MessageContentType } from '@domain/messaging/value-objects/message-content.vo.js';

interface SendMessageInput {
  workspaceId: string;
  channelId: string;
  to: string;
  content: {
    type: string;
    body?: string;
    url?: string;
    mimeType?: string;
    caption?: string;
    templateName?: string;
    language?: string;
    parameters?: string[];
  };
  idempotencyKey: string;
}

export interface SendMessageOutput {
  id: string;
  status: MessageStatus;
  idempotencyKey: string;
}

export class SendMessageUseCase {
  constructor(
    private readonly messageRepo: IMessageRepository,
    private readonly channelRepo: IChannelRepository,
    private readonly outboxRepo: IOutboxRepository,
  ) {}

  async execute(input: SendMessageInput): Promise<SendMessageOutput> {
    const existing = await this.messageRepo.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return {
        id: existing.id,
        status: existing.status,
        idempotencyKey: existing.idempotencyKey,
      };
    }

    const channel = await this.channelRepo.findById(input.channelId);
    if (!channel) {
      throw new Error(`Channel "${input.channelId}" not found.`);
    }
    if (channel.status !== ChannelStatus.Connected) {
      throw new Error(`Channel "${input.channelId}" is not connected. Current status: ${channel.status}`);
    }

    const phoneNumber = PhoneNumber.create(input.to);
    const content = this.buildContent(input.content);

    const message = Message.create({
      workspaceId: input.workspaceId,
      channelId: input.channelId,
      to: phoneNumber,
      content,
      idempotencyKey: input.idempotencyKey,
    });

    message.markQueued();

    await this.messageRepo.save(message);

    const events = message.clearEvents();
    await this.outboxRepo.storeBatch(events);

    return {
      id: message.id,
      status: message.status,
      idempotencyKey: message.idempotencyKey,
    };
  }

  private buildContent(input: SendMessageInput['content']): MessageContent {
    switch (input.type) {
      case 'TEXT':
        return MessageContent.text(input.body!);
      case 'MEDIA':
        return MessageContent.media(input.url!, input.mimeType!, input.caption);
      case 'TEMPLATE':
        return MessageContent.template(input.templateName!, input.language!, input.parameters ?? []);
      default:
        throw new Error(`Unsupported content type: "${input.type}"`);
    }
  }
}
