import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { DEFAULT_DATABASE_URL, describeDatabase, PG_POOL } from './pool.factory';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.waitUntilReady();
    await this.applySchema();
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async health(): Promise<{ ok: true; version: string }> {
    const result = await this.pool.query<{ version: string }>('SELECT version() AS version');
    return { ok: true, version: result.rows[0].version };
  }

  private async waitUntilReady(): Promise<void> {
    const connectionString = this.config.get<string>('DATABASE_URL') ?? DEFAULT_DATABASE_URL;
    const target = describeDatabase(connectionString);
    const attempts = 30;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        await this.pool.query('SELECT 1');
        this.logger.log(`Connected to Postgres at ${target}`);
        return;
      } catch (error) {
        if (attempt === attempts) {
          throw error;
        }
        this.logger.warn(`Waiting for Postgres at ${target} (${attempt}/${attempts})`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  private async applySchema(): Promise<void> {
    const schemaPath = join(__dirname, 'schema.sql');
    const sql = readFileSync(schemaPath, 'utf8');
    await this.pool.query(sql);
    this.logger.log('Schema is ready');
  }
}
