import { ValueObject } from '@domain/shared/value-object.js';

export enum FailureCategory {
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_RECIPIENT = 'INVALID_RECIPIENT',
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

interface FailureReasonProps {
  category: FailureCategory;
  message: string;
  retryable: boolean;
}

export class FailureReason extends ValueObject<FailureReasonProps> {
  private constructor(props: FailureReasonProps) {
    super(props);
  }

  static create(category: FailureCategory, message: string, retryable?: boolean): FailureReason {
    const isRetryable = retryable ?? FailureReason.defaultRetryable(category);
    return new FailureReason({ category, message, retryable: isRetryable });
  }

  private static defaultRetryable(category: FailureCategory): boolean {
    switch (category) {
      case FailureCategory.PROVIDER_ERROR:
      case FailureCategory.RATE_LIMITED:
      case FailureCategory.TIMEOUT:
        return true;
      case FailureCategory.INVALID_RECIPIENT:
      case FailureCategory.CIRCUIT_OPEN:
      case FailureCategory.UNKNOWN:
        return false;
    }
  }

  get category(): FailureCategory {
    return this.props.category;
  }

  get message(): string {
    return this.props.message;
  }

  get retryable(): boolean {
    return this.props.retryable;
  }
}
