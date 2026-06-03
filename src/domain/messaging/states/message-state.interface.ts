import type { Message } from '../message.aggregate.js';
import type { MessageStatus } from '../message-status.js';
import type { FailureReason } from '../value-objects/failure-reason.vo.js';
import type { ProviderMessageRef } from '../value-objects/provider-message-ref.vo.js';

export interface IMessageState {
  readonly status: MessageStatus;
  markQueued(message: Message): void;
  markSending(message: Message): void;
  markSent(message: Message, providerRef: ProviderMessageRef): void;
  markDelivered(message: Message): void;
  markRead(message: Message): void;
  markFailed(message: Message, reason: FailureReason): void;
  markRetrying(message: Message): void;
  markDeadLettered(message: Message): void;
}
