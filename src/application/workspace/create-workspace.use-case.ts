import { Workspace } from '@domain/workspace/workspace.aggregate.js';
import type { IWorkspaceRepository } from '@domain/workspace/ports/workspace-repository.port.js';
import type { IOutboxRepository } from '@domain/shared/ports/outbox-repository.port.js';

interface CreateWorkspaceInput {
  name: string;
}

export interface CreateWorkspaceOutput {
  id: string;
  name: string;
  apiKey: string;
}

export class CreateWorkspaceUseCase {
  constructor(
    private readonly workspaceRepo: IWorkspaceRepository,
    private readonly outboxRepo: IOutboxRepository,
  ) {}

  async execute(input: CreateWorkspaceInput): Promise<CreateWorkspaceOutput> {
    const workspace = Workspace.create({ name: input.name });
    const apiKey = workspace.generateApiKey('default');

    await this.workspaceRepo.save(workspace);

    const events = workspace.clearEvents();
    await this.outboxRepo.storeBatch(events);

    return {
      id: workspace.id,
      name: workspace.name,
      apiKey,
    };
  }
}
