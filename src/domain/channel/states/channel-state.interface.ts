import type { Channel } from '../channel.aggregate.js';
import { ChannelStatus } from '../channel-status.js';

export interface IChannelState {
  readonly status: ChannelStatus;
  connect(channel: Channel): void;
  markQrPending(channel: Channel, qrCode: string): void;
  markConnected(channel: Channel): void;
  markReconnecting(channel: Channel): void;
  disconnect(channel: Channel): void;
  markFailed(channel: Channel, reason: string): void;
}
