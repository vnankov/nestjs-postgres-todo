import { Inject, Injectable } from '@nestjs/common';
import { APP_LIMITS, AppLimits } from '../common/constants';
import { PlanSummary, PlanView } from '../common/utils/plan-summary';
import { QueryRunner } from '../database/query-runner';
import { TableStats } from './todo.types';
import { TodosRepository } from './todos.repository';

const OPEN_TODOS_SQL = `
SELECT id, title, status, source, created_at
FROM todos
WHERE status = 'open'::todo_status
ORDER BY created_at DESC
LIMIT 20
`.trim();

const TEACHING_NOTES = [
  'EXPLAIN asks the planner for a cost and does not run the query. EXPLAIN ANALYZE runs it and adds actual rows and time.',
  'Compare estimated rows with actual rows. A large gap usually means the statistics are stale. ANALYZE todos refreshes them.',
  'Shared hit blocks were already in Postgres shared buffers. Shared read blocks were not, so Postgres had to read them.',
  'The partial index todos_open_created_idx matches this query: open rows, newest first. On a tiny table the planner often still picks a sequential scan, because reading the index would cost more than reading the heap.',
  'The third plan sets enable_seqscan off for this transaction only. That shows an index the planner can use. It is a debugging switch, and it should not be left on in production.',
  'pg_class.reltuples is the planner estimate of the table size. count(*) is the exact number. They are allowed to differ.',
  'ANALYZE executes this SELECT. It does not insert, update, or delete. Do not EXPLAIN ANALYZE a write unless you run it inside a transaction you roll back.',
];

export interface ExplainReport {
  sql: string;
  stats: TableStats;
  estimated: PlanView;
  actual: PlanView;
  sequentialScanDisabled: PlanView;
  notes: string[];
}

@Injectable()
export class ExplainService {
  constructor(
    private readonly todos: TodosRepository,
    private readonly runner: QueryRunner,
    @Inject(APP_LIMITS) private readonly limits: AppLimits,
  ) {}

  async plan(): Promise<ExplainReport> {
    const stats = await this.todos.stats();
    const captured = await this.runner.withTransaction(async (client) => {
      await client.query(`SET LOCAL statement_timeout = '5s'`);
      await client.query('SET LOCAL track_io_timing = on');

      const estimated = await client.query(`EXPLAIN (FORMAT JSON) ${OPEN_TODOS_SQL}`);
      const actual = await client.query(
        `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${OPEN_TODOS_SQL}`,
      );

      await client.query('SET LOCAL enable_seqscan = off');
      const sequentialScanDisabled = await client.query(
        `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${OPEN_TODOS_SQL}`,
      );

      return { estimated, actual, sequentialScanDisabled };
    });

    return {
      sql: OPEN_TODOS_SQL,
      stats,
      estimated: PlanSummary.fromExplain(captured.estimated, false),
      actual: PlanSummary.fromExplain(captured.actual, true),
      sequentialScanDisabled: PlanSummary.fromExplain(captured.sequentialScanDisabled, true),
      notes: TEACHING_NOTES,
    };
  }

  async seed(): Promise<{ inserted: number; sampleCount: number }> {
    const inserted = await this.todos.seedSamples(this.limits.sampleSize);
    const stats = await this.todos.stats();
    return { inserted, sampleCount: stats.sampleCount };
  }

  async clearSamples(): Promise<{ deleted: number }> {
    const deleted = await this.todos.clearSamples();
    return { deleted };
  }
}
