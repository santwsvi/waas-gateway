import type { Message } from '../message.aggregate.js';
import { MessageStatus } from '../message-status.js';
import { BaseMessageState } from './base-message.state.js';

export class DeliveredState extends BaseMessageState {
  readonly status = MessageStatus.Delivered;

  markRead(message: Message): void {
    message.transitionTo(MessageStatus.Read);
  }
}
