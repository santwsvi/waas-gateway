import { DomainEvent } from '@domain/shared/domain-event.js';

export class ChannelQrGeneratedEvent extends DomainEvent {
  readonly eventType = 'channel.qr_generated';

  constructor(
    aggregateId: string,
    public readonly qrCode: string,
  ) {
    super(aggregateId);
  }
}
