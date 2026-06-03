import { DomainEvent } from '@domain/shared/domain-event.js';

export class ChannelConnectedEvent extends DomainEvent {
  readonly eventType = 'channel.connected';

  constructor(aggregateId: string) {
    super(aggregateId);
  }
}
