import type { Channel } from '../channel.aggregate.js';
import { ChannelStatus } from '../channel-status.js';
import { BaseChannelState } from './base-channel.state.js';

export class ConnectedState extends BaseChannelState {
  readonly status = ChannelStatus.Connected;

  markReconnecting(channel: Channel): void {
    channel.transitionTo(ChannelStatus.Reconnecting);
  }

  disconnect(channel: Channel): void {
    channel.transitionTo(ChannelStatus.Disconnected);
  }
}
