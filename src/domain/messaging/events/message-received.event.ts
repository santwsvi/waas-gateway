import { DomainEvent } from '@domain/shared/domain-event.js';

export class MessageReceivedEvent extends DomainEvent {
  readonly eventType = 'message.received';

  constructor(
    aggregateId: string,
    public readonly workspaceId: string,
    public readonly channelId: string,
    public readonly from: string,
  ) {
    super(aggregateId);
  }
}
