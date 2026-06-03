import type { Channel } from '../channel.aggregate.js';
import { ChannelStatus } from '../channel-status.js';
import { BaseChannelState } from './base-channel.state.js';

export class DisconnectedState extends BaseChannelState {
  readonly status = ChannelStatus.Disconnected;

  connect(channel: Channel): void {
    channel.transitionTo(ChannelStatus.Connecting);
  }
}
