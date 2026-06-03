import { ValueObject } from '@domain/shared/value-object.js';

interface PhoneNumberProps {
  value: string;
}

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

export class PhoneNumber extends ValueObject<PhoneNumberProps> {
  private constructor(props: PhoneNumberProps) {
    super(props);
  }

  static create(value: string): PhoneNumber {
    const cleaned = value.replace(/[\s\-()]/g, '');
    if (!E164_REGEX.test(cleaned)) {
      throw new Error(`Invalid phone number: "${value}". Must be E.164 format (e.g., +5511999887766).`);
    }
    return new PhoneNumber({ value: cleaned });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
