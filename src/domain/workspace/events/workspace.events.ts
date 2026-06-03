import { DomainEvent } from '@domain/shared/domain-event.js';

export class WorkspaceCreatedEvent extends DomainEvent {
  readonly eventType = 'WorkspaceCreated';
  constructor(
    aggregateId: string,
    public readonly name: string,
  ) {
    super(aggregateId);
  }
}

export class ApiKeyGeneratedEvent extends DomainEvent {
  readonly eventType = 'ApiKeyGenerated';
  constructor(
    aggregateId: string,
    public readonly keyId: string,
    public readonly label: string,
  ) {
    super(aggregateId);
  }
}

export class ApiKeyRevokedEvent extends DomainEvent {
  readonly eventType = 'ApiKeyRevoked';
  constructor(
    aggregateId: string,
    public readonly keyId: string,
  ) {
    super(aggregateId);
  }
}

export class WorkspaceDeactivatedEvent extends DomainEvent {
  readonly eventType = 'WorkspaceDeactivated';
  constructor(aggregateId: string) {
    super(aggregateId);
  }
}
