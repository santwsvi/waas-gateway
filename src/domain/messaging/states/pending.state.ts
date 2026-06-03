import type { Message } from '../message.aggregate.js';
import { MessageStatus } from '../message-status.js';
import { BaseMessageState } from './base-message.state.js';

export class PendingState extends BaseMessageState {
  readonly status = MessageStatus.Pending;

  markQueued(message: Message): void {
    message.transitionTo(MessageStatus.Queued);
  }
}
