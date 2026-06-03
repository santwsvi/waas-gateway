import { DomainEvent } from '@domain/shared/domain-event.js';

export class ChannelDisconnectedEvent extends DomainEvent {
  readonly eventType = 'channel.disconnected';

  constructor(
    aggregateId: string,
    public readonly reason: string,
  ) {
    super(aggregateId);
  }
}
