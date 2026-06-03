import type { Channel } from '../channel.aggregate.js';
import { ChannelStatus } from '../channel-status.js';
import { BaseChannelState } from './base-channel.state.js';

export class QrPendingState extends BaseChannelState {
  readonly status = ChannelStatus.QrPending;

  markConnected(channel: Channel): void {
    channel.transitionTo(ChannelStatus.Connected);
  }
}
