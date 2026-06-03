import type { Message } from '../message.aggregate.js';
import { MessageStatus } from '../message-status.js';
import { BaseMessageState } from './base-message.state.js';

export class QueuedState extends BaseMessageState {
  readonly status = MessageStatus.Queued;

  markSending(message: Message): void {
    message.transitionTo(MessageStatus.Sending);
  }
}
