import type { Channel } from '../channel.aggregate.js';
import { ChannelStatus } from '../channel-status.js';
import { InvalidStateTransitionError } from '../errors/invalid-state-transition.error.js';
import { BaseChannelState } from './base-channel.state.js';

export class FailedState extends BaseChannelState {
  readonly status = ChannelStatus.Failed;

  connect(channel: Channel): void {
    channel.transitionTo(ChannelStatus.Connecting);
  }

  override markFailed(_channel: Channel, _reason: string): void {
    throw new InvalidStateTransitionError(ChannelStatus.Failed, ChannelStatus.Failed);
  }
}
