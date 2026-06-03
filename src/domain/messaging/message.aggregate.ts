import { AggregateRoot } from '@domain/shared/aggregate-root.js';
import { MessageStatus, MessageDirection } from './message-status.js';
import { PhoneNumber } from './value-objects/phone-number.vo.js';
import { MessageContent } from './value-objects/message-content.vo.js';
import { RetryPolicy } from './value-objects/retry-policy.vo.js';
import { ProviderMessageRef } from './value-objects/provider-message-ref.vo.js';
import { FailureReason } from './value-objects/failure-reason.vo.js';
import { DeliveryAttempt, DeliveryAttemptStatus } from './entities/delivery-attempt.entity.js';
import { MessageCreatedEvent } from './events/message-created.event.js';
import { MessageQueuedEvent } from './events/message-queued.event.js';
import { MessageSendingEvent } from './events/message-sending.event.js';
import { MessageSentEvent } from './events/message-sent.event.js';
import { MessageDeliveredEvent } from './events/message-delivered.event.js';
import { MessageReadEvent } from './events/message-read.event.js';
import { MessageFailedEvent } from './events/message-failed.event.js';
import { MessageRetryingEvent } from './events/message-retrying.event.js';
import { MessageDeadLetteredEvent } from './events/message-dead-lettered.event.js';
import { MessageReceivedEvent } from './events/message-received.event.js';
import type { IMessageState } from './states/message-state.interface.js';
import { PendingState } from './states/pending.state.js';
import { QueuedState } from './states/queued.state.js';
import { SendingState } from './states/sending.state.js';
import { SentState } from './states/sent.state.js';
import { DeliveredState } from './states/delivered.state.js';
import { ReadState } from './states/read.state.js';
import { FailedState } from './states/failed.state.js';
import { RetryingState } from './states/retrying.state.js';
import { DeadLetteredState } from './states/dead-lettered.state.js';
import { ReceivedState } from './states/received.state.js';

interface MessageProps {
  workspaceId: string;
  channelId: string;
  direction: MessageDirection;
  to: PhoneNumber;
  from: PhoneNumber | null;
  content: MessageContent;
  idempotencyKey: string;
  status: MessageStatus;
  retryPolicy: RetryPolicy;
  providerRef: ProviderMessageRef | null;
  failureReason: FailureReason | null;
  deliveryAttempts: DeliveryAttempt[];
  createdAt: Date;
  updatedAt: Date;
}

const STATE_MAP: Record<MessageStatus, IMessageState> = {
  [MessageStatus.Pending]: new PendingState(),
  [MessageStatus.Queued]: new QueuedState(),
  [MessageStatus.Sending]: new SendingState(),
  [MessageStatus.Sent]: new SentState(),
  [MessageStatus.Delivered]: new DeliveredState(),
  [MessageStatus.Read]: new ReadState(),
  [MessageStatus.Failed]: new FailedState(),
  [MessageStatus.Retrying]: new RetryingState(),
  [MessageStatus.DeadLettered]: new DeadLetteredState(),
  [MessageStatus.Received]: new ReceivedState(),
};

export class Message extends AggregateRoot<MessageProps> {
  private _state: IMessageState;

  private constructor(props: MessageProps, id?: string) {
    super(props, id);
    this._state = STATE_MAP[props.status];
  }

  static create(params: {
    workspaceId: string;
    channelId: string;
    to: PhoneNumber;
    content: MessageContent;
    idempotencyKey: string;
    retryPolicy?: RetryPolicy;
    id?: string;
  }): Message {
    const now = new Date();
    const message = new Message(
      {
        workspaceId: params.workspaceId,
        channelId: params.channelId,
        direction: MessageDirection.Outbound,
        to: params.to,
        from: null,
        content: params.content,
        idempotencyKey: params.idempotencyKey,
        status: MessageStatus.Pending,
        retryPolicy: params.retryPolicy ?? RetryPolicy.default(),
        providerRef: null,
        failureReason: null,
        deliveryAttempts: [],
        createdAt: now,
        updatedAt: now,
      },
      params.id,
    );

    message.addDomainEvent(
      new MessageCreatedEvent(
        message.id,
        params.workspaceId,
        params.channelId,
        params.to.value,
        params.idempotencyKey,
      ),
    );

    return message;
  }

