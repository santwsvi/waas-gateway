import type { Channel } from '../channel.aggregate.js';
import { ChannelStatus } from '../channel-status.js';
import { InvalidStateTransitionError } from '../errors/invalid-state-transition.error.js';
import type { IChannelState } from './channel-state.interface.js';

export abstract class BaseChannelState implements IChannelState {
  abstract readonly status: ChannelStatus;

  connect(_channel: Channel): void {
    throw new InvalidStateTransitionError(this.status, ChannelStatus.Connecting);
  }

  markQrPending(_channel: Channel, _qrCode: string): void {
    throw new InvalidStateTransitionError(this.status, ChannelStatus.QrPending);
  }

  markConnected(_channel: Channel): void {
    throw new InvalidStateTransitionError(this.status, ChannelStatus.Connected);
  }

  markReconnecting(_channel: Channel): void {
    throw new InvalidStateTransitionError(this.status, ChannelStatus.Reconnecting);
  }

  disconnect(_channel: Channel): void {
    throw new InvalidStateTransitionError(this.status, ChannelStatus.Disconnected);
  }

  markFailed(channel: Channel, reason: string): void {
    channel.transitionTo(ChannelStatus.Failed, reason);
  }
}
