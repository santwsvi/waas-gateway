import { AggregateRoot } from '@domain/shared/aggregate-root.js';
import { createHash, randomBytes } from 'crypto';
import {
  WorkspaceCreatedEvent,
  ApiKeyGeneratedEvent,
  ApiKeyRevokedEvent,
  WorkspaceDeactivatedEvent,
} from './events/workspace.events.js';

export interface ApiKeyData {
  id: string;
  keyHash: string;
  label: string;
  revoked: boolean;
  createdAt: Date;
}

interface WorkspaceProps {
  name: string;
  isActive: boolean;
  apiKeys: ApiKeyData[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkspaceInput {
  name: string;
}

export interface ReconstituteWorkspaceInput {
  id: string;
  name: string;
  isActive: boolean;
  apiKeys: ApiKeyData[];
  createdAt: Date;
  updatedAt: Date;
}

export class Workspace extends AggregateRoot<WorkspaceProps> {
  private constructor(props: WorkspaceProps, id?: string) {
    super(props, id);
  }

  static create(input: CreateWorkspaceInput): Workspace {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Workspace name cannot be empty.');
    }

    const now = new Date();
    const ws = new Workspace(
      {
        name: input.name.trim(),
        isActive: true,
        apiKeys: [],
        createdAt: now,
        updatedAt: now,
      },
    );

    ws.addDomainEvent(new WorkspaceCreatedEvent(ws.id, ws.name));
    return ws;
  }

  static reconstitute(input: ReconstituteWorkspaceInput): Workspace {
    return new Workspace(
      {
        name: input.name,
        isActive: input.isActive,
        apiKeys: input.apiKeys,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
      },
      input.id,
    );
  }

  get name(): string {
    return this.props.name;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get apiKeys(): ReadonlyArray<ApiKeyData> {
    return [...this.props.apiKeys];
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  generateApiKey(label: string): string {
    const rawKey = randomBytes(32).toString('hex');
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyId = crypto.randomUUID();

    const apiKey: ApiKeyData = {
      id: keyId,
      keyHash,
      label,
      revoked: false,
      createdAt: new Date(),
    };

    this.props.apiKeys.push(apiKey);
    this.props.updatedAt = new Date();
    this.addDomainEvent(new ApiKeyGeneratedEvent(this.id, keyId, label));

    return rawKey;
  }

  revokeApiKey(keyId: string): void {
    const apiKey = this.props.apiKeys.find((k) => k.id === keyId);
    if (!apiKey) {
      throw new Error(`API key with id "${keyId}" not found.`);
    }
    if (apiKey.revoked) {
      throw new Error(`API key "${keyId}" is already revoked.`);
    }

    apiKey.revoked = true;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new ApiKeyRevokedEvent(this.id, keyId));
  }

  deactivate(): void {
    if (!this.props.isActive) {
      throw new Error('Workspace is already inactive.');
    }

    this.props.isActive = false;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new WorkspaceDeactivatedEvent(this.id));
  }
}
