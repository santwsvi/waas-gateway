import { Inject, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PROVIDER_LIFECYCLE } from '@domain/channel/ports/provider-lifecycle.port.js';
import { CHANNEL_REPOSITORY } from '@domain/channel/ports/channel-repository.port.js';
import type { IChannelRepository } from '@domain/channel/ports/channel-repository.port.js';
import type { BaileysProviderAdapter } from './providers/baileys/baileys-provider.adapter.js';

@Injectable()
export class BaileysConnectionSync implements OnModuleInit {
  private readonly logger = new Logger(BaileysConnectionSync.name);

  constructor(
    @Inject(PROVIDER_LIFECYCLE)
    private readonly provider: BaileysProviderAdapter,
    @Inject(CHANNEL_REPOSITORY)
    private readonly channelRepo: IChannelRepository,
  ) {}

  onModuleInit(): void {
    if (!('setEventHandlers' in this.provider)) return;

    this.provider.setEventHandlers({
      onConnected: async (channelId: string) => {
        this.logger.log(`Syncing channel ${channelId} to CONNECTED`);
        const channel = await this.channelRepo.findById(channelId);
        if (channel) {
          channel.markConnected();
          await this.channelRepo.save(channel);
        }
      },
      onDisconnected: async (channelId: string, reason: string) => {
        this.logger.log(`Syncing channel ${channelId} to DISCONNECTED (${reason})`);
        const channel = await this.channelRepo.findById(channelId);
        if (channel) {
          channel.disconnect();
          await this.channelRepo.save(channel);
        }
      },
      onQrCode: (channelId: string, _qr: string) => {
        this.logger.log(`QR generated for channel ${channelId}`);
      },
    });
  }
}
