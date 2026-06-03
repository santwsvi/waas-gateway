import type { Channel } from '../channel.aggregate.js';
import type { ChannelStatus } from '../channel-status.js';

export const CHANNEL_REPOSITORY = Symbol('IChannelRepository');

export interface IChannelRepository {
  findById(id: string): Promise<Channel | null>;
  findByWorkspace(workspaceId: string): Promise<Channel[]>;
  findByWorkspaceAndStatus(
    workspaceId: string,
    status: ChannelStatus,
  ): Promise<Channel[]>;
  save(channel: Channel): Promise<void>;
  delete(id: string): Promise<void>;
}
