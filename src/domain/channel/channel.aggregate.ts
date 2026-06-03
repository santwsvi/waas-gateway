import { AggregateRoot } from '@domain/shared/aggregate-root.js';
import { ChannelStatus, ProviderType } from './channel-status.js';
import { ChannelConfig } from './value-objects/channel-config.vo.js';
import { EncryptedCreds } from './value-objects/encrypted-creds.vo.js';
import { ChannelCreatedEvent } from './events/channel-created.event.js';
import { ChannelConnectingEvent } from './events/channel-connecting.event.js';
import { ChannelQrGeneratedEvent } from './events/channel-qr-generated.event.js';
import { ChannelConnectedEvent } from './events/channel-connected.event.js';
import { ChannelReconnectingEvent } from './events/channel-reconnecting.event.js';
import { ChannelDisconnectedEvent } from './events/channel-disconnected.event.js';
import { ChannelFailedEvent } from './events/channel-failed.event.js';
import type { IChannelState } from './states/channel-state.interface.js';
import { CreatedState } from './states/created.state.js';
import { ConnectingState } from './states/connecting.state.js';
import { QrPendingState } from './states/qr-pending.state.js';
import { ConnectedState } from './states/connected.state.js';
import { ReconnectingState } from './states/reconnecting.state.js';
import { DisconnectedState } from './states/disconnected.state.js';
import { FailedState } from './states/failed.state.js';

interface ChannelProps {
  workspaceId: string;
  name: string;
  providerType: ProviderType;
  status: ChannelStatus;
  config: ChannelConfig;
  credentials: EncryptedCreds | null;
  createdAt: Date;
  updatedAt: Date;
}

const STATE_MAP: Record<ChannelStatus, IChannelState> = {
  [ChannelStatus.Created]: new CreatedState(),
  [ChannelStatus.Connecting]: new ConnectingState(),
  [ChannelStatus.QrPending]: new QrPendingState(),
  [ChannelStatus.Connected]: new ConnectedState(),
  [ChannelStatus.Reconnecting]: new ReconnectingState(),
  [ChannelStatus.Disconnected]: new DisconnectedState(),
  [ChannelStatus.Failed]: new FailedState(),
};

export class Channel extends AggregateRoot<ChannelProps> {
  private _state: IChannelState;

  private constructor(props: ChannelProps, id?: string) {
    super(props, id);
    this._state = STATE_MAP[props.status];
  }

  static create(params: {
    workspaceId: string;
    name: string;
    providerType: ProviderType;
    config?: ChannelConfig;
    credentials?: EncryptedCreds | null;
    id?: string;
  }): Channel {
    const now = new Date();
    const config = params.config ?? ChannelConfig.create({});
    const channel = new Channel(
      {
        workspaceId: params.workspaceId,
        name: params.name,
        providerType: params.providerType,
        status: ChannelStatus.Created,
        config,
        credentials: params.credentials ?? null,
        createdAt: now,
        updatedAt: now,
      },
      params.id,
    );

    channel.addDomainEvent(
      new ChannelCreatedEvent(
        channel.id,
        params.workspaceId,
        params.name,
        params.providerType,
      ),
    );

    return channel;
  }

  static reconstitute(
    id: string,
    props: ChannelProps,
  ): Channel {
    return new Channel(props, id);
  }

  get workspaceId(): string {
    return this.props.workspaceId;
  }

  get name(): string {
    return this.props.name;
  }

  get providerType(): ProviderType {
    return this.props.providerType;
  }

  get status(): ChannelStatus {
    return this.props.status;
  }

  get config(): ChannelConfig {
    return this.props.config;
  }

  get credentials(): EncryptedCreds | null {
    return this.props.credentials;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  transitionTo(newStatus: ChannelStatus, payload?: string): void {
    this.props.status = newStatus;
    this.props.updatedAt = new Date();
    this._state = STATE_MAP[newStatus];

    const eventMap: Record<string, () => void> = {
      [ChannelStatus.Connecting]: () =>
        this.addDomainEvent(new ChannelConnectingEvent(this.id)),
      [ChannelStatus.QrPending]: () =>
        this.addDomainEvent(new ChannelQrGeneratedEvent(this.id, payload!)),
      [ChannelStatus.Connected]: () =>
        this.addDomainEvent(new ChannelConnectedEvent(this.id)),
      [ChannelStatus.Reconnecting]: () =>
        this.addDomainEvent(new ChannelReconnectingEvent(this.id)),
      [ChannelStatus.Disconnected]: () =>
        this.addDomainEvent(new ChannelDisconnectedEvent(this.id, payload ?? 'voluntary')),
      [ChannelStatus.Failed]: () =>
        this.addDomainEvent(new ChannelFailedEvent(this.id, payload ?? 'unknown')),
    };

    eventMap[newStatus]?.();
  }

  connect(): void {
    this._state.connect(this);
  }

  markQrPending(qrCode: string): void {
    this._state.markQrPending(this, qrCode);
  }

  markConnected(): void {
    this._state.markConnected(this);
  }

  markReconnecting(): void {
    this._state.markReconnecting(this);
  }

  disconnect(): void {
    this._state.disconnect(this);
  }

  markFailed(reason: string): void {
    this._state.markFailed(this, reason);
  }
}
