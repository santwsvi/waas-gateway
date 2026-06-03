import { Message } from './message.aggregate.js';
import { MessageStatus, MessageDirection } from './message-status.js';
import { PhoneNumber } from './value-objects/phone-number.vo.js';
import { MessageContent } from './value-objects/message-content.vo.js';
import { RetryPolicy } from './value-objects/retry-policy.vo.js';
import { ProviderMessageRef } from './value-objects/provider-message-ref.vo.js';
import { FailureReason, FailureCategory } from './value-objects/failure-reason.vo.js';
import { DeliveryAttemptStatus } from './entities/delivery-attempt.entity.js';
import { InvalidStateTransitionError } from './errors/invalid-state-transition.error.js';
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

const DEFAULT_PHONE = PhoneNumber.create('+5511999887766');
const DEFAULT_CONTENT = MessageContent.text('Hello world');
const DEFAULT_PROVIDER_REF = ProviderMessageRef.create('provider-123');
const DEFAULT_FAILURE = FailureReason.create(FailureCategory.PROVIDER_ERROR, 'timeout');

function createOutbound(overrides?: { retryPolicy?: RetryPolicy; id?: string }): Message {
  return Message.create({
    workspaceId: 'ws-1',
    channelId: 'ch-1',
    to: DEFAULT_PHONE,
    content: DEFAULT_CONTENT,
    idempotencyKey: 'idem-1',
    retryPolicy: overrides?.retryPolicy,
    id: overrides?.id,
  });
}

function messageAt(status: MessageStatus): Message {
  if (status === MessageStatus.Received) {
    return Message.createInbound({
      workspaceId: 'ws-1',
      channelId: 'ch-1',
      from: DEFAULT_PHONE,
      content: DEFAULT_CONTENT,
      providerRef: DEFAULT_PROVIDER_REF,
    });
  }

  const msg = createOutbound({ retryPolicy: RetryPolicy.create(3, 1000, 2) });
  msg.clearEvents();

  if (status === MessageStatus.Pending) return msg;

  msg.markQueued();
  msg.clearEvents();
  if (status === MessageStatus.Queued) return msg;

  msg.markSending();
  msg.clearEvents();
  if (status === MessageStatus.Sending) return msg;

  if (status === MessageStatus.Failed) {
    msg.markFailed(DEFAULT_FAILURE);
    msg.clearEvents();
    return msg;
  }

  if (status === MessageStatus.Retrying) {
    msg.markFailed(DEFAULT_FAILURE);
    msg.clearEvents();
    msg.markRetrying();
    msg.clearEvents();
    return msg;
  }

  if (status === MessageStatus.DeadLettered) {
    // Exhaust retries: 3 max attempts
    for (let i = 0; i < 3; i++) {
      msg.markFailed(DEFAULT_FAILURE);
      if (i < 2) {
        msg.markRetrying();
        msg.markSending();
      }
    }
    msg.clearEvents();
    msg.markDeadLettered();
    msg.clearEvents();
    return msg;
  }

  msg.markSent(DEFAULT_PROVIDER_REF);
  msg.clearEvents();
  if (status === MessageStatus.Sent) return msg;

  msg.markDelivered();
  msg.clearEvents();
  if (status === MessageStatus.Delivered) return msg;

  msg.markRead();
  msg.clearEvents();
  if (status === MessageStatus.Read) return msg;

  return msg;
}

