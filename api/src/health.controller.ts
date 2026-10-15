import { Controller, Get } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { DatabaseService } from './database/database.service';

@Controller()
export class HealthController {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly database: DatabaseService,
  ) {}

  @Get('health')
  async health(): Promise<{ adapter: string; database: { ok: true; version: string } }> {
    const database = await this.database.health();
    return {
      adapter: this.adapterHost.httpAdapter.getType(),
      database,
    };
  }
}
