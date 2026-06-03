import type { PhoneNumber } from '@domain/messaging/value-objects/phone-number.vo.js';
import type { ProviderMessageRef } from '@domain/messaging/value-objects/provider-message-ref.vo.js';

export interface IMessageSender {
  sendText(channelId: string, to: PhoneNumber, body: string): Promise<ProviderMessageRef>;

  sendMedia(
    channelId: string,
    to: PhoneNumber,
    mediaUrl: string,
    mimeType: string,
    caption?: string,
  ): Promise<ProviderMessageRef>;

  sendTemplate(
    channelId: string,
    to: PhoneNumber,
    templateId: string,
    params: Record<string, string>,
  ): Promise<ProviderMessageRef>;
}

export const MESSAGE_SENDER = Symbol('IMessageSender');
