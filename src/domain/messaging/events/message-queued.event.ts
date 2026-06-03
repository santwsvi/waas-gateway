import { DomainEvent } from '@domain/shared/domain-event.js';

export class MessageQueuedEvent extends DomainEvent {
  readonly eventType = 'message.queued';

  constructor(aggregateId: string) {
    super(aggregateId);
  }
}
