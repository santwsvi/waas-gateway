import { Logger } from '@nestjs/common';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  type WASocket,
  type ConnectionState,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import { join } from 'path';
import { mkdirSync } from 'fs';
import type { IProviderLifecycle } from '@domain/channel/ports/provider-lifecycle.port.js';
import type { IMessageSender } from '@domain/messaging/ports/message-sender.port.js';
import type { Channel } from '@domain/channel/channel.aggregate.js';
import { ChannelStatus } from '@domain/channel/channel-status.js';
import type { PhoneNumber } from '@domain/messaging/value-objects/phone-number.vo.js';
import { ProviderMessageRef } from '@domain/messaging/value-objects/provider-message-ref.vo.js';

interface ChannelSession {
  socket: WASocket;
  status: ChannelStatus;
  qrCode?: string;
}

export class BaileysProviderAdapter implements IProviderLifecycle, IMessageSender {
  private readonly logger = new Logger(BaileysProviderAdapter.name);
  private sessions: Map<string, ChannelSession> = new Map();
  private readonly authBasePath: string;

  private onQrCode?: (channelId: string, qrCode: string) => void;
  private onConnected?: (channelId: string) => void;
  private onDisconnected?: (channelId: string, reason: string) => void;

  constructor(authBasePath?: string) {
    this.authBasePath = authBasePath ?? join(process.cwd(), '.waas-auth');
    mkdirSync(this.authBasePath, { recursive: true });
  }

  setEventHandlers(handlers: {
    onQrCode?: (channelId: string, qrCode: string) => void;
    onConnected?: (channelId: string) => void;
    onDisconnected?: (channelId: string, reason: string) => void;
  }): void {
    this.onQrCode = handlers.onQrCode;
    this.onConnected = handlers.onConnected;
    this.onDisconnected = handlers.onDisconnected;
  }

