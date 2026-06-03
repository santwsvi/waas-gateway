import type { Message } from '../message.aggregate.js';
import { MessageStatus } from '../message-status.js';
import { BaseMessageState } from './base-message.state.js';

export class SentState extends BaseMessageState {
  readonly status = MessageStatus.Sent;

  markDelivered(message: Message): void {
    message.transitionTo(MessageStatus.Delivered);
  }
}
