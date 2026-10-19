import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const PG_POOL = Symbol('PG_POOL');

export const DEFAULT_DATABASE_URL = 'postgres://todo:todo@localhost:5433/todo';

const logger = new Logger('PgPool');

export function createPgPool(config: ConfigService): Pool {
  const connectionString = config.get<string>('DATABASE_URL') ?? DEFAULT_DATABASE_URL;

  const useSsl = /sslmode=require/i.test(connectionString);
  const pool = new Pool({
    connectionString,
    max: process.env.VERCEL ? 1 : 10,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });

  pool.on('error', (error) => {
    logger.error(`Idle Postgres client failed: ${error.message}`);
  });

  return pool;
}

export function describeDatabase(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const database = url.pathname.replace(/^\//, '') || 'postgres';
    return `${url.hostname}:${url.port || '5432'}/${database}`;
  } catch {
    return 'the configured database';
  }
}
