import { DomainEvent } from '@domain/shared/domain-event.js';

export class MessageFailedEvent extends DomainEvent {
  readonly eventType = 'message.failed';

  constructor(
    aggregateId: string,
    public readonly failureCategory: string,
    public readonly failureMessage: string,
    public readonly attemptNumber: number,
  ) {
    super(aggregateId);
  }
}
