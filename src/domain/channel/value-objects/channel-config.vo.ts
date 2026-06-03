import { ValueObject } from '@domain/shared/value-object.js';

interface ChannelConfigProps {
  readonly maxConcurrentSessions: number;
  readonly webhookUrl: string | null;
  readonly metadata: Record<string, unknown>;
}

export class ChannelConfig extends ValueObject<ChannelConfigProps> {
  get maxConcurrentSessions(): number {
    return this.props.maxConcurrentSessions;
  }

  get webhookUrl(): string | null {
    return this.props.webhookUrl;
  }

  get metadata(): Record<string, unknown> {
    return this.props.metadata;
  }

  static create(props: {
    maxConcurrentSessions?: number;
    webhookUrl?: string | null;
    metadata?: Record<string, unknown>;
  }): ChannelConfig {
    if (
      props.maxConcurrentSessions !== undefined &&
      props.maxConcurrentSessions < 1
    ) {
      throw new Error('maxConcurrentSessions must be at least 1');
    }

    return new ChannelConfig({
      maxConcurrentSessions: props.maxConcurrentSessions ?? 1,
      webhookUrl: props.webhookUrl ?? null,
      metadata: props.metadata ?? {},
    });
  }
}
