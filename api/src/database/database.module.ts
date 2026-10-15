import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { createPgPool, PG_POOL } from './pool.factory';
import { QueryRunner } from './query-runner';

@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: createPgPool,
    },
    DatabaseService,
    QueryRunner,
  ],
  exports: [DatabaseService, QueryRunner, PG_POOL],
})
export class DatabaseModule {}
