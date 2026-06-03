import type { Message } from '../message.aggregate.js';
import { MessageStatus } from '../message-status.js';
import { BaseMessageState } from './base-message.state.js';

export class FailedState extends BaseMessageState {
  readonly status = MessageStatus.Failed;

  markRetrying(message: Message): void {
    if (!message.retryPolicy.shouldRetry(message.deliveryAttempts.length)) {
      throw new Error(
        `Max retries (${message.retryPolicy.maxAttempts}) exceeded. Use markDeadLettered() instead.`,
      );
    }
    message.transitionTo(MessageStatus.Retrying);
  }

  markDeadLettered(message: Message): void {
    message.transitionTo(MessageStatus.DeadLettered);
  }
}
