import { CreateWorkspaceUseCase } from './create-workspace.use-case.js';
import { InMemoryWorkspaceRepository, InMemoryOutboxRepository } from '@infra/persistence/in-memory/index.js';

describe('CreateWorkspaceUseCase', () => {
  let useCase: CreateWorkspaceUseCase;
  let workspaceRepo: InMemoryWorkspaceRepository;
  let outboxRepo: InMemoryOutboxRepository;

  beforeEach(() => {
    workspaceRepo = new InMemoryWorkspaceRepository();
    outboxRepo = new InMemoryOutboxRepository();
    useCase = new CreateWorkspaceUseCase(workspaceRepo, outboxRepo);
  });

  it('should create a workspace and return id, name and apiKey', async () => {
    const result = await useCase.execute({ name: 'My Workspace' });

    expect(result.id).toBeDefined();
    expect(result.name).toBe('My Workspace');
    expect(result.apiKey).toBeDefined();
    expect(result.apiKey.length).toBeGreaterThan(0);
  });

  it('should persist the workspace in the repository', async () => {
    const result = await useCase.execute({ name: 'Persisted WS' });

    const found = await workspaceRepo.findById(result.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Persisted WS');
    expect(found!.apiKeys).toHaveLength(1);
  });

  it('should store domain events in the outbox', async () => {
    await useCase.execute({ name: 'Event WS' });

    const pending = await outboxRepo.fetchPending(10);
    expect(pending.length).toBeGreaterThanOrEqual(2); // WorkspaceCreated + ApiKeyGenerated
  });

  it('should throw when name is empty', async () => {
    await expect(useCase.execute({ name: '' })).rejects.toThrow('Workspace name cannot be empty.');
  });
});
