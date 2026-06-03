import type { Channel } from '@domain/channel/channel.aggregate.js';
import type { ChannelStatus } from '@domain/channel/channel-status.js';

export interface IProviderLifecycle {
  connect(channel: Channel): Promise<void>;
  disconnect(channelId: string): Promise<void>;
  getStatus(channelId: string): Promise<ChannelStatus>;
}

export const PROVIDER_LIFECYCLE = Symbol('IProviderLifecycle');
