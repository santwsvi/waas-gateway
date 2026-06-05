import type { ChannelStatus } from '@domain/channel/channel-status.js';
import type { IChannelRepository } from '@domain/channel/ports/channel-repository.port.js';
import type { IProviderLifecycle } from '@domain/channel/ports/provider-lifecycle.port.js';
import type { IOutboxRepository } from '@domain/shared/ports/outbox-repository.port.js';

interface ConnectChannelInput {
  channelId: string;
}

export interface ConnectChannelOutput {
  id: string;
  status: ChannelStatus;
}

export class ConnectChannelUseCase {
  constructor(
    private readonly channelRepo: IChannelRepository,
    private readonly providerLifecycle: IProviderLifecycle,
    private readonly outboxRepo: IOutboxRepository,
  ) {}

  async execute(input: ConnectChannelInput): Promise<ConnectChannelOutput> {
    const channel = await this.channelRepo.findById(input.channelId);
    if (!channel) {
      throw new Error(`Channel "${input.channelId}" not found.`);
    }

    channel.connect();
    await this.providerLifecycle.connect(channel);
    // Don't markConnected() here — Baileys connects asynchronously.
    // The adapter fires onConnected callback when the WS handshake completes.

    await this.channelRepo.save(channel);

    const events = channel.clearEvents();
    await this.outboxRepo.storeBatch(events);

    return {
      id: channel.id,
      status: channel.status,
    };
  }
}
