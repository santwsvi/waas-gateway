import { MessageStatus } from '../message-status.js';
import { BaseMessageState } from './base-message.state.js';

export class DeadLetteredState extends BaseMessageState {
  readonly status = MessageStatus.DeadLettered;
}
