import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { InfrastructureModule } from '@infra/infrastructure.module.js';
import { WorkspaceModule } from '@interfaces/http/modules/workspace.module.js';
import { ChannelModule } from '@interfaces/http/modules/channel.module.js';
import { MessagingModule } from '@interfaces/http/modules/messaging.module.js';
import { DomainExceptionFilter } from '@interfaces/http/filters/domain-exception.filter.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    InfrastructureModule.register(),
    WorkspaceModule,
    ChannelModule,
    MessagingModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
  ],
})
export class AppModule {}