  static createInbound(params: {
    workspaceId: string;
    channelId: string;
    from: PhoneNumber;
    content: MessageContent;
    providerRef: ProviderMessageRef;
    id?: string;
  }): Message {
    const now = new Date();
    const message = new Message(
      {
        workspaceId: params.workspaceId,
        channelId: params.channelId,
        direction: MessageDirection.Inbound,
        to: null as unknown as PhoneNumber,
        from: params.from,
        content: params.content,
        idempotencyKey: '',
        status: MessageStatus.Received,
        retryPolicy: RetryPolicy.create(0, 0, 1),
        providerRef: params.providerRef,
        failureReason: null,
        deliveryAttempts: [],
        createdAt: now,
        updatedAt: now,
      },
      params.id,
    );

    message.addDomainEvent(
      new MessageReceivedEvent(
        message.id,
        params.workspaceId,
        params.channelId,
        params.from.value,
      ),
    );

    return message;
  }

  static reconstitute(id: string, props: MessageProps): Message {
    return new Message(props, id);
  }

  get workspaceId(): string {
    return this.props.workspaceId;
  }

  get channelId(): string {
    return this.props.channelId;
  }

  get direction(): MessageDirection {
    return this.props.direction;
  }

  get to(): PhoneNumber {
    return this.props.to;
  }

  get from(): PhoneNumber | null {
    return this.props.from;
  }

  get content(): MessageContent {
    return this.props.content;
  }

  get idempotencyKey(): string {
    return this.props.idempotencyKey;
  }

  get status(): MessageStatus {
    return this.props.status;
  }

  get retryPolicy(): RetryPolicy {
    return this.props.retryPolicy;
  }

  get providerRef(): ProviderMessageRef | null {
    return this.props.providerRef;
  }

  get failureReason(): FailureReason | null {
    return this.props.failureReason;
  }

  get deliveryAttempts(): ReadonlyArray<DeliveryAttempt> {
    return [...this.props.deliveryAttempts];
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  transitionTo(
    newStatus: MessageStatus,
    payload?: { providerRef?: ProviderMessageRef; failureReason?: FailureReason },
  ): void {
    this.props.status = newStatus;
    this.props.updatedAt = new Date();
    this._state = STATE_MAP[newStatus];

    if (payload?.providerRef) {
      this.props.providerRef = payload.providerRef;
    }
    if (payload?.failureReason) {
      this.props.failureReason = payload.failureReason;
    }

    const eventMap: Record<string, () => void> = {
      [MessageStatus.Queued]: () =>
        this.addDomainEvent(new MessageQueuedEvent(this.id)),
      [MessageStatus.Sending]: () =>
        this.addDomainEvent(new MessageSendingEvent(this.id)),
      [MessageStatus.Sent]: () =>
        this.addDomainEvent(new MessageSentEvent(this.id, this.props.providerRef!.providerId)),
      [MessageStatus.Delivered]: () =>
        this.addDomainEvent(new MessageDeliveredEvent(this.id)),
      [MessageStatus.Read]: () =>
        this.addDomainEvent(new MessageReadEvent(this.id)),
      [MessageStatus.Failed]: () => {
        const attempt = DeliveryAttempt.create({
          messageId: this.id,
          attemptNumber: this.props.deliveryAttempts.length + 1,
          status: DeliveryAttemptStatus.Failure,
          failureReason: payload?.failureReason ?? null,
        });
        this.props.deliveryAttempts.push(attempt);
        this.addDomainEvent(
          new MessageFailedEvent(
            this.id,
            this.props.failureReason!.category,
            this.props.failureReason!.message,
            attempt.attemptNumber,
          ),
        );
      },
      [MessageStatus.Retrying]: () =>
        this.addDomainEvent(
          new MessageRetryingEvent(this.id, this.props.deliveryAttempts.length + 1),
        ),
      [MessageStatus.DeadLettered]: () =>
        this.addDomainEvent(
          new MessageDeadLetteredEvent(this.id, this.props.deliveryAttempts.length),
        ),
    };

    eventMap[newStatus]?.();
  }

  markQueued(): void {
    this._state.markQueued(this);
  }

  markSending(): void {
    this._state.markSending(this);
  }

  markSent(providerRef: ProviderMessageRef): void {
    this._state.markSent(this, providerRef);
  }

  markDelivered(): void {
    this._state.markDelivered(this);
  }

  markRead(): void {
    this._state.markRead(this);
  }

  markFailed(reason: FailureReason): void {
    this._state.markFailed(this, reason);
  }

  markRetrying(): void {
    this._state.markRetrying(this);
  }

  markDeadLettered(): void {
    this._state.markDeadLettered(this);
  }
}
