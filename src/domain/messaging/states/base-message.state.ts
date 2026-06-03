import type { Message } from '../message.aggregate.js';
import type { MessageStatus } from '../message-status.js';
import type { FailureReason } from '../value-objects/failure-reason.vo.js';
import type { ProviderMessageRef } from '../value-objects/provider-message-ref.vo.js';
import { InvalidStateTransitionError } from '../errors/invalid-state-transition.error.js';
import type { IMessageState } from './message-state.interface.js';

export abstract class BaseMessageState implements IMessageState {
  abstract readonly status: MessageStatus;

  markQueued(_message: Message): void {
    throw new InvalidStateTransitionError(this.status, 'QUEUED');
  }

  markSending(_message: Message): void {
    throw new InvalidStateTransitionError(this.status, 'SENDING');
  }

  markSent(_message: Message, _providerRef: ProviderMessageRef): void {
    throw new InvalidStateTransitionError(this.status, 'SENT');
  }

  markDelivered(_message: Message): void {
    throw new InvalidStateTransitionError(this.status, 'DELIVERED');
  }

  markRead(_message: Message): void {
    throw new InvalidStateTransitionError(this.status, 'READ');
  }

  markFailed(_message: Message, _reason: FailureReason): void {
    throw new InvalidStateTransitionError(this.status, 'FAILED');
  }

  markRetrying(_message: Message): void {
    throw new InvalidStateTransitionError(this.status, 'RETRYING');
  }

  markDeadLettered(_message: Message): void {
    throw new InvalidStateTransitionError(this.status, 'DEAD_LETTERED');
  }
}
