import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WORKSPACE_REPOSITORY } from '@domain/workspace/ports/workspace-repository.port.js';
import { CHANNEL_REPOSITORY } from '@domain/channel/ports/channel-repository.port.js';
import { MESSAGE_REPOSITORY } from '@domain/messaging/ports/message-repository.port.js';
import { OUTBOX_REPOSITORY } from '@domain/shared/ports/outbox-repository.port.js';
import { EVENT_PUBLISHER } from '@domain/shared/ports/event-publisher.port.js';
import { PROVIDER_LIFECYCLE } from '@domain/channel/ports/provider-lifecycle.port.js';
import { MESSAGE_SENDER } from '@domain/messaging/ports/message-sender.port.js';
import {
  InMemoryWorkspaceRepository,
  InMemoryChannelRepository,
  InMemoryMessageRepository,
  InMemoryOutboxRepository,
  InMemoryEventPublisher,
} from './persistence/in-memory/index.js';
import {
  PrismaService,
  PrismaWorkspaceRepository,
  PrismaChannelRepository,
  PrismaMessageRepository,
  PrismaOutboxRepository,
} from './persistence/prisma/index.js';
import { InMemoryProviderAdapter } from './providers/in-memory/in-memory-provider.adapter.js';
import { BaileysProviderAdapter } from './providers/baileys/baileys-provider.adapter.js';

function createRepositoryProviders(mode: string) {
  if (mode === 'prisma') {
    return [
      PrismaService,
      { provide: WORKSPACE_REPOSITORY, useClass: PrismaWorkspaceRepository },
      { provide: CHANNEL_REPOSITORY, useClass: PrismaChannelRepository },
      { provide: MESSAGE_REPOSITORY, useClass: PrismaMessageRepository },
      { provide: OUTBOX_REPOSITORY, useClass: PrismaOutboxRepository },
    ];
  }

  return [
    { provide: WORKSPACE_REPOSITORY, useClass: InMemoryWorkspaceRepository },
    { provide: CHANNEL_REPOSITORY, useClass: InMemoryChannelRepository },
    { provide: MESSAGE_REPOSITORY, useClass: InMemoryMessageRepository },
    { provide: OUTBOX_REPOSITORY, useClass: InMemoryOutboxRepository },
  ];
}

function createProviderAdapters(providerMode: string) {
  if (providerMode === 'baileys') {
    return [
      {
        provide: PROVIDER_LIFECYCLE,
        useFactory: () => new BaileysProviderAdapter(),
      },
      {
        provide: MESSAGE_SENDER,
        useFactory: () => new BaileysProviderAdapter(),
      },
    ];
  }

  return [
    { provide: PROVIDER_LIFECYCLE, useClass: InMemoryProviderAdapter },
    { provide: MESSAGE_SENDER, useClass: InMemoryProviderAdapter },
  ];
}

@Module({
  imports: [ConfigModule],
})
export class InfrastructureModule {
  static register(options?: { persistence?: string; provider?: string }) {
    const persistenceMode = options?.persistence ?? process.env['PERSISTENCE_MODE'] ?? 'memory';
    const providerMode = options?.provider ?? process.env['PROVIDER_MODE'] ?? 'memory';

    const repoProviders = createRepositoryProviders(persistenceMode);
    const providerAdapters = createProviderAdapters(providerMode);

    const sharedProviders = [
      { provide: EVENT_PUBLISHER, useClass: InMemoryEventPublisher },
    ];

    const allProviders = [...repoProviders, ...providerAdapters, ...sharedProviders];

    return {
      module: InfrastructureModule,
      providers: allProviders,
      exports: allProviders.map((p) =>
        'provide' in p ? p.provide : p,
      ),
    };
  }
}
