import { Controller, Post, Body, Inject } from '@nestjs/common';
import { SendMessageUseCase } from '@app/messaging/send-message.use-case.js';
import { SendMessageDto } from '../dto/send-message.dto.js';

@Controller('messages')
export class MessageController {
  constructor(
    @Inject(SendMessageUseCase)
    private readonly sendMessage: SendMessageUseCase,
  ) {}

  @Post()
  async send(@Body() dto: SendMessageDto) {
    return this.sendMessage.execute({
      workspaceId: dto.workspaceId,
      channelId: dto.channelId,
      to: dto.to,
      content: dto.content,
      idempotencyKey: dto.idempotencyKey,
    });
  }
}
