import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // The Prisma 7 `prisma-client` generator produces a driverless client, so a
    // driver adapter must be supplied with the connection URL — it is no longer
    // read from DATABASE_URL implicitly.
    super({ adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
