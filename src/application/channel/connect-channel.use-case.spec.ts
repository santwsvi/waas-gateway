import { ConnectChannelUseCase } from './connect-channel.use-case.js';
import { InMemoryChannelRepository, InMemoryOutboxRepository } from '@infra/persistence/in-memory/index.js';
import { InMemoryProviderAdapter } from '@infra/providers/in-memory/in-memory-provider.adapter.js';
import { Channel } from '@domain/channel/channel.aggregate.js';
import { ChannelStatus, ProviderType } from '@domain/channel/channel-status.js';

describe('ConnectChannelUseCase', () => {
  let useCase: ConnectChannelUseCase;
  let channelRepo: InMemoryChannelRepository;
  let outboxRepo: InMemoryOutboxRepository;
  let provider: InMemoryProviderAdapter;

  beforeEach(() => {
    channelRepo = new InMemoryChannelRepository();
    outboxRepo = new InMemoryOutboxRepository();
    provider = new InMemoryProviderAdapter();
    useCase = new ConnectChannelUseCase(channelRepo, provider, outboxRepo);
  });

  async function createChannel(): Promise<Channel> {
    const channel = Channel.create({
      workspaceId: 'ws-1',
      name: 'Test Channel',
      providerType: ProviderType.InMemory,
    });
    channel.clearEvents();
    await channelRepo.save(channel);
    return channel;
  }

  it('should connect a channel and return Connected status', async () => {
    const channel = await createChannel();

    const result = await useCase.execute({ channelId: channel.id });

    expect(result.id).toBe(channel.id);
    expect(result.status).toBe(ChannelStatus.Connected);
  });

  it('should persist the connected state', async () => {
    const channel = await createChannel();

    await useCase.execute({ channelId: channel.id });

    const found = await channelRepo.findById(channel.id);
    expect(found!.status).toBe(ChannelStatus.Connected);
  });

  it('should store domain events in outbox', async () => {
    const channel = await createChannel();

    await useCase.execute({ channelId: channel.id });

    const pending = await outboxRepo.fetchPending(10);
    expect(pending.length).toBeGreaterThanOrEqual(2); // Connecting + Connected
  });

  it('should throw when channel not found', async () => {
    await expect(useCase.execute({ channelId: 'nonexistent' })).rejects.toThrow(
      'Channel "nonexistent" not found.',
    );
  });
});
