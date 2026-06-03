import { DomainEvent } from '@domain/shared/domain-event.js';

export class ChannelFailedEvent extends DomainEvent {
  readonly eventType = 'channel.failed';

  constructor(
    aggregateId: string,
    public readonly reason: string,
  ) {
    super(aggregateId);
  }
}
