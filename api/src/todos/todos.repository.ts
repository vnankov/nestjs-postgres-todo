import { Injectable } from '@nestjs/common';
import { PatchBuilder } from '../common/utils/patch-builder';
import { QueryRunner } from '../database/query-runner';
import { TodoMapper } from './todo.mapper';
import { TableStats, Todo, TodoPatch, TodoRow, TodoStatus, TODO_PATCH_FIELDS } from './todo.types';

const TODO_COLUMNS = 'id, title, notes, status, source, created_at, updated_at';

@Injectable()
export class TodosRepository {
  private readonly patches = new PatchBuilder(TODO_PATCH_FIELDS, {
    status: '::todo_status',
  });

  constructor(
    private readonly runner: QueryRunner,
    private readonly mapper: TodoMapper,
  ) {}

  async create(input: { title: string; notes: string | null }): Promise<Todo> {
    const result = await this.runner.query<TodoRow>(
      `INSERT INTO todos (title, notes, source)
       VALUES ($1, $2, 'user'::todo_source)
       RETURNING ${TODO_COLUMNS}`,
      [input.title, input.notes],
    );
    return this.mapper.toDomain(result.rows[0]);
  }

  async list(
    status: TodoStatus | undefined,
    limit: number,
  ): Promise<{ items: Todo[]; total: number }> {
    const statusParam = status ?? null;

    return this.runner.withTransaction(async (client) => {
      const itemsResult = await this.runner.query<TodoRow>(
        `SELECT ${TODO_COLUMNS}
         FROM todos
         WHERE source = 'user'::todo_source
           AND ($1::todo_status IS NULL OR status = $2::todo_status)
         ORDER BY created_at DESC
         LIMIT $3`,
        [statusParam, statusParam, limit],
        client,
      );
      const totalResult = await this.runner.query<{ total: number }>(
        `SELECT count(*)::int AS total
         FROM todos
         WHERE source = 'user'::todo_source
           AND ($1::todo_status IS NULL OR status = $2::todo_status)`,
        [statusParam, statusParam],
        client,
      );

      return {
        items: itemsResult.rows.map((row) => this.mapper.toDomain(row)),
        total: totalResult.rows[0]?.total ?? 0,
      };
    }, 'repeatable read');
  }

  async update(id: string, patch: TodoPatch): Promise<Todo | null> {
    const changes = this.patches.build(patch);
    if (!changes.setSql) {
      return null;
    }

    return this.runner.withTransaction(async (client) => {
      const locked = await this.runner.query<{ id: string }>(
        `SELECT id
         FROM todos
         WHERE id = $1
           AND source = 'user'::todo_source
         FOR UPDATE`,
        [id],
        client,
      );
      if (locked.rows.length === 0) {
        return null;
      }

      const updated = await this.runner.query<TodoRow>(
        `UPDATE todos
         SET ${changes.setSql}
         WHERE id = $${changes.nextIndex}
         RETURNING ${TODO_COLUMNS}`,
        [...changes.values, id],
        client,
      );
      return this.mapper.toDomain(updated.rows[0]);
    });
  }

  async remove(id: string): Promise<Todo | null> {
    const result = await this.runner.query<TodoRow>(
      `DELETE FROM todos
       WHERE id = $1
         AND source = 'user'::todo_source
       RETURNING ${TODO_COLUMNS}`,
      [id],
    );
    const row = result.rows[0];
    return row ? this.mapper.toDomain(row) : null;
  }

  async seedSamples(count: number): Promise<number> {
    const result = await this.runner.query<{ inserted: number }>(
      `WITH inserted AS (
         INSERT INTO todos (title, notes, status, source, created_at)
         SELECT
           'Sample task ' || g::text,
           'Row generated so EXPLAIN ANALYZE has statistics to read.',
           CASE WHEN g % 5 = 0 THEN 'done'::todo_status ELSE 'open'::todo_status END,
           'sample'::todo_source,
           now() - ((g::text || ' seconds')::interval)
         FROM generate_series(1, $1::int) AS g
         RETURNING 1
       )
       SELECT count(*)::int AS inserted FROM inserted`,
      [count],
    );
    await this.runner.query('ANALYZE todos');
    return result.rows[0]?.inserted ?? 0;
  }

  async clearSamples(): Promise<number> {
    const result = await this.runner.query<{ deleted: number }>(
      `WITH deleted AS (
         DELETE FROM todos
         WHERE source = 'sample'::todo_source
         RETURNING 1
       )
       SELECT count(*)::int AS deleted FROM deleted`,
    );
    await this.runner.query('ANALYZE todos');
    return result.rows[0]?.deleted ?? 0;
  }

  async stats(): Promise<TableStats> {
    const result = await this.runner.query<{
      exact: number;
      user_count: number;
      sample_count: number;
      reltuples: number | string;
    }>(
      `SELECT
         (SELECT count(*)::int FROM todos) AS exact,
         (SELECT count(*)::int FROM todos WHERE source = 'user') AS user_count,
         (SELECT count(*)::int FROM todos WHERE source = 'sample') AS sample_count,
         c.reltuples AS reltuples
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relname = 'todos'`,
    );

    const row = result.rows[0];
    if (!row) {
      return { exact: 0, userCount: 0, sampleCount: 0, estimatedRows: null };
    }

    const reltuples = Number(row.reltuples);
    return {
      exact: row.exact,
      userCount: row.user_count,
      sampleCount: row.sample_count,
      estimatedRows: reltuples < 0 ? null : Math.round(reltuples),
    };
  }
}
