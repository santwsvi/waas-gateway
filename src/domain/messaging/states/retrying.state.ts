import type { Message } from '../message.aggregate.js';
import { MessageStatus } from '../message-status.js';
import { BaseMessageState } from './base-message.state.js';

export class RetryingState extends BaseMessageState {
  readonly status = MessageStatus.Retrying;

  markSending(message: Message): void {
    message.transitionTo(MessageStatus.Sending);
  }
}
