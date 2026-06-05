import { Module } from '@nestjs/common';
import { MESSAGE_REPOSITORY } from '@domain/messaging/ports/message-repository.port.js';
import { MESSAGE_SENDER } from '@domain/messaging/ports/message-sender.port.js';
import { CHANNEL_REPOSITORY } from '@domain/channel/ports/channel-repository.port.js';
import { OUTBOX_REPOSITORY } from '@domain/shared/ports/outbox-repository.port.js';
import { SendMessageUseCase } from '@app/messaging/send-message.use-case.js';
import { MessageController } from '../controllers/message.controller.js';

@Module({
  controllers: [MessageController],
  providers: [
    {
      provide: SendMessageUseCase,
      useFactory: (messageRepo: unknown, channelRepo: unknown, outboxRepo: unknown, messageSender: unknown) =>
        new SendMessageUseCase(
          messageRepo as ConstructorParameters<typeof SendMessageUseCase>[0],
          channelRepo as ConstructorParameters<typeof SendMessageUseCase>[1],
          outboxRepo as ConstructorParameters<typeof SendMessageUseCase>[2],
          messageSender as ConstructorParameters<typeof SendMessageUseCase>[3],
        ),
      inject: [MESSAGE_REPOSITORY, CHANNEL_REPOSITORY, OUTBOX_REPOSITORY, MESSAGE_SENDER],
    },
  ],
})
export class MessagingModule {}
