import { Channel } from './channel.aggregate.js';
import { ChannelStatus, ProviderType } from './channel-status.js';
import { ChannelConfig } from './value-objects/channel-config.vo.js';
import { EncryptedCreds } from './value-objects/encrypted-creds.vo.js';
import { InvalidStateTransitionError } from './errors/invalid-state-transition.error.js';
import { ChannelCreatedEvent } from './events/channel-created.event.js';
import { ChannelConnectingEvent } from './events/channel-connecting.event.js';
import { ChannelQrGeneratedEvent } from './events/channel-qr-generated.event.js';
import { ChannelConnectedEvent } from './events/channel-connected.event.js';
import { ChannelReconnectingEvent } from './events/channel-reconnecting.event.js';
import { ChannelDisconnectedEvent } from './events/channel-disconnected.event.js';
import { ChannelFailedEvent } from './events/channel-failed.event.js';

function createChannel(overrides?: { providerType?: ProviderType }): Channel {
  return Channel.create({
    workspaceId: 'ws-1',
    name: 'Test Channel',
    providerType: overrides?.providerType ?? ProviderType.Baileys,
  });
}

function channelAt(status: ChannelStatus): Channel {
  const channel = createChannel();
  channel.clearEvents();

  if (status === ChannelStatus.Created) return channel;

  channel.connect();
  channel.clearEvents();
  if (status === ChannelStatus.Connecting) return channel;

  if (status === ChannelStatus.QrPending) {
    channel.markQrPending('qr-data');
    channel.clearEvents();
    return channel;
  }

  channel.markConnected();
  channel.clearEvents();
  if (status === ChannelStatus.Connected) return channel;

  if (status === ChannelStatus.Reconnecting) {
    channel.markReconnecting();
    channel.clearEvents();
    return channel;
  }

  if (status === ChannelStatus.Disconnected) {
    channel.disconnect();
    channel.clearEvents();
    return channel;
  }

  if (status === ChannelStatus.Failed) {
    channel.markFailed('some error');
    channel.clearEvents();
    return channel;
  }

  return channel;
}

