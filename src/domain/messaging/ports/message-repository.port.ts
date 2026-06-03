import type { Message } from '../message.aggregate.js';
import type { MessageStatus } from '../message-status.js';

export const MESSAGE_REPOSITORY = Symbol('IMessageRepository');

export interface IMessageRepository {
  findById(id: string): Promise<Message | null>;
  findByIdempotencyKey(idempotencyKey: string): Promise<Message | null>;
  findByChannel(channelId: string): Promise<Message[]>;
  findByChannelAndStatus(channelId: string, status: MessageStatus): Promise<Message[]>;
  save(message: Message): Promise<void>;
}
