import { ValueObject } from '@domain/shared/value-object.js';

interface RetryPolicyProps {
  maxAttempts: number;
  backoffBaseMs: number;
  backoffMultiplier: number;
}

export class RetryPolicy extends ValueObject<RetryPolicyProps> {
  private constructor(props: RetryPolicyProps) {
    super(props);
  }

  static create(maxAttempts: number, backoffBaseMs: number, backoffMultiplier: number): RetryPolicy {
    if (maxAttempts < 0 || !Number.isInteger(maxAttempts)) {
      throw new Error('maxAttempts must be a non-negative integer.');
    }
    if (backoffBaseMs < 0) {
      throw new Error('backoffBaseMs must be non-negative.');
    }
    if (backoffMultiplier < 1) {
      throw new Error('backoffMultiplier must be >= 1.');
    }
    return new RetryPolicy({ maxAttempts, backoffBaseMs, backoffMultiplier });
  }

  static default(): RetryPolicy {
    return RetryPolicy.create(5, 1000, 2);
  }

  get maxAttempts(): number {
    return this.props.maxAttempts;
  }

  get backoffBaseMs(): number {
    return this.props.backoffBaseMs;
  }

  get backoffMultiplier(): number {
    return this.props.backoffMultiplier;
  }

  calculateDelay(attemptNumber: number): number {
    return this.props.backoffBaseMs * Math.pow(this.props.backoffMultiplier, attemptNumber - 1);
  }

  shouldRetry(currentAttempts: number): boolean {
    return currentAttempts < this.props.maxAttempts;
  }
}
