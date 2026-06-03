import { PhoneNumber } from './phone-number.vo.js';
import { MessageContent, MessageContentType } from './message-content.vo.js';
import { RetryPolicy } from './retry-policy.vo.js';
import { FailureReason, FailureCategory } from './failure-reason.vo.js';
import { ProviderMessageRef } from './provider-message-ref.vo.js';

describe('PhoneNumber', () => {
  it('should create a valid E.164 phone number', () => {
    const phone = PhoneNumber.create('+5511999887766');
    expect(phone.value).toBe('+5511999887766');
  });

  it('should strip spaces, dashes and parentheses', () => {
    const phone = PhoneNumber.create('+55 (11) 99988-7766');
    expect(phone.value).toBe('+5511999887766');
  });

  it('should throw on missing + prefix', () => {
    expect(() => PhoneNumber.create('5511999887766')).toThrow('Invalid phone number');
  });

  it('should throw on empty string', () => {
    expect(() => PhoneNumber.create('')).toThrow('Invalid phone number');
  });

  it('should throw on too short number', () => {
    expect(() => PhoneNumber.create('+123')).toThrow('Invalid phone number');
  });

  it('should throw on leading zero in country code', () => {
    expect(() => PhoneNumber.create('+0123456789')).toThrow('Invalid phone number');
  });

  it('should consider two PhoneNumbers with the same value as equal', () => {
    const a = PhoneNumber.create('+5511999887766');
    const b = PhoneNumber.create('+5511999887766');
    expect(a.equals(b)).toBe(true);
  });

  it('should return the value via toString()', () => {
    const phone = PhoneNumber.create('+5511999887766');
    expect(phone.toString()).toBe('+5511999887766');
  });
});

describe('MessageContent', () => {
  describe('text', () => {
    it('should create text content', () => {
      const content = MessageContent.text('Hello world');
      expect(content.type).toBe(MessageContentType.TEXT);
      expect(content.data).toEqual({ type: 'TEXT', body: 'Hello world' });
    });

    it('should throw on empty body', () => {
      expect(() => MessageContent.text('')).toThrow('body cannot be empty');
    });

    it('should throw on whitespace-only body', () => {
      expect(() => MessageContent.text('   ')).toThrow('body cannot be empty');
    });
  });

  describe('media', () => {
    it('should create media content', () => {
      const content = MessageContent.media('https://example.com/image.jpg', 'image/jpeg', 'A photo');
      expect(content.type).toBe(MessageContentType.MEDIA);
    });

    it('should throw on empty URL', () => {
      expect(() => MessageContent.media('', 'image/jpeg')).toThrow('URL cannot be empty');
    });

    it('should throw on empty MIME type', () => {
      expect(() => MessageContent.media('https://example.com/x.jpg', '')).toThrow(
        'MIME type cannot be empty',
      );
    });
  });

  describe('template', () => {
    it('should create template content', () => {
      const content = MessageContent.template('welcome', 'en', ['John']);
      expect(content.type).toBe(MessageContentType.TEMPLATE);
    });

    it('should throw on empty template name', () => {
      expect(() => MessageContent.template('', 'en', [])).toThrow('name cannot be empty');
    });
  });
});

describe('RetryPolicy', () => {
  it('should create with valid parameters', () => {
    const policy = RetryPolicy.create(3, 500, 2);
    expect(policy.maxAttempts).toBe(3);
    expect(policy.backoffBaseMs).toBe(500);
    expect(policy.backoffMultiplier).toBe(2);
  });

  it('should create default policy', () => {
    const policy = RetryPolicy.default();
    expect(policy.maxAttempts).toBe(5);
    expect(policy.backoffBaseMs).toBe(1000);
    expect(policy.backoffMultiplier).toBe(2);
  });

  it('should throw on negative maxAttempts', () => {
    expect(() => RetryPolicy.create(-1, 1000, 2)).toThrow('non-negative integer');
  });

  it('should throw on decimal maxAttempts', () => {
    expect(() => RetryPolicy.create(2.5, 1000, 2)).toThrow('non-negative integer');
  });

  it('should throw on negative backoffBaseMs', () => {
    expect(() => RetryPolicy.create(3, -100, 2)).toThrow('non-negative');
  });

  it('should throw on multiplier less than 1', () => {
    expect(() => RetryPolicy.create(3, 1000, 0.5)).toThrow('>= 1');
  });

  it('should calculate exponential backoff delay', () => {
    const policy = RetryPolicy.create(5, 1000, 2);
    expect(policy.calculateDelay(1)).toBe(1000);
    expect(policy.calculateDelay(2)).toBe(2000);
    expect(policy.calculateDelay(3)).toBe(4000);
    expect(policy.calculateDelay(4)).toBe(8000);
  });

  it('should determine if retry is allowed', () => {
    const policy = RetryPolicy.create(3, 1000, 2);
    expect(policy.shouldRetry(0)).toBe(true);
    expect(policy.shouldRetry(2)).toBe(true);
    expect(policy.shouldRetry(3)).toBe(false);
    expect(policy.shouldRetry(5)).toBe(false);
  });

  it('should allow zero maxAttempts (no retries)', () => {
    const policy = RetryPolicy.create(0, 1000, 2);
    expect(policy.shouldRetry(0)).toBe(false);
  });
});

describe('FailureReason', () => {
  it('should create with explicit retryable flag', () => {
    const reason = FailureReason.create(FailureCategory.PROVIDER_ERROR, 'timeout', false);
    expect(reason.retryable).toBe(false);
  });

  it('should default retryable based on category', () => {
    expect(FailureReason.create(FailureCategory.PROVIDER_ERROR, 'err').retryable).toBe(true);
    expect(FailureReason.create(FailureCategory.RATE_LIMITED, 'err').retryable).toBe(true);
    expect(FailureReason.create(FailureCategory.TIMEOUT, 'err').retryable).toBe(true);
    expect(FailureReason.create(FailureCategory.INVALID_RECIPIENT, 'err').retryable).toBe(false);
    expect(FailureReason.create(FailureCategory.CIRCUIT_OPEN, 'err').retryable).toBe(false);
    expect(FailureReason.create(FailureCategory.UNKNOWN, 'err').retryable).toBe(false);
  });

  it('should expose category and message', () => {
    const reason = FailureReason.create(FailureCategory.TIMEOUT, 'connection timeout');
    expect(reason.category).toBe(FailureCategory.TIMEOUT);
    expect(reason.message).toBe('connection timeout');
  });
});

describe('ProviderMessageRef', () => {
  it('should create with providerId', () => {
    const ref = ProviderMessageRef.create('wamid.abc123');
    expect(ref.providerId).toBe('wamid.abc123');
  });

  it('should create with optional timestamp', () => {
    const ts = new Date();
    const ref = ProviderMessageRef.create('wamid.abc123', ts);
    expect(ref.providerTimestamp).toBe(ts);
  });

  it('should throw on empty providerId', () => {
    expect(() => ProviderMessageRef.create('')).toThrow('cannot be empty');
  });

  it('should throw on whitespace-only providerId', () => {
    expect(() => ProviderMessageRef.create('   ')).toThrow('cannot be empty');
  });
});
