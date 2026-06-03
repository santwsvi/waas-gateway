import { DomainEvent } from '@domain/shared/domain-event.js';

export class MessageSendingEvent extends DomainEvent {
  readonly eventType = 'message.sending';

  constructor(aggregateId: string) {
    super(aggregateId);
  }
}
