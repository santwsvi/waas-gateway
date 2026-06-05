import { Controller, Post, Get, Body, Param, Inject } from '@nestjs/common';
import { CreateChannelUseCase } from '@app/channel/create-channel.use-case.js';
import { ConnectChannelUseCase } from '@app/channel/connect-channel.use-case.js';
import { GetChannelStatusUseCase } from '@app/channel/get-channel-status.use-case.js';
import { PairChannelUseCase } from '@app/channel/pair-channel.use-case.js';
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
    @Inject(PairChannelUseCase)
    private readonly pairChannel: PairChannelUseCase,
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

  @Post(':id/pair')
  async pair(@Param('id') id: string, @Body() body: { phoneNumber: string }) {
    return this.pairChannel.execute({ channelId: id, phoneNumber: body.phoneNumber });
  }

  @Get(':id')
  async status(@Param('id') id: string) {
    return this.getChannelStatus.execute({ channelId: id });
  }
}
