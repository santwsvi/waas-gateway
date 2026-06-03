import { DomainEvent } from '@domain/shared/domain-event.js';

export class MessageDeadLetteredEvent extends DomainEvent {
  readonly eventType = 'message.dead_lettered';

  constructor(
    aggregateId: string,
    public readonly totalAttempts: number,
  ) {
    super(aggregateId);
  }
}
