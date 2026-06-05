import type { IProviderLifecycle } from '@domain/channel/ports/provider-lifecycle.port.js';
import type { IMessageSender } from '@domain/messaging/ports/message-sender.port.js';
import type { Channel } from '@domain/channel/channel.aggregate.js';
import { ChannelStatus } from '@domain/channel/channel-status.js';
import type { PhoneNumber } from '@domain/messaging/value-objects/phone-number.vo.js';
import { ProviderMessageRef } from '@domain/messaging/value-objects/provider-message-ref.vo.js';

export class InMemoryProviderAdapter implements IProviderLifecycle, IMessageSender {
  private channelStatuses: Map<string, ChannelStatus> = new Map();
  private _sentMessages: Array<{ channelId: string; to: string; content: unknown }> = [];

  async connect(channel: Channel): Promise<void> {
    this.channelStatuses.set(channel.id, ChannelStatus.Connected);
  }

  async disconnect(channelId: string): Promise<void> {
    this.channelStatuses.set(channelId, ChannelStatus.Disconnected);
  }

  async getStatus(channelId: string): Promise<ChannelStatus> {
    return this.channelStatuses.get(channelId) ?? ChannelStatus.Created;
  }

  async requestPairingCode(channelId: string, _phoneNumber: string): Promise<string> {
    this.channelStatuses.set(channelId, ChannelStatus.Connected);
    return 'ABCD-EFGH';
  }

  async sendText(channelId: string, to: PhoneNumber, body: string): Promise<ProviderMessageRef> {
    const ref = ProviderMessageRef.create(`inmemory-${crypto.randomUUID()}`, new Date());
    this._sentMessages.push({ channelId, to: to.value, content: { type: 'TEXT', body } });
    return ref;
  }

  async sendMedia(
    channelId: string,
    to: PhoneNumber,
    mediaUrl: string,
    mimeType: string,
    caption?: string,
  ): Promise<ProviderMessageRef> {
    const ref = ProviderMessageRef.create(`inmemory-${crypto.randomUUID()}`, new Date());
    this._sentMessages.push({
      channelId,
      to: to.value,
      content: { type: 'MEDIA', mediaUrl, mimeType, caption },
    });
    return ref;
  }

  async sendTemplate(
    channelId: string,
    to: PhoneNumber,
    templateId: string,
    params: Record<string, string>,
  ): Promise<ProviderMessageRef> {
    const ref = ProviderMessageRef.create(`inmemory-${crypto.randomUUID()}`, new Date());
    this._sentMessages.push({
      channelId,
      to: to.value,
      content: { type: 'TEMPLATE', templateId, params },
    });
    return ref;
  }

  get sentMessages(): ReadonlyArray<{ channelId: string; to: string; content: unknown }> {
    return [...this._sentMessages];
  }

  clear(): void {
    this.channelStatuses.clear();
    this._sentMessages = [];
  }
}
