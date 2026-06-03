import type { ChannelStatus, ProviderType } from '@domain/channel/channel-status.js';
import type { IChannelRepository } from '@domain/channel/ports/channel-repository.port.js';

interface GetChannelStatusInput {
  channelId: string;
}

export interface GetChannelStatusOutput {
  id: string;
  name: string;
  status: ChannelStatus;
  providerType: ProviderType;
}

export class GetChannelStatusUseCase {
  constructor(private readonly channelRepo: IChannelRepository) {}

  async execute(input: GetChannelStatusInput): Promise<GetChannelStatusOutput> {
    const channel = await this.channelRepo.findById(input.channelId);
    if (!channel) {
      throw new Error(`Channel "${input.channelId}" not found.`);
    }

    return {
      id: channel.id,
      name: channel.name,
      status: channel.status,
      providerType: channel.providerType,
    };
  }
}
