import type { Channel } from '../channel.aggregate.js';
import { ChannelStatus } from '../channel-status.js';
import { BaseChannelState } from './base-channel.state.js';

export class CreatedState extends BaseChannelState {
  readonly status = ChannelStatus.Created;

  connect(channel: Channel): void {
    channel.transitionTo(ChannelStatus.Connecting);
  }
}
