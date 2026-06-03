import { GetChannelStatusUseCase } from './get-channel-status.use-case.js';
import { InMemoryChannelRepository } from '@infra/persistence/in-memory/index.js';
import { Channel } from '@domain/channel/channel.aggregate.js';
import { ChannelStatus, ProviderType } from '@domain/channel/channel-status.js';

describe('GetChannelStatusUseCase', () => {
  let useCase: GetChannelStatusUseCase;
  let channelRepo: InMemoryChannelRepository;

  beforeEach(() => {
    channelRepo = new InMemoryChannelRepository();
    useCase = new GetChannelStatusUseCase(channelRepo);
  });

  it('should return channel status info', async () => {
    const channel = Channel.create({
      workspaceId: 'ws-1',
      name: 'My Channel',
      providerType: ProviderType.InMemory,
    });
    channel.clearEvents();
    await channelRepo.save(channel);

    const result = await useCase.execute({ channelId: channel.id });

    expect(result.id).toBe(channel.id);
    expect(result.name).toBe('My Channel');
    expect(result.status).toBe(ChannelStatus.Created);
    expect(result.providerType).toBe(ProviderType.InMemory);
  });

  it('should throw when channel not found', async () => {
    await expect(useCase.execute({ channelId: 'nonexistent' })).rejects.toThrow(
      'Channel "nonexistent" not found.',
    );
  });
});
