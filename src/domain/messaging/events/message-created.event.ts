import { DomainEvent } from '@domain/shared/domain-event.js';

export class MessageCreatedEvent extends DomainEvent {
  readonly eventType = 'message.created';

  constructor(
    aggregateId: string,
    public readonly workspaceId: string,
    public readonly channelId: string,
    public readonly to: string,
    public readonly idempotencyKey: string,
  ) {
    super(aggregateId);
  }
}
