import { ChannelStatus } from '../channel-status.js';

export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly from: ChannelStatus,
    public readonly to: ChannelStatus,
  ) {
    super(`Invalid state transition from ${from} to ${to}`);
    this.name = 'InvalidStateTransitionError';
  }
}
