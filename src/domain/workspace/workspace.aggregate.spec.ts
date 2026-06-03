import { Workspace } from './workspace.aggregate.js';

describe('Workspace', () => {
  describe('create()', () => {
    it('should create a workspace with name', () => {
      const ws = Workspace.create({ name: 'Play Sports' });
      expect(ws.id).toBeDefined();
      expect(ws.name).toBe('Play Sports');
      expect(ws.isActive).toBe(true);
      expect(ws.createdAt).toBeInstanceOf(Date);
    });

    it('should throw on empty name', () => {
      expect(() => Workspace.create({ name: '' })).toThrow('name');
    });

    it('should throw on whitespace-only name', () => {
      expect(() => Workspace.create({ name: '   ' })).toThrow('name');
    });

    it('should emit WorkspaceCreatedEvent', () => {
      const ws = Workspace.create({ name: 'Test' });
      expect(ws.domainEvents).toHaveLength(1);
      expect(ws.domainEvents[0].eventType).toBe('WorkspaceCreated');
    });
  });

  describe('generateApiKey()', () => {
    it('should generate an API key and return the raw key', () => {
      const ws = Workspace.create({ name: 'Test' });
      const rawKey = ws.generateApiKey('Production Key');
      expect(rawKey).toBeDefined();
      expect(typeof rawKey).toBe('string');
      expect(rawKey.length).toBeGreaterThan(0);
    });

    it('should store the API key hash, not the raw key', () => {
      const ws = Workspace.create({ name: 'Test' });
      const rawKey = ws.generateApiKey('Dev Key');
      const apiKey = ws.apiKeys[0];
      expect(apiKey.keyHash).not.toBe(rawKey);
      expect(apiKey.label).toBe('Dev Key');
    });

    it('should allow multiple API keys', () => {
      const ws = Workspace.create({ name: 'Test' });
      ws.generateApiKey('Key 1');
      ws.generateApiKey('Key 2');
      expect(ws.apiKeys).toHaveLength(2);
    });

    it('should emit ApiKeyGeneratedEvent', () => {
      const ws = Workspace.create({ name: 'Test' });
      ws.clearEvents();
      ws.generateApiKey('Key');
      expect(ws.domainEvents).toHaveLength(1);
      expect(ws.domainEvents[0].eventType).toBe('ApiKeyGenerated');
    });
  });

  describe('revokeApiKey()', () => {
    it('should revoke an existing API key', () => {
      const ws = Workspace.create({ name: 'Test' });
      ws.generateApiKey('Key');
      const keyId = ws.apiKeys[0].id;
      ws.revokeApiKey(keyId);
      expect(ws.apiKeys[0].revoked).toBe(true);
    });

    it('should throw when revoking non-existent key', () => {
      const ws = Workspace.create({ name: 'Test' });
      expect(() => ws.revokeApiKey('non-existent')).toThrow('not found');
    });

    it('should throw when revoking already-revoked key', () => {
      const ws = Workspace.create({ name: 'Test' });
      ws.generateApiKey('Key');
      const keyId = ws.apiKeys[0].id;
      ws.revokeApiKey(keyId);
      expect(() => ws.revokeApiKey(keyId)).toThrow('already revoked');
    });
  });

  describe('deactivate()', () => {
    it('should deactivate the workspace', () => {
      const ws = Workspace.create({ name: 'Test' });
      ws.deactivate();
      expect(ws.isActive).toBe(false);
    });

    it('should throw when already inactive', () => {
      const ws = Workspace.create({ name: 'Test' });
      ws.deactivate();
      expect(() => ws.deactivate()).toThrow('already inactive');
    });

    it('should emit WorkspaceDeactivatedEvent', () => {
      const ws = Workspace.create({ name: 'Test' });
      ws.clearEvents();
      ws.deactivate();
      expect(ws.domainEvents).toHaveLength(1);
      expect(ws.domainEvents[0].eventType).toBe('WorkspaceDeactivated');
    });
  });

  describe('reconstitute()', () => {
    it('should reconstitute without emitting events', () => {
      const ws = Workspace.reconstitute({
        id: 'ws-1',
        name: 'Restored',
        isActive: true,
        apiKeys: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(ws.id).toBe('ws-1');
      expect(ws.name).toBe('Restored');
      expect(ws.domainEvents).toHaveLength(0);
    });
  });
});
