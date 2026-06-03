import { DomainEvent } from '@domain/shared/domain-event.js';

export class MessageSentEvent extends DomainEvent {
  readonly eventType = 'message.sent';

  constructor(
    aggregateId: string,
    public readonly providerId: string,
  ) {
    super(aggregateId);
  }
}
