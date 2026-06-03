import { Module } from '@nestjs/common';
import { InfrastructureModule } from '@infra/infrastructure.module.js';
import { MESSAGE_REPOSITORY } from '@domain/messaging/ports/message-repository.port.js';
import { CHANNEL_REPOSITORY } from '@domain/channel/ports/channel-repository.port.js';
import { OUTBOX_REPOSITORY } from '@domain/shared/ports/outbox-repository.port.js';
import { SendMessageUseCase } from '@app/messaging/send-message.use-case.js';
import { MessageController } from '../controllers/message.controller.js';

@Module({
  imports: [InfrastructureModule.register()],
  controllers: [MessageController],
  providers: [
    {
      provide: SendMessageUseCase,
      useFactory: (messageRepo: unknown, channelRepo: unknown, outboxRepo: unknown) =>
        new SendMessageUseCase(
          messageRepo as ConstructorParameters<typeof SendMessageUseCase>[0],
          channelRepo as ConstructorParameters<typeof SendMessageUseCase>[1],
          outboxRepo as ConstructorParameters<typeof SendMessageUseCase>[2],
        ),
      inject: [MESSAGE_REPOSITORY, CHANNEL_REPOSITORY, OUTBOX_REPOSITORY],
    },
  ],
})
export class MessagingModule {}
