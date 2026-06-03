import type { IChannelRepository } from '@domain/channel/ports/channel-repository.port.js';
import type { Channel } from '@domain/channel/channel.aggregate.js';
import type { ChannelStatus } from '@domain/channel/channel-status.js';

export class InMemoryChannelRepository implements IChannelRepository {
  private items: Map<string, Channel> = new Map();

  async findById(id: string): Promise<Channel | null> {
    return this.items.get(id) ?? null;
  }

  async findByWorkspace(workspaceId: string): Promise<Channel[]> {
    return [...this.items.values()].filter((c) => c.workspaceId === workspaceId);
  }

  async findByWorkspaceAndStatus(workspaceId: string, status: ChannelStatus): Promise<Channel[]> {
    return [...this.items.values()].filter(
      (c) => c.workspaceId === workspaceId && c.status === status,
    );
  }

  async save(channel: Channel): Promise<void> {
    this.items.set(channel.id, channel);
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }

  clear(): void {
    this.items.clear();
  }

  get count(): number {
    return this.items.size;
  }
}
