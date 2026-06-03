import { ValueObject } from '@domain/shared/value-object.js';

interface EncryptedCredsProps {
  readonly encryptedPayload: string;
  readonly algorithm: string;
  readonly keyVersion: number;
}

export class EncryptedCreds extends ValueObject<EncryptedCredsProps> {
  get encryptedPayload(): string {
    return this.props.encryptedPayload;
  }

  get algorithm(): string {
    return this.props.algorithm;
  }

  get keyVersion(): number {
    return this.props.keyVersion;
  }

  static create(props: {
    encryptedPayload: string;
    algorithm?: string;
    keyVersion?: number;
  }): EncryptedCreds {
    if (!props.encryptedPayload) {
      throw new Error('encryptedPayload is required');
    }

    return new EncryptedCreds({
      encryptedPayload: props.encryptedPayload,
      algorithm: props.algorithm ?? 'aes-256-gcm',
      keyVersion: props.keyVersion ?? 1,
    });
  }
}
