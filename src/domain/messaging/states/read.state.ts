import { MessageStatus } from '../message-status.js';
import { BaseMessageState } from './base-message.state.js';

export class ReadState extends BaseMessageState {
  readonly status = MessageStatus.Read;
}