describe('Message', () => {
  describe('create() — outbound', () => {
    it('should create a message in PENDING status', () => {
      const msg = createOutbound();
      expect(msg.status).toBe(MessageStatus.Pending);
      expect(msg.direction).toBe(MessageDirection.Outbound);
      expect(msg.workspaceId).toBe('ws-1');
      expect(msg.channelId).toBe('ch-1');
      expect(msg.to.value).toBe('+5511999887766');
      expect(msg.idempotencyKey).toBe('idem-1');
      expect(msg.providerRef).toBeNull();
      expect(msg.failureReason).toBeNull();
      expect(msg.deliveryAttempts).toHaveLength(0);
      expect(msg.createdAt).toBeInstanceOf(Date);
      expect(msg.updatedAt).toBeInstanceOf(Date);
      expect(msg.id).toBeDefined();
    });

    it('should emit MessageCreatedEvent', () => {
      const msg = createOutbound();
      expect(msg.domainEvents).toHaveLength(1);
      const event = msg.domainEvents[0] as MessageCreatedEvent;
      expect(event).toBeInstanceOf(MessageCreatedEvent);
      expect(event.eventType).toBe('message.created');
      expect(event.aggregateId).toBe(msg.id);
      expect(event.workspaceId).toBe('ws-1');
      expect(event.channelId).toBe('ch-1');
      expect(event.to).toBe('+5511999887766');
      expect(event.idempotencyKey).toBe('idem-1');
    });

    it('should accept a custom id', () => {
      const msg = createOutbound({ id: 'msg-custom' });
      expect(msg.id).toBe('msg-custom');
    });

    it('should use default retry policy when not provided', () => {
      const msg = createOutbound();
      expect(msg.retryPolicy.maxAttempts).toBe(5);
    });

    it('should accept a custom retry policy', () => {
      const policy = RetryPolicy.create(2, 500, 1.5);
      const msg = createOutbound({ retryPolicy: policy });
      expect(msg.retryPolicy.maxAttempts).toBe(2);
    });
  });

  describe('createInbound()', () => {
    it('should create a message in RECEIVED status', () => {
      const msg = Message.createInbound({
        workspaceId: 'ws-1',
        channelId: 'ch-1',
        from: DEFAULT_PHONE,
        content: DEFAULT_CONTENT,
        providerRef: DEFAULT_PROVIDER_REF,
      });
      expect(msg.status).toBe(MessageStatus.Received);
      expect(msg.direction).toBe(MessageDirection.Inbound);
      expect(msg.from!.value).toBe('+5511999887766');
      expect(msg.providerRef!.providerId).toBe('provider-123');
    });

    it('should emit MessageReceivedEvent', () => {
      const msg = Message.createInbound({
        workspaceId: 'ws-1',
        channelId: 'ch-1',
        from: DEFAULT_PHONE,
        content: DEFAULT_CONTENT,
        providerRef: DEFAULT_PROVIDER_REF,
      });
      expect(msg.domainEvents).toHaveLength(1);
      const event = msg.domainEvents[0] as MessageReceivedEvent;
      expect(event).toBeInstanceOf(MessageReceivedEvent);
      expect(event.eventType).toBe('message.received');
      expect(event.from).toBe('+5511999887766');
    });
  });

  describe('clearEvents()', () => {
    it('should clear and return domain events', () => {
      const msg = createOutbound();
      const cleared = msg.clearEvents();
      expect(cleared).toHaveLength(1);
      expect(msg.domainEvents).toHaveLength(0);
    });
  });

  describe('Valid state transitions — outbound happy path', () => {
    it('PENDING → QUEUED via markQueued()', () => {
      const msg = messageAt(MessageStatus.Pending);
      msg.markQueued();
      expect(msg.status).toBe(MessageStatus.Queued);
      expect(msg.domainEvents[0]).toBeInstanceOf(MessageQueuedEvent);
    });

    it('QUEUED → SENDING via markSending()', () => {
      const msg = messageAt(MessageStatus.Queued);
      msg.markSending();
      expect(msg.status).toBe(MessageStatus.Sending);
      expect(msg.domainEvents[0]).toBeInstanceOf(MessageSendingEvent);
    });

    it('SENDING → SENT via markSent(providerRef)', () => {
      const msg = messageAt(MessageStatus.Sending);
      const ref = ProviderMessageRef.create('prov-456', new Date());
      msg.markSent(ref);
      expect(msg.status).toBe(MessageStatus.Sent);
      expect(msg.providerRef!.providerId).toBe('prov-456');
      const event = msg.domainEvents[0] as MessageSentEvent;
      expect(event).toBeInstanceOf(MessageSentEvent);
      expect(event.providerId).toBe('prov-456');
    });

    it('SENT → DELIVERED via markDelivered()', () => {
      const msg = messageAt(MessageStatus.Sent);
      msg.markDelivered();
      expect(msg.status).toBe(MessageStatus.Delivered);
      expect(msg.domainEvents[0]).toBeInstanceOf(MessageDeliveredEvent);
    });

    it('DELIVERED → READ via markRead()', () => {
      const msg = messageAt(MessageStatus.Delivered);
      msg.markRead();
      expect(msg.status).toBe(MessageStatus.Read);
      expect(msg.domainEvents[0]).toBeInstanceOf(MessageReadEvent);
    });
  });

  describe('Failure and retry flow', () => {
    it('SENDING → FAILED via markFailed(reason)', () => {
      const msg = messageAt(MessageStatus.Sending);
      const reason = FailureReason.create(FailureCategory.TIMEOUT, 'timed out');
      msg.markFailed(reason);
      expect(msg.status).toBe(MessageStatus.Failed);
      expect(msg.failureReason!.category).toBe(FailureCategory.TIMEOUT);
      expect(msg.deliveryAttempts).toHaveLength(1);
      expect(msg.deliveryAttempts[0].status).toBe(DeliveryAttemptStatus.Failure);
      expect(msg.deliveryAttempts[0].attemptNumber).toBe(1);
      const event = msg.domainEvents[0] as MessageFailedEvent;
      expect(event).toBeInstanceOf(MessageFailedEvent);
      expect(event.failureCategory).toBe(FailureCategory.TIMEOUT);
      expect(event.attemptNumber).toBe(1);
    });

    it('FAILED → RETRYING via markRetrying() when retries remaining', () => {
      const msg = messageAt(MessageStatus.Failed);
      msg.markRetrying();
      expect(msg.status).toBe(MessageStatus.Retrying);
      const event = msg.domainEvents[0] as MessageRetryingEvent;
      expect(event).toBeInstanceOf(MessageRetryingEvent);
    });

    it('RETRYING → SENDING via markSending()', () => {
      const msg = messageAt(MessageStatus.Retrying);
      msg.markSending();
      expect(msg.status).toBe(MessageStatus.Sending);
      expect(msg.domainEvents[0]).toBeInstanceOf(MessageSendingEvent);
    });

    it('FAILED → DEAD_LETTERED via markDeadLettered()', () => {
      const msg = messageAt(MessageStatus.Failed);
      msg.markDeadLettered();
      expect(msg.status).toBe(MessageStatus.DeadLettered);
      const event = msg.domainEvents[0] as MessageDeadLetteredEvent;
      expect(event).toBeInstanceOf(MessageDeadLetteredEvent);
    });

    it('should throw on markRetrying() when max retries exhausted', () => {
      const msg = createOutbound({ retryPolicy: RetryPolicy.create(1, 1000, 2) });
      msg.clearEvents();
      msg.markQueued();
      msg.markSending();
      msg.markFailed(DEFAULT_FAILURE);
      msg.clearEvents();
      // 1 attempt used, max is 1 → no more retries
      expect(() => msg.markRetrying()).toThrow('Max retries');
    });

    it('should track multiple delivery attempts across retries', () => {
      const msg = createOutbound({ retryPolicy: RetryPolicy.create(3, 1000, 2) });
      msg.clearEvents();
      msg.markQueued();
      msg.markSending();
      msg.markFailed(DEFAULT_FAILURE); // attempt 1
      msg.markRetrying();
      msg.markSending();
      msg.markFailed(DEFAULT_FAILURE); // attempt 2
      expect(msg.deliveryAttempts).toHaveLength(2);
      expect(msg.deliveryAttempts[0].attemptNumber).toBe(1);
      expect(msg.deliveryAttempts[1].attemptNumber).toBe(2);
    });
  });

  describe('Invalid state transitions', () => {
    it('should throw on PENDING → markSending()', () => {
      const msg = messageAt(MessageStatus.Pending);
      expect(() => msg.markSending()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on PENDING → markSent()', () => {
      const msg = messageAt(MessageStatus.Pending);
      expect(() => msg.markSent(DEFAULT_PROVIDER_REF)).toThrow(InvalidStateTransitionError);
    });

    it('should throw on PENDING → markDelivered()', () => {
      const msg = messageAt(MessageStatus.Pending);
      expect(() => msg.markDelivered()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on PENDING → markRead()', () => {
      const msg = messageAt(MessageStatus.Pending);
      expect(() => msg.markRead()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on PENDING → markFailed()', () => {
      const msg = messageAt(MessageStatus.Pending);
      expect(() => msg.markFailed(DEFAULT_FAILURE)).toThrow(InvalidStateTransitionError);
    });

    it('should throw on QUEUED → markQueued()', () => {
      const msg = messageAt(MessageStatus.Queued);
      expect(() => msg.markQueued()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on QUEUED → markSent()', () => {
      const msg = messageAt(MessageStatus.Queued);
      expect(() => msg.markSent(DEFAULT_PROVIDER_REF)).toThrow(InvalidStateTransitionError);
    });

    it('should throw on SENDING → markQueued()', () => {
      const msg = messageAt(MessageStatus.Sending);
      expect(() => msg.markQueued()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on SENT → markSending()', () => {
      const msg = messageAt(MessageStatus.Sent);
      expect(() => msg.markSending()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on DELIVERED → markSent()', () => {
      const msg = messageAt(MessageStatus.Delivered);
      expect(() => msg.markSent(DEFAULT_PROVIDER_REF)).toThrow(InvalidStateTransitionError);
    });

    it('should throw on READ → any transition', () => {
      const msg = messageAt(MessageStatus.Read);
      expect(() => msg.markQueued()).toThrow(InvalidStateTransitionError);
      expect(() => msg.markSending()).toThrow(InvalidStateTransitionError);
      expect(() => msg.markSent(DEFAULT_PROVIDER_REF)).toThrow(InvalidStateTransitionError);
      expect(() => msg.markDelivered()).toThrow(InvalidStateTransitionError);
      expect(() => msg.markRead()).toThrow(InvalidStateTransitionError);
      expect(() => msg.markFailed(DEFAULT_FAILURE)).toThrow(InvalidStateTransitionError);
      expect(() => msg.markRetrying()).toThrow(InvalidStateTransitionError);
      expect(() => msg.markDeadLettered()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on DEAD_LETTERED → any transition', () => {
      const msg = messageAt(MessageStatus.DeadLettered);
      expect(() => msg.markQueued()).toThrow(InvalidStateTransitionError);
      expect(() => msg.markSending()).toThrow(InvalidStateTransitionError);
      expect(() => msg.markRetrying()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on RECEIVED → any transition (terminal)', () => {
      const msg = messageAt(MessageStatus.Received);
      expect(() => msg.markQueued()).toThrow(InvalidStateTransitionError);
      expect(() => msg.markSending()).toThrow(InvalidStateTransitionError);
      expect(() => msg.markSent(DEFAULT_PROVIDER_REF)).toThrow(InvalidStateTransitionError);
      expect(() => msg.markDelivered()).toThrow(InvalidStateTransitionError);
      expect(() => msg.markRead()).toThrow(InvalidStateTransitionError);
      expect(() => msg.markFailed(DEFAULT_FAILURE)).toThrow(InvalidStateTransitionError);
      expect(() => msg.markRetrying()).toThrow(InvalidStateTransitionError);
      expect(() => msg.markDeadLettered()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on FAILED → markQueued()', () => {
      const msg = messageAt(MessageStatus.Failed);
      expect(() => msg.markQueued()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on FAILED → markSending()', () => {
      const msg = messageAt(MessageStatus.Failed);
      expect(() => msg.markSending()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on RETRYING → markQueued()', () => {
      const msg = messageAt(MessageStatus.Retrying);
      expect(() => msg.markQueued()).toThrow(InvalidStateTransitionError);
    });

    it('should throw on RETRYING → markRetrying()', () => {
      const msg = messageAt(MessageStatus.Retrying);
      expect(() => msg.markRetrying()).toThrow(InvalidStateTransitionError);
    });
  });

  describe('Full lifecycle — outbound happy path', () => {
    it('should support PENDING → QUEUED → SENDING → SENT → DELIVERED → READ', () => {
      const msg = createOutbound();
      msg.clearEvents();

      msg.markQueued();
      expect(msg.status).toBe(MessageStatus.Queued);

      msg.markSending();
      expect(msg.status).toBe(MessageStatus.Sending);

      msg.markSent(DEFAULT_PROVIDER_REF);
      expect(msg.status).toBe(MessageStatus.Sent);

      msg.markDelivered();
      expect(msg.status).toBe(MessageStatus.Delivered);

      msg.markRead();
      expect(msg.status).toBe(MessageStatus.Read);

      expect(msg.domainEvents).toHaveLength(5);
    });
  });

  describe('Full lifecycle — retry then success', () => {
    it('should support SENDING → FAILED → RETRYING → SENDING → SENT', () => {
      const msg = createOutbound({ retryPolicy: RetryPolicy.create(3, 1000, 2) });
      msg.clearEvents();
      msg.markQueued();
      msg.markSending();
      msg.markFailed(DEFAULT_FAILURE);
      msg.markRetrying();
      msg.markSending();
      msg.markSent(DEFAULT_PROVIDER_REF);

      expect(msg.status).toBe(MessageStatus.Sent);
      expect(msg.deliveryAttempts).toHaveLength(1);
      expect(msg.providerRef!.providerId).toBe('provider-123');
    });
  });

  describe('Full lifecycle — exhaust retries to dead letter', () => {
    it('should dead-letter after max retries', () => {
      const msg = createOutbound({ retryPolicy: RetryPolicy.create(2, 1000, 2) });
      msg.clearEvents();
      msg.markQueued();
      msg.markSending();
      msg.markFailed(DEFAULT_FAILURE); // attempt 1
      msg.markRetrying();
      msg.markSending();
      msg.markFailed(DEFAULT_FAILURE); // attempt 2
      // 2 attempts = maxAttempts, no more retries
      expect(() => msg.markRetrying()).toThrow('Max retries');
      msg.markDeadLettered();
      expect(msg.status).toBe(MessageStatus.DeadLettered);
      expect(msg.deliveryAttempts).toHaveLength(2);
    });
  });

  describe('reconstitute()', () => {
    it('should reconstitute without emitting events', () => {
      const msg = Message.reconstitute('msg-1', {
        workspaceId: 'ws-1',
        channelId: 'ch-1',
        direction: MessageDirection.Outbound,
        to: DEFAULT_PHONE,
        from: null,
        content: DEFAULT_CONTENT,
        idempotencyKey: 'idem-1',
        status: MessageStatus.Sent,
        retryPolicy: RetryPolicy.default(),
        providerRef: DEFAULT_PROVIDER_REF,
        failureReason: null,
        deliveryAttempts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(msg.id).toBe('msg-1');
      expect(msg.status).toBe(MessageStatus.Sent);
      expect(msg.domainEvents).toHaveLength(0);
    });

    it('should respect reconstituted state for transitions', () => {
      const msg = Message.reconstitute('msg-1', {
        workspaceId: 'ws-1',
        channelId: 'ch-1',
        direction: MessageDirection.Outbound,
        to: DEFAULT_PHONE,
        from: null,
        content: DEFAULT_CONTENT,
        idempotencyKey: 'idem-1',
        status: MessageStatus.Sent,
        retryPolicy: RetryPolicy.default(),
        providerRef: DEFAULT_PROVIDER_REF,
        failureReason: null,
        deliveryAttempts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      msg.markDelivered();
      expect(msg.status).toBe(MessageStatus.Delivered);
      expect(() => msg.markQueued()).toThrow(InvalidStateTransitionError);
    });
  });

  describe('updatedAt', () => {
    it('should update updatedAt on state transition', () => {
      const msg = messageAt(MessageStatus.Pending);
      const before = msg.updatedAt;
      msg.markQueued();
      expect(msg.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('InvalidStateTransitionError', () => {
    it('should contain from and to status', () => {
      const error = new InvalidStateTransitionError('PENDING', 'SENT');
      expect(error.from).toBe('PENDING');
      expect(error.to).toBe('SENT');
      expect(error.message).toContain('PENDING');
      expect(error.message).toContain('SENT');
      expect(error.name).toBe('InvalidStateTransitionError');
    });
  });

  describe('DeliveryAttempt', () => {
    it('should record failure reason on delivery attempt', () => {
      const msg = messageAt(MessageStatus.Sending);
      const reason = FailureReason.create(FailureCategory.RATE_LIMITED, 'too fast');
      msg.markFailed(reason);
      const attempt = msg.deliveryAttempts[0];
      expect(attempt.messageId).toBe(msg.id);
      expect(attempt.failureReason!.category).toBe(FailureCategory.RATE_LIMITED);
      expect(attempt.timestamp).toBeInstanceOf(Date);
      expect(attempt.id).toBeDefined();
    });
  });
});
