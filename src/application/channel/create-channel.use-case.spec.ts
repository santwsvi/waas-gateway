import { CreateChannelUseCase } from './create-channel.use-case.js';
import { InMemoryChannelRepository, InMemoryWorkspaceRepository, InMemoryOutboxRepository } from '@infra/persistence/in-memory/index.js';
import { Workspace } from '@domain/workspace/workspace.aggregate.js';
import { ChannelStatus, ProviderType } from '@domain/channel/channel-status.js';

describe('CreateChannelUseCase', () => {
  let useCase: CreateChannelUseCase;
  let channelRepo: InMemoryChannelRepository;
  let workspaceRepo: InMemoryWorkspaceRepository;
  let outboxRepo: InMemoryOutboxRepository;

  beforeEach(async () => {
    channelRepo = new InMemoryChannelRepository();
    workspaceRepo = new InMemoryWorkspaceRepository();
    outboxRepo = new InMemoryOutboxRepository();
    useCase = new CreateChannelUseCase(channelRepo, workspaceRepo, outboxRepo);
  });

  async function createActiveWorkspace(): Promise<string> {
    const ws = Workspace.create({ name: 'Test WS' });
    ws.clearEvents();
    await workspaceRepo.save(ws);
    return ws.id;
  }

  it('should create a channel for an active workspace', async () => {
    const wsId = await createActiveWorkspace();

    const result = await useCase.execute({
      workspaceId: wsId,
      name: 'WhatsApp Channel',
      providerType: ProviderType.InMemory,
    });

    expect(result.id).toBeDefined();
    expect(result.name).toBe('WhatsApp Channel');
    expect(result.status).toBe(ChannelStatus.Created);
    expect(result.providerType).toBe(ProviderType.InMemory);
  });

  it('should persist the channel', async () => {
    const wsId = await createActiveWorkspace();

    const result = await useCase.execute({
      workspaceId: wsId,
      name: 'Ch1',
      providerType: ProviderType.InMemory,
    });

    const found = await channelRepo.findById(result.id);
    expect(found).not.toBeNull();
  });

  it('should store domain events in outbox', async () => {
    const wsId = await createActiveWorkspace();

    await useCase.execute({
      workspaceId: wsId,
      name: 'Ch1',
      providerType: ProviderType.InMemory,
    });

    const pending = await outboxRepo.fetchPending(10);
    expect(pending.length).toBeGreaterThanOrEqual(1);
  });

  it('should throw when workspace not found', async () => {
    await expect(
      useCase.execute({
        workspaceId: 'nonexistent',
        name: 'Ch1',
        providerType: ProviderType.InMemory,
      }),
    ).rejects.toThrow('Workspace "nonexistent" not found.');
  });

  it('should throw when workspace is inactive', async () => {
    const ws = Workspace.create({ name: 'Inactive WS' });
    ws.deactivate();
    ws.clearEvents();
    await workspaceRepo.save(ws);

    await expect(
      useCase.execute({
        workspaceId: ws.id,
        name: 'Ch1',
        providerType: ProviderType.InMemory,
      }),
    ).rejects.toThrow('is not active');
  });
});
