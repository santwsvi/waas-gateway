import type { Message } from '../message.aggregate.js';
import { MessageStatus } from '../message-status.js';
import type { FailureReason } from '../value-objects/failure-reason.vo.js';
import type { ProviderMessageRef } from '../value-objects/provider-message-ref.vo.js';
import { BaseMessageState } from './base-message.state.js';

export class SendingState extends BaseMessageState {
  readonly status = MessageStatus.Sending;

  markSent(message: Message, providerRef: ProviderMessageRef): void {
    message.transitionTo(MessageStatus.Sent, { providerRef });
  }

  markFailed(message: Message, reason: FailureReason): void {
    message.transitionTo(MessageStatus.Failed, { failureReason: reason });
  }
}
