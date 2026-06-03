import { DomainEvent } from '@domain/shared/domain-event.js';

export class MessageRetryingEvent extends DomainEvent {
  readonly eventType = 'message.retrying';

  constructor(
    aggregateId: string,
    public readonly attemptNumber: number,
  ) {
    super(aggregateId);
  }
}
