import { Entity } from '@domain/shared/entity.js';
import { FailureReason } from '../value-objects/failure-reason.vo.js';

export enum DeliveryAttemptStatus {
  Success = 'SUCCESS',
  Failure = 'FAILURE',
}

interface DeliveryAttemptProps {
  messageId: string;
  attemptNumber: number;
  status: DeliveryAttemptStatus;
  failureReason: FailureReason | null;
  timestamp: Date;
}

export class DeliveryAttempt extends Entity<DeliveryAttemptProps> {
  private constructor(props: DeliveryAttemptProps, id?: string) {
    super(props, id);
  }

  static create(params: {
    messageId: string;
    attemptNumber: number;
    status: DeliveryAttemptStatus;
    failureReason?: FailureReason | null;
    id?: string;
  }): DeliveryAttempt {
    return new DeliveryAttempt(
      {
        messageId: params.messageId,
        attemptNumber: params.attemptNumber,
        status: params.status,
        failureReason: params.failureReason ?? null,
        timestamp: new Date(),
      },
      params.id,
    );
  }

  get messageId(): string {
    return this.props.messageId;
  }

  get attemptNumber(): number {
    return this.props.attemptNumber;
  }

  get status(): DeliveryAttemptStatus {
    return this.props.status;
  }

  get failureReason(): FailureReason | null {
    return this.props.failureReason;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }
}
