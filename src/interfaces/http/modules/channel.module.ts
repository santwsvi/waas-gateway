import { Module } from '@nestjs/common';
import { InfrastructureModule } from '@infra/infrastructure.module.js';
import { CHANNEL_REPOSITORY } from '@domain/channel/ports/channel-repository.port.js';
import { WORKSPACE_REPOSITORY } from '@domain/workspace/ports/workspace-repository.port.js';
import { OUTBOX_REPOSITORY } from '@domain/shared/ports/outbox-repository.port.js';
import { PROVIDER_LIFECYCLE } from '@domain/channel/ports/provider-lifecycle.port.js';
import { CreateChannelUseCase } from '@app/channel/create-channel.use-case.js';
import { ConnectChannelUseCase } from '@app/channel/connect-channel.use-case.js';
import { GetChannelStatusUseCase } from '@app/channel/get-channel-status.use-case.js';
import { ChannelController } from '../controllers/channel.controller.js';

@Module({
  imports: [InfrastructureModule.register()],
  controllers: [ChannelController],
  providers: [
    {
      provide: CreateChannelUseCase,
      useFactory: (channelRepo: unknown, workspaceRepo: unknown, outboxRepo: unknown) =>
        new CreateChannelUseCase(
          channelRepo as ConstructorParameters<typeof CreateChannelUseCase>[0],
          workspaceRepo as ConstructorParameters<typeof CreateChannelUseCase>[1],
          outboxRepo as ConstructorParameters<typeof CreateChannelUseCase>[2],
        ),
      inject: [CHANNEL_REPOSITORY, WORKSPACE_REPOSITORY, OUTBOX_REPOSITORY],
    },
    {
      provide: ConnectChannelUseCase,
      useFactory: (channelRepo: unknown, providerLifecycle: unknown, outboxRepo: unknown) =>
        new ConnectChannelUseCase(
          channelRepo as ConstructorParameters<typeof ConnectChannelUseCase>[0],
          providerLifecycle as ConstructorParameters<typeof ConnectChannelUseCase>[1],
          outboxRepo as ConstructorParameters<typeof ConnectChannelUseCase>[2],
        ),
      inject: [CHANNEL_REPOSITORY, PROVIDER_LIFECYCLE, OUTBOX_REPOSITORY],
    },
    {
      provide: GetChannelStatusUseCase,
      useFactory: (channelRepo: unknown) =>
        new GetChannelStatusUseCase(
          channelRepo as ConstructorParameters<typeof GetChannelStatusUseCase>[0],
        ),
      inject: [CHANNEL_REPOSITORY],
    },
  ],
})
export class ChannelModule {}
