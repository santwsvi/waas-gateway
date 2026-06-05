import type { IChannelRepository } from '@domain/channel/ports/channel-repository.port.js';
import type { IProviderLifecycle } from '@domain/channel/ports/provider-lifecycle.port.js';

interface PairChannelInput {
  channelId: string;
  phoneNumber: string;
}

export interface PairChannelOutput {
  channelId: string;
  pairingCode: string;
}

export class PairChannelUseCase {
  constructor(
    private readonly channelRepo: IChannelRepository,
    private readonly providerLifecycle: IProviderLifecycle,
  ) {}

  async execute(input: PairChannelInput): Promise<PairChannelOutput> {
    const channel = await this.channelRepo.findById(input.channelId);
    if (!channel) {
      throw new Error(`Channel "${input.channelId}" not found.`);
    }

    const pairingCode = await this.providerLifecycle.requestPairingCode(
      input.channelId,
      input.phoneNumber,
    );

    return {
      channelId: input.channelId,
      pairingCode,
    };
  }
}
