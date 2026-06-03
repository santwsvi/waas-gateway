import type { Channel } from '../channel.aggregate.js';
import { ChannelStatus } from '../channel-status.js';
import { BaseChannelState } from './base-channel.state.js';

export class ReconnectingState extends BaseChannelState {
  readonly status = ChannelStatus.Reconnecting;

  markConnected(channel: Channel): void {
    channel.transitionTo(ChannelStatus.Connected);
  }

  disconnect(channel: Channel): void {
    channel.transitionTo(ChannelStatus.Disconnected);
  }
}
