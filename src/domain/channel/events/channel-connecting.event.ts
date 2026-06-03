import { DomainEvent } from '@domain/shared/domain-event.js';

export class ChannelConnectingEvent extends DomainEvent {
  readonly eventType = 'channel.connecting';

  constructor(aggregateId: string) {
    super(aggregateId);
  }
}
