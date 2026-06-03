import type { IWorkspaceRepository } from '@domain/workspace/ports/workspace-repository.port.js';
import type { Workspace } from '@domain/workspace/workspace.aggregate.js';

export class InMemoryWorkspaceRepository implements IWorkspaceRepository {
  private items: Map<string, Workspace> = new Map();

  async save(workspace: Workspace): Promise<void> {
    this.items.set(workspace.id, workspace);
  }

  async findById(id: string): Promise<Workspace | null> {
    return this.items.get(id) ?? null;
  }

  async findAll(): Promise<Workspace[]> {
    return [...this.items.values()];
  }

  clear(): void {
    this.items.clear();
  }

  get count(): number {
    return this.items.size;
  }
}
