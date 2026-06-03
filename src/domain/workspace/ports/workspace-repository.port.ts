import type { Workspace } from '../workspace.aggregate.js';

export interface IWorkspaceRepository {
  save(workspace: Workspace): Promise<void>;
  findById(id: string): Promise<Workspace | null>;
  findAll(): Promise<Workspace[]>;
}

export const WORKSPACE_REPOSITORY = Symbol('IWorkspaceRepository');
