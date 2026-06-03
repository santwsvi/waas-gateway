import type { IMessageRepository } from '@domain/messaging/ports/message-repository.port.js';
import type { Message } from '@domain/messaging/message.aggregate.js';
import type { MessageStatus } from '@domain/messaging/message-status.js';

export class InMemoryMessageRepository implements IMessageRepository {
  private items: Map<string, Message> = new Map();

  async findById(id: string): Promise<Message | null> {
    return this.items.get(id) ?? null;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<Message | null> {
    for (const msg of this.items.values()) {
      if (msg.idempotencyKey === idempotencyKey) return msg;
    }
    return null;
  }

  async findByChannel(channelId: string): Promise<Message[]> {
    return [...this.items.values()].filter((m) => m.channelId === channelId);
  }

  async findByChannelAndStatus(channelId: string, status: MessageStatus): Promise<Message[]> {
    return [...this.items.values()].filter(
      (m) => m.channelId === channelId && m.status === status,
    );
  }

  async save(message: Message): Promise<void> {
    this.items.set(message.id, message);
  }

  clear(): void {
    this.items.clear();
  }

  get count(): number {
    return this.items.size;
  }
}
