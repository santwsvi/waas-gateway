import type { Channel } from '../channel.aggregate.js';
import { ChannelStatus } from '../channel-status.js';
import { BaseChannelState } from './base-channel.state.js';

export class ConnectingState extends BaseChannelState {
  readonly status = ChannelStatus.Connecting;

  markQrPending(channel: Channel, qrCode: string): void {
    channel.transitionTo(ChannelStatus.QrPending, qrCode);
  }

  markConnected(channel: Channel): void {
    channel.transitionTo(ChannelStatus.Connected);
  }
}
