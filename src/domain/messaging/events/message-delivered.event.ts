import { DomainEvent } from '@domain/shared/domain-event.js';

export class MessageDeliveredEvent extends DomainEvent {
  readonly eventType = 'message.delivered';

  constructor(aggregateId: string) {
    super(aggregateId);
  }
}
