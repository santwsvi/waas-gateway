import { DomainEvent } from '@domain/shared/domain-event.js';
import { ProviderType } from '../channel-status.js';

export class ChannelCreatedEvent extends DomainEvent {
  readonly eventType = 'channel.created';

  constructor(
    aggregateId: string,
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly providerType: ProviderType,
  ) {
    super(aggregateId);
  }
}
