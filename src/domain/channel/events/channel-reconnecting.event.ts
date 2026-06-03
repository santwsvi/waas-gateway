import { DomainEvent } from '@domain/shared/domain-event.js';

export class ChannelReconnectingEvent extends DomainEvent {
  readonly eventType = 'channel.reconnecting';

  constructor(aggregateId: string) {
    super(aggregateId);
  }
}