describe('ChannelConfig', () => {
  it('should create with defaults', () => {
    const config = ChannelConfig.create({});
    expect(config.maxConcurrentSessions).toBe(1);
    expect(config.webhookUrl).toBeNull();
    expect(config.metadata).toEqual({});
  });

  it('should create with custom values', () => {
    const config = ChannelConfig.create({
      maxConcurrentSessions: 3,
      webhookUrl: 'https://example.com/hook',
      metadata: { key: 'value' },
    });
    expect(config.maxConcurrentSessions).toBe(3);
    expect(config.webhookUrl).toBe('https://example.com/hook');
  });

  it('should throw if maxConcurrentSessions is less than 1', () => {
    expect(() => ChannelConfig.create({ maxConcurrentSessions: 0 })).toThrow(
      'maxConcurrentSessions must be at least 1',
    );
  });

  it('should support equality comparison', () => {
    const a = ChannelConfig.create({ maxConcurrentSessions: 2 });
    const b = ChannelConfig.create({ maxConcurrentSessions: 2 });
    const c = ChannelConfig.create({ maxConcurrentSessions: 3 });
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});

describe('EncryptedCreds', () => {
  it('should create with defaults', () => {
    const creds = EncryptedCreds.create({ encryptedPayload: 'enc-data' });
    expect(creds.encryptedPayload).toBe('enc-data');
    expect(creds.algorithm).toBe('aes-256-gcm');
    expect(creds.keyVersion).toBe(1);
  });

  it('should create with custom values', () => {
    const creds = EncryptedCreds.create({
      encryptedPayload: 'payload',
      algorithm: 'aes-128-cbc',
      keyVersion: 2,
    });
    expect(creds.algorithm).toBe('aes-128-cbc');
    expect(creds.keyVersion).toBe(2);
  });

  it('should throw if encryptedPayload is empty', () => {
    expect(() => EncryptedCreds.create({ encryptedPayload: '' })).toThrow(
      'encryptedPayload is required',
    );
  });

  it('should support equality comparison', () => {
    const a = EncryptedCreds.create({ encryptedPayload: 'x' });
    const b = EncryptedCreds.create({ encryptedPayload: 'x' });
    const c = EncryptedCreds.create({ encryptedPayload: 'y' });
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});

describe('Channel', () => {
  describe('create()', () => {
    it('should create a channel in CREATED status', () => {
      const channel = createChannel();
      expect(channel.status).toBe(ChannelStatus.Created);
      expect(channel.workspaceId).toBe('ws-1');
      expect(channel.name).toBe('Test Channel');
      expect(channel.providerType).toBe(ProviderType.Baileys);
      expect(channel.id).toBeDefined();
      expect(channel.createdAt).toBeInstanceOf(Date);
      expect(channel.updatedAt).toBeInstanceOf(Date);
      expect(channel.credentials).toBeNull();
    });

    it('should emit ChannelCreatedEvent on create', () => {
      const channel = createChannel();
      const events = channel.domainEvents;
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ChannelCreatedEvent);
      const event = events[0] as ChannelCreatedEvent;
      expect(event.eventType).toBe('channel.created');
      expect(event.aggregateId).toBe(channel.id);
      expect(event.workspaceId).toBe('ws-1');
      expect(event.providerType).toBe(ProviderType.Baileys);
    });

    it('should accept a custom id', () => {
      const channel = Channel.create({
        workspaceId: 'ws-1',
        name: 'ch',
        providerType: ProviderType.InMemory,
        id: 'custom-id',
      });
      expect(channel.id).toBe('custom-id');
    });

    it('should accept custom config and credentials', () => {
      const config = ChannelConfig.create({ maxConcurrentSessions: 5 });
      const creds = EncryptedCreds.create({ encryptedPayload: 'secret' });
      const channel = Channel.create({
        workspaceId: 'ws-1',
        name: 'ch',
        providerType: ProviderType.MetaCloudApi,
        config,
        credentials: creds,
      });
      expect(channel.config.maxConcurrentSessions).toBe(5);
      expect(channel.credentials?.encryptedPayload).toBe('secret');
    });
  });

  describe('clearEvents()', () => {
    it('should clear and return domain events', () => {
      const channel = createChannel();
      const cleared = channel.clearEvents();
      expect(cleared).toHaveLength(1);
      expect(channel.domainEvents).toHaveLength(0);
    });
  });

  describe('Valid state transitions', () => {
    it('should transition from CREATED to CONNECTING via connect()', () => {
      const channel = channelAt(ChannelStatus.Created);
      channel.connect();
      expect(channel.status).toBe(ChannelStatus.Connecting);
      expect(channel.domainEvents[0]).toBeInstanceOf(ChannelConnectingEvent);
    });

    it('should transition from CONNECTING to QR_PENDING via markQrPending()', () => {
      const channel = channelAt(ChannelStatus.Connecting);
      channel.markQrPending('qr-code-data');
      expect(channel.status).toBe(ChannelStatus.QrPending);
      const event = channel.domainEvents[0] as ChannelQrGeneratedEvent;
      expect(event).toBeInstanceOf(ChannelQrGeneratedEvent);
      expect(event.qrCode).toBe('qr-code-data');
    });

    it('should transition from CONNECTING to CONNECTED via markConnected()', () => {
      const channel = channelAt(ChannelStatus.Connecting);
      channel.markConnected();
      expect(channel.status).toBe(ChannelStatus.Connected);
      expect(channel.domainEvents[0]).toBeInstanceOf(ChannelConnectedEvent);
    });

    it('should transition from QR_PENDING to CONNECTED via markConnected()', () => {
      const channel = channelAt(ChannelStatus.QrPending);
      channel.markConnected();
      expect(channel.status).toBe(ChannelStatus.Connected);
      expect(channel.domainEvents[0]).toBeInstanceOf(ChannelConnectedEvent);
    });

    it('should transition from CONNECTED to RECONNECTING via markReconnecting()', () => {
      const channel = channelAt(ChannelStatus.Connected);
      channel.markReconnecting();
      expect(channel.status).toBe(ChannelStatus.Reconnecting);
      expect(channel.domainEvents[0]).toBeInstanceOf(ChannelReconnectingEvent);
    });

    it('should transition from CONNECTED to DISCONNECTED via disconnect()', () => {
      const channel = channelAt(ChannelStatus.Connected);
      channel.disconnect();
      expect(channel.status).toBe(ChannelStatus.Disconnected);
      expect(channel.domainEvents[0]).toBeInstanceOf(ChannelDisconnectedEvent);
    });

    it('should transition from RECONNECTING to CONNECTED via markConnected()', () => {
      const channel = channelAt(ChannelStatus.Reconnecting);
      channel.markConnected();
      expect(channel.status).toBe(ChannelStatus.Connected);
      expect(channel.domainEvents[0]).toBeInstanceOf(ChannelConnectedEvent);
    });

    it('should transition from RECONNECTING to DISCONNECTED via disconnect()', () => {
      const channel = channelAt(ChannelStatus.Reconnecting);
      channel.disconnect();
      expect(channel.status).toBe(ChannelStatus.Disconnected);
      const event = channel.domainEvents[0] as ChannelDisconnectedEvent;
      expect(event).toBeInstanceOf(ChannelDisconnectedEvent);
    });

    it('should transition from DISCONNECTED to CONNECTING via connect()', () => {
      const channel = channelAt(ChannelStatus.Disconnected);
      channel.connect();
      expect(channel.status).toBe(ChannelStatus.Connecting);
      expect(channel.domainEvents[0]).toBeInstanceOf(ChannelConnectingEvent);
    });

    it('should transition from FAILED to CONNECTING via connect()', () => {
      const channel = channelAt(ChannelStatus.Failed);
      channel.connect();
      expect(channel.status).toBe(ChannelStatus.Connecting);
      expect(channel.domainEvents[0]).toBeInstanceOf(ChannelConnectingEvent);
    });
  });

  describe('markFailed() from any state except FAILED', () => {
    const statesExceptFailed = [
      ChannelStatus.Created,
      ChannelStatus.Connecting,
      ChannelStatus.QrPending,
      ChannelStatus.Connected,
      ChannelStatus.Reconnecting,
      ChannelStatus.Disconnected,
    ];

    it.each(statesExceptFailed)(
      'should transition from %s to FAILED via markFailed()',
      (fromStatus) => {
        const channel = channelAt(fromStatus);
        channel.markFailed('catastrophic error');
        expect(channel.status).toBe(ChannelStatus.Failed);
        const event = channel.domainEvents[0] as ChannelFailedEvent;
        expect(event).toBeInstanceOf(ChannelFailedEvent);
        expect(event.reason).toBe('catastrophic error');
      },
    );

    it('should throw when transitioning from FAILED to FAILED', () => {
      const channel = channelAt(ChannelStatus.Failed);
      expect(() => channel.markFailed('again')).toThrow(InvalidStateTransitionError);
    });
  });

  describe('Invalid state transitions', () => {
    it('should throw on CREATED → markConnected()', () => {
      const channel = channelAt(ChannelStatus.Created);
      expect(() => channel.markConnected()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on CREATED → disconnect()', () => {
      const channel = channelAt(ChannelStatus.Created);
      expect(() => channel.disconnect()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on CREATED → markReconnecting()', () => {
      const channel = channelAt(ChannelStatus.Created);
      expect(() => channel.markReconnecting()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on CREATED → markQrPending()', () => {
      const channel = channelAt(ChannelStatus.Created);
      expect(() => channel.markQrPending('qr')).toThrow(InvalidStateTransitionError);
    });

    it('should throw on CONNECTING → connect()', () => {
      const channel = channelAt(ChannelStatus.Connecting);
      expect(() => channel.connect()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on CONNECTING → disconnect()', () => {
      const channel = channelAt(ChannelStatus.Connecting);
      expect(() => channel.disconnect()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on CONNECTING → markReconnecting()', () => {
      const channel = channelAt(ChannelStatus.Connecting);
      expect(() => channel.markReconnecting()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on QR_PENDING → connect()', () => {
      const channel = channelAt(ChannelStatus.QrPending);
      expect(() => channel.connect()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on QR_PENDING → disconnect()', () => {
      const channel = channelAt(ChannelStatus.QrPending);
      expect(() => channel.disconnect()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on QR_PENDING → markReconnecting()', () => {
      const channel = channelAt(ChannelStatus.QrPending);
      expect(() => channel.markReconnecting()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on CONNECTED → connect()', () => {
      const channel = channelAt(ChannelStatus.Connected);
      expect(() => channel.connect()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on CONNECTED → markQrPending()', () => {
      const channel = channelAt(ChannelStatus.Connected);
      expect(() => channel.markQrPending('qr')).toThrow(InvalidStateTransitionError);
    });

    it('should throw on CONNECTED → markConnected()', () => {
      const channel = channelAt(ChannelStatus.Connected);
      expect(() => channel.markConnected()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on DISCONNECTED → disconnect()', () => {
      const channel = channelAt(ChannelStatus.Disconnected);
      expect(() => channel.disconnect()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on DISCONNECTED → markConnected()', () => {
      const channel = channelAt(ChannelStatus.Disconnected);
      expect(() => channel.markConnected()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on DISCONNECTED → markReconnecting()', () => {
      const channel = channelAt(ChannelStatus.Disconnected);
      expect(() => channel.markReconnecting()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on FAILED → disconnect()', () => {
      const channel = channelAt(ChannelStatus.Failed);
      expect(() => channel.disconnect()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on FAILED → markConnected()', () => {
      const channel = channelAt(ChannelStatus.Failed);
      expect(() => channel.markConnected()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on FAILED → markReconnecting()', () => {
      const channel = channelAt(ChannelStatus.Failed);
      expect(() => channel.markReconnecting()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on FAILED → markQrPending()', () => {
      const channel = channelAt(ChannelStatus.Failed);
      expect(() => channel.markQrPending('qr')).toThrow(InvalidStateTransitionError);
    });
  });

  describe('Full lifecycle flow', () => {
    it('should support CREATED → CONNECTING → QR_PENDING → CONNECTED → DISCONNECTED', () => {
      const channel = createChannel();
      channel.clearEvents();

      channel.connect();
      expect(channel.status).toBe(ChannelStatus.Connecting);

      channel.markQrPending('qr-123');
      expect(channel.status).toBe(ChannelStatus.QrPending);

      channel.markConnected();
      expect(channel.status).toBe(ChannelStatus.Connected);

      channel.disconnect();
      expect(channel.status).toBe(ChannelStatus.Disconnected);

      expect(channel.domainEvents).toHaveLength(4);
    });

    it('should support CONNECTED → RECONNECTING → CONNECTED cycle', () => {
      const channel = channelAt(ChannelStatus.Connected);

      channel.markReconnecting();
      expect(channel.status).toBe(ChannelStatus.Reconnecting);

      channel.markConnected();
      expect(channel.status).toBe(ChannelStatus.Connected);

      expect(channel.domainEvents).toHaveLength(2);
    });

    it('should support DISCONNECTED → CONNECTING → CONNECTED', () => {
      const channel = channelAt(ChannelStatus.Disconnected);

      channel.connect();
      channel.markConnected();
      expect(channel.status).toBe(ChannelStatus.Connected);
    });

    it('should support FAILED → CONNECTING → CONNECTED', () => {
      const channel = channelAt(ChannelStatus.Failed);

      channel.connect();
      channel.markConnected();
      expect(channel.status).toBe(ChannelStatus.Connected);
    });
  });

  describe('reconstitute()', () => {
    it('should reconstitute a channel without emitting events', () => {
      const channel = Channel.reconstitute('ch-1', {
        workspaceId: 'ws-1',
        name: 'Reconstituted',
        providerType: ProviderType.Twilio,
        status: ChannelStatus.Connected,
        config: ChannelConfig.create({}),
        credentials: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(channel.id).toBe('ch-1');
      expect(channel.status).toBe(ChannelStatus.Connected);
      expect(channel.domainEvents).toHaveLength(0);
    });

    it('should respect reconstituted state for transitions', () => {
      const channel = Channel.reconstitute('ch-1', {
        workspaceId: 'ws-1',
        name: 'ch',
        providerType: ProviderType.InMemory,
        status: ChannelStatus.Connected,
        config: ChannelConfig.create({}),
        credentials: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      channel.disconnect();
      expect(channel.status).toBe(ChannelStatus.Disconnected);
      expect(() => channel.markConnected()).toThrow(InvalidStateTransitionError);
    });
  });

  describe('InvalidStateTransitionError', () => {
    it('should contain from and to status', () => {
      const error = new InvalidStateTransitionError(
        ChannelStatus.Created,
        ChannelStatus.Connected,
      );
      expect(error.from).toBe(ChannelStatus.Created);
      expect(error.to).toBe(ChannelStatus.Connected);
      expect(error.message).toContain('CREATED');
      expect(error.message).toContain('CONNECTED');
      expect(error.name).toBe('InvalidStateTransitionError');
    });
  });

  describe('updatedAt', () => {
    it('should update updatedAt on state transition', () => {
      const channel = channelAt(ChannelStatus.Created);
      const before = channel.updatedAt;

      channel.connect();
      expect(channel.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });
});
