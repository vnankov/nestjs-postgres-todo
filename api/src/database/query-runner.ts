import { Inject, Injectable } from '@nestjs/common';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { PG_POOL } from './pool.factory';

const ISOLATION = {
  'read committed': 'READ COMMITTED',
  'repeatable read': 'REPEATABLE READ',
} as const;

export type IsolationLevel = keyof typeof ISOLATION;

@Injectable()
export class QueryRunner {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: unknown[] = [],
    client?: PoolClient,
  ): Promise<QueryResult<T>> {
    const executor = client ?? this.pool;
    return executor.query<T>(text, values);
  }

  async withTransaction<T>(
    work: (client: PoolClient) => Promise<T>,
    isolation: IsolationLevel = 'read committed',
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query(`BEGIN ISOLATION LEVEL ${ISOLATION[isolation]}`);
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // The connection may already be unusable.
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
