export type TodoStatus = 'open' | 'done';

export interface Todo {
  id: string;
  title: string;
  notes: string | null;
  status: TodoStatus;
  source: 'user' | 'sample';
  createdAt: string;
  updatedAt: string;
}

export interface ResponseMeta {
  requestId: string;
  durationMs: number;
}

export interface HealthInfo {
  adapter: string;
  database: {
    ok: true;
    version: string;
  };
}

export interface PlanView {
  path: string;
  estimatedRows: number;
  actualRows: number | null;
  planningMs: number | null;
  executionMs: number | null;
  sharedHitBlocks: number | null;
  sharedReadBlocks: number | null;
  indexes: string[];
  executed: boolean;
  raw: unknown;
}

export interface ExplainReport {
  sql: string;
  stats: {
    exact: number;
    userCount: number;
    sampleCount: number;
    estimatedRows: number | null;
  };
  estimated: PlanView;
  actual: PlanView;
  sequentialScanDisabled: PlanView;
  notes: string[];
}

export type TodoFilter = 'all' | TodoStatus;