  async connect(channel: Channel): Promise<void> {
    const channelId = channel.id;

    if (this.sessions.has(channelId)) {
      this.logger.warn(`Channel ${channelId} already has an active session. Disconnecting first.`);
      await this.disconnect(channelId);
    }

    const authPath = join(this.authBasePath, channelId);
    mkdirSync(authPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }) as unknown as Parameters<typeof makeWASocket>[0]['logger'],
    });

    const session: ChannelSession = {
      socket,
      status: ChannelStatus.Connecting,
    };
    this.sessions.set(channelId, session);

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', (update: Partial<ConnectionState>) => {
      this.handleConnectionUpdate(channelId, update);
    });

    this.logger.log(`Baileys connection initiated for channel ${channelId}`);
  }

  async disconnect(channelId: string): Promise<void> {
    const session = this.sessions.get(channelId);
    if (!session) {
      this.logger.warn(`No session found for channel ${channelId}`);
      return;
    }

    try {
      session.socket.end(undefined);
    } catch (err) {
      this.logger.warn(`Error disconnecting channel ${channelId}: ${err}`);
    }

    session.status = ChannelStatus.Disconnected;
    this.sessions.delete(channelId);
    this.logger.log(`Channel ${channelId} disconnected`);
  }

  async getStatus(channelId: string): Promise<ChannelStatus> {
    const session = this.sessions.get(channelId);
    return session?.status ?? ChannelStatus.Disconnected;
  }

  async requestPairingCode(channelId: string, phoneNumber: string): Promise<string> {
    const session = this.sessions.get(channelId);
    if (!session) {
      throw new Error(`No active session for channel ${channelId}. Call connect() first.`);
    }

    // Strip any non-digit chars (remove +, spaces, dashes)
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    this.logger.log(`Requesting pairing code for channel ${channelId}, phone: ${cleanNumber}`);

    const code = await session.socket.requestPairingCode(cleanNumber);
    this.logger.log(`Pairing code for channel ${channelId}: ${code}`);
    return code;
  }

  async sendText(channelId: string, to: PhoneNumber, body: string): Promise<ProviderMessageRef> {
    const socket = this.getSocket(channelId);
    const jid = await this.resolveJid(socket, to);

    this.logger.log(`Sending text to ${jid} on channel ${channelId}: "${body.substring(0, 50)}..."`);
    const result = await socket.sendMessage(jid, { text: body });
    this.logger.log(`Message sent to ${jid}, key: ${result?.key?.id}, status: ${result?.status}`);
    return ProviderMessageRef.create(
      result?.key?.id ?? `baileys-${crypto.randomUUID()}`,
      new Date(),
    );
  }

  async sendMedia(
    channelId: string,
    to: PhoneNumber,
    mediaUrl: string,
    mimeType: string,
    caption?: string,
  ): Promise<ProviderMessageRef> {
    const socket = this.getSocket(channelId);
    const jid = await this.resolveJid(socket, to);

    const mediaType = this.resolveMediaType(mimeType);

    let result;
    if (mediaType === 'image') {
      result = await socket.sendMessage(jid, { image: { url: mediaUrl }, mimetype: mimeType, caption });
    } else if (mediaType === 'video') {
      result = await socket.sendMessage(jid, { video: { url: mediaUrl }, mimetype: mimeType, caption });
    } else if (mediaType === 'audio') {
      result = await socket.sendMessage(jid, { audio: { url: mediaUrl }, mimetype: mimeType });
    } else {
      result = await socket.sendMessage(jid, { document: { url: mediaUrl }, mimetype: mimeType, caption, fileName: 'file' });
    }
    return ProviderMessageRef.create(
      result?.key?.id ?? `baileys-${crypto.randomUUID()}`,
      new Date(),
    );
  }

  async sendTemplate(
    channelId: string,
    to: PhoneNumber,
    templateId: string,
    params: Record<string, string>,
  ): Promise<ProviderMessageRef> {
    // Baileys doesn't support HSM templates natively (that's Meta Cloud API).
    // For Baileys, we render the template as plain text.
    const body = Object.entries(params).reduce(
      (text, [key, value]) => text.replace(`{{${key}}}`, value),
      templateId,
    );

    return this.sendText(channelId, to, body);
  }

  // --- Private helpers ---

  private handleConnectionUpdate(channelId: string, update: Partial<ConnectionState>): void {
    const session = this.sessions.get(channelId);
    if (!session) return;

    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      session.status = ChannelStatus.QrPending;
      session.qrCode = qr;
      this.logger.log(`QR code generated for channel ${channelId}`);
      console.log(`\n\n=== SCAN THIS QR CODE ===\n${qr}\n=========================\n`);
      this.onQrCode?.(channelId, qr);
    }

    if (connection === 'open') {
      session.status = ChannelStatus.Connected;
      this.logger.log(`Channel ${channelId} connected to WhatsApp`);
      this.onConnected?.(channelId);
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      const reason = DisconnectReason[statusCode] ?? `Unknown (${statusCode})`;

      this.logger.warn(`Channel ${channelId} disconnected: ${reason}`);

      if (shouldReconnect) {
        session.status = ChannelStatus.Reconnecting;
        this.logger.log(`Attempting reconnection for channel ${channelId}...`);
        // Re-trigger connect with a slight delay
        setTimeout(() => {
          const existingSession = this.sessions.get(channelId);
          if (existingSession && existingSession.status === ChannelStatus.Reconnecting) {
            this.sessions.delete(channelId);
            // Reconstitute a minimal channel-like object for reconnection
            this.reconnect(channelId);
          }
        }, 5000);
      } else {
        session.status = ChannelStatus.Disconnected;
        this.sessions.delete(channelId);
        this.onDisconnected?.(channelId, reason);
      }
    }
  }

  private async reconnect(channelId: string): Promise<void> {
    const authPath = join(this.authBasePath, channelId);
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }) as unknown as Parameters<typeof makeWASocket>[0]['logger'],
      browser: ['WaaS Gateway', 'Chrome', '22.0.0'],
    });

    const session: ChannelSession = {
      socket,
      status: ChannelStatus.Reconnecting,
    };
    this.sessions.set(channelId, session);

    socket.ev.on('creds.update', saveCreds);
    socket.ev.on('connection.update', (update: Partial<ConnectionState>) => {
      this.handleConnectionUpdate(channelId, update);
    });
  }

  private getSocket(channelId: string): WASocket {
    const session = this.sessions.get(channelId);
    if (!session) {
      throw new Error(`No active session for channel ${channelId}`);
    }
    if (session.status !== ChannelStatus.Connected) {
      throw new Error(
        `Channel ${channelId} is not connected (status: ${session.status}). Cannot send messages.`,
      );
    }
    return session.socket;
  }

  private toJid(phone: PhoneNumber): string {
    // Remove + prefix and append @s.whatsapp.net
    const number = phone.value.replace(/^\+/, '');
    return `${number}@s.whatsapp.net`;
  }

  /**
   * Uses Baileys onWhatsApp() to resolve the correct JID.
   * WhatsApp Brazil numbers may have the 9th digit stripped internally.
   */
  private async resolveJid(socket: WASocket, phone: PhoneNumber): Promise<string> {
    const number = phone.value.replace(/^\+/, '');
    const fallbackJid = `${number}@s.whatsapp.net`;

    try {
      const [result] = await socket.onWhatsApp(number);
      if (result?.exists && result.jid) {
        this.logger.log(`Resolved JID for ${number}: ${result.jid}`);
        return result.jid;
      }
    } catch (err) {
      this.logger.warn(`onWhatsApp lookup failed for ${number}: ${err}. Using fallback.`);
    }

    this.logger.log(`Using fallback JID for ${number}: ${fallbackJid}`);
    return fallbackJid;
  }

  private resolveMediaType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  }
}
