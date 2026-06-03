import { SendMessageUseCase } from './send-message.use-case.js';
import { InMemoryMessageRepository, InMemoryChannelRepository, InMemoryOutboxRepository } from '@infra/persistence/in-memory/index.js';
import { Channel } from '@domain/channel/channel.aggregate.js';
import { ChannelStatus, ProviderType } from '@domain/channel/channel-status.js';
import { MessageStatus } from '@domain/messaging/message-status.js';

describe('SendMessageUseCase', () => {
  let useCase: SendMessageUseCase;
  let messageRepo: InMemoryMessageRepository;
  let channelRepo: InMemoryChannelRepository;
  let outboxRepo: InMemoryOutboxRepository;

  beforeEach(() => {
    messageRepo = new InMemoryMessageRepository();
    channelRepo = new InMemoryChannelRepository();
    outboxRepo = new InMemoryOutboxRepository();
    useCase = new SendMessageUseCase(messageRepo, channelRepo, outboxRepo);
  });

  async function createConnectedChannel(): Promise<Channel> {
    const channel = Channel.create({
      workspaceId: 'ws-1',
      name: 'Connected Channel',
      providerType: ProviderType.InMemory,
    });
    channel.connect();
    channel.markConnected();
    channel.clearEvents();
    await channelRepo.save(channel);
    return channel;
  }

  it('should send a text message and return Queued status', async () => {
    const channel = await createConnectedChannel();

    const result = await useCase.execute({
      workspaceId: 'ws-1',
      channelId: channel.id,
      to: '+5511999887766',
      content: { type: 'TEXT', body: 'Hello!' },
      idempotencyKey: 'idem-1',
    });

    expect(result.id).toBeDefined();
    expect(result.status).toBe(MessageStatus.Queued);
    expect(result.idempotencyKey).toBe('idem-1');
  });

  it('should persist the message', async () => {
    const channel = await createConnectedChannel();

    const result = await useCase.execute({
      workspaceId: 'ws-1',
      channelId: channel.id,
      to: '+5511999887766',
      content: { type: 'TEXT', body: 'Hello!' },
      idempotencyKey: 'idem-2',
    });

    const found = await messageRepo.findById(result.id);
    expect(found).not.toBeNull();
    expect(found!.status).toBe(MessageStatus.Queued);
  });

  it('should store domain events in outbox', async () => {
    const channel = await createConnectedChannel();

    await useCase.execute({
      workspaceId: 'ws-1',
      channelId: channel.id,
      to: '+5511999887766',
      content: { type: 'TEXT', body: 'Hello!' },
      idempotencyKey: 'idem-3',
    });

    const pending = await outboxRepo.fetchPending(10);
    expect(pending.length).toBeGreaterThanOrEqual(2); // Created + Queued
  });

  it('should return existing message for duplicate idempotencyKey', async () => {
    const channel = await createConnectedChannel();

    const first = await useCase.execute({
      workspaceId: 'ws-1',
      channelId: channel.id,
      to: '+5511999887766',
      content: { type: 'TEXT', body: 'Hello!' },
      idempotencyKey: 'idem-dup',
    });

    const second = await useCase.execute({
      workspaceId: 'ws-1',
      channelId: channel.id,
      to: '+5511999887766',
      content: { type: 'TEXT', body: 'Hello!' },
      idempotencyKey: 'idem-dup',
    });

    expect(second.id).toBe(first.id);
  });

  it('should throw when channel not found', async () => {
    await expect(
      useCase.execute({
        workspaceId: 'ws-1',
        channelId: 'nonexistent',
        to: '+5511999887766',
        content: { type: 'TEXT', body: 'Hello!' },
        idempotencyKey: 'idem-4',
      }),
    ).rejects.toThrow('Channel "nonexistent" not found.');
  });

  it('should throw when channel is not connected', async () => {
    const channel = Channel.create({
      workspaceId: 'ws-1',
      name: 'Disconnected',
      providerType: ProviderType.InMemory,
    });
    channel.clearEvents();
    await channelRepo.save(channel);

    await expect(
      useCase.execute({
        workspaceId: 'ws-1',
        channelId: channel.id,
        to: '+5511999887766',
        content: { type: 'TEXT', body: 'Hello!' },
        idempotencyKey: 'idem-5',
      }),
    ).rejects.toThrow('is not connected');
  });

  it('should throw for invalid phone number', async () => {
    const channel = await createConnectedChannel();

    await expect(
      useCase.execute({
        workspaceId: 'ws-1',
        channelId: channel.id,
        to: 'invalid',
        content: { type: 'TEXT', body: 'Hello!' },
        idempotencyKey: 'idem-6',
      }),
    ).rejects.toThrow('Invalid phone number');
  });

  it('should throw for unsupported content type', async () => {
    const channel = await createConnectedChannel();

    await expect(
      useCase.execute({
        workspaceId: 'ws-1',
        channelId: channel.id,
        to: '+5511999887766',
        content: { type: 'UNKNOWN' },
        idempotencyKey: 'idem-7',
      }),
    ).rejects.toThrow('Unsupported content type');
  });
});
