import { Channel } from '@domain/channel/channel.aggregate.js';
import type { ProviderType, ChannelStatus } from '@domain/channel/channel-status.js';
import type { IChannelRepository } from '@domain/channel/ports/channel-repository.port.js';
import type { IWorkspaceRepository } from '@domain/workspace/ports/workspace-repository.port.js';
import type { IOutboxRepository } from '@domain/shared/ports/outbox-repository.port.js';

interface CreateChannelInput {
  workspaceId: string;
  name: string;
  providerType: ProviderType;
}

export interface CreateChannelOutput {
  id: string;
  name: string;
  status: ChannelStatus;
  providerType: ProviderType;
}

export class CreateChannelUseCase {
  constructor(
    private readonly channelRepo: IChannelRepository,
    private readonly workspaceRepo: IWorkspaceRepository,
    private readonly outboxRepo: IOutboxRepository,
  ) {}

  async execute(input: CreateChannelInput): Promise<CreateChannelOutput> {
    const workspace = await this.workspaceRepo.findById(input.workspaceId);
    if (!workspace) {
      throw new Error(`Workspace "${input.workspaceId}" not found.`);
    }
    if (!workspace.isActive) {
      throw new Error(`Workspace "${input.workspaceId}" is not active.`);
    }

    const channel = Channel.create({
      workspaceId: input.workspaceId,
      name: input.name,
      providerType: input.providerType,
    });

    await this.channelRepo.save(channel);

    const events = channel.clearEvents();
    await this.outboxRepo.storeBatch(events);

    return {
      id: channel.id,
      name: channel.name,
      status: channel.status,
      providerType: channel.providerType,
    };
  }
}
