import { Controller, Post, Get, Body, Param, Inject } from '@nestjs/common';
import { CreateChannelUseCase } from '@app/channel/create-channel.use-case.js';
import { ConnectChannelUseCase } from '@app/channel/connect-channel.use-case.js';
import { GetChannelStatusUseCase } from '@app/channel/get-channel-status.use-case.js';
import { CreateChannelDto } from '../dto/create-channel.dto.js';
import type { ProviderType } from '@domain/channel/channel-status.js';

@Controller('channels')
export class ChannelController {
  constructor(
    @Inject(CreateChannelUseCase)
    private readonly createChannel: CreateChannelUseCase,
    @Inject(ConnectChannelUseCase)
    private readonly connectChannel: ConnectChannelUseCase,
    @Inject(GetChannelStatusUseCase)
    private readonly getChannelStatus: GetChannelStatusUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateChannelDto) {
    return this.createChannel.execute({
      workspaceId: dto.workspaceId,
      name: dto.name,
      providerType: dto.providerType as ProviderType,
    });
  }

  @Post(':id/connect')
  async connect(@Param('id') id: string) {
    return this.connectChannel.execute({ channelId: id });
  }

  @Get(':id')
  async status(@Param('id') id: string) {
    return this.getChannelStatus.execute({ channelId: id });
  }
}
