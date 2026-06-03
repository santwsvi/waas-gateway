import { MessageStatus } from '../message-status.js';
import { BaseMessageState } from './base-message.state.js';

export class ReceivedState extends BaseMessageState {
  readonly status = MessageStatus.Received;
}
