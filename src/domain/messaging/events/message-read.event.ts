import { DomainEvent } from '@domain/shared/domain-event.js';

export class MessageReadEvent extends DomainEvent {
  readonly eventType = 'message.read';

  constructor(aggregateId: string) {
    super(aggregateId);
  }
}
