import { ValueObject } from '@domain/shared/value-object.js';

interface ProviderMessageRefProps {
  providerId: string;
  providerTimestamp?: Date;
}

export class ProviderMessageRef extends ValueObject<ProviderMessageRefProps> {
  private constructor(props: ProviderMessageRefProps) {
    super(props);
  }

  static create(providerId: string, providerTimestamp?: Date): ProviderMessageRef {
    if (!providerId || providerId.trim().length === 0) {
      throw new Error('Provider message ID cannot be empty.');
    }
    return new ProviderMessageRef({ providerId, providerTimestamp });
  }

  get providerId(): string {
    return this.props.providerId;
  }

  get providerTimestamp(): Date | undefined {
    return this.props.providerTimestamp;
  }
}
