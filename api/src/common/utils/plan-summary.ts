import type { QueryResult, QueryResultRow } from 'pg';

interface PlanNode {
  'Node Type': string;
  'Index Name'?: string;
  'Plan Rows': number;
  'Actual Rows'?: number;
  'Shared Hit Blocks'?: number;
  'Shared Read Blocks'?: number;
  Plans?: PlanNode[];
}

interface ExplainDocument {
  Plan: PlanNode;
  'Planning Time'?: number;
  'Execution Time'?: number;
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

export class PlanSummary {
  static fromExplain(result: QueryResult<QueryResultRow>, executed: boolean): PlanView {
    const raw = result.rows[0]?.['QUERY PLAN'];
    const document = PlanSummary.readDocument(raw);
    const root = document.Plan;
    const nodeTypes: string[] = [];
    const indexes: string[] = [];

    PlanSummary.walk(root, (node) => {
      nodeTypes.push(node['Node Type']);
      if (node['Index Name']) {
        indexes.push(node['Index Name']);
      }
    });

    const buffers = PlanSummary.buffers(root);

    return {
      path: nodeTypes.join(' → '),
      estimatedRows: root['Plan Rows'],
      actualRows: executed ? (root['Actual Rows'] ?? null) : null,
      planningMs: document['Planning Time'] ?? null,
      executionMs: executed ? (document['Execution Time'] ?? null) : null,
      sharedHitBlocks: executed ? buffers.hit : null,
      sharedReadBlocks: executed ? buffers.read : null,
      indexes: [...new Set(indexes)],
      executed,
      raw,
    };
  }

  private static readDocument(raw: unknown): ExplainDocument {
    const first = Array.isArray(raw) ? raw[0] : raw;
    if (!first || typeof first !== 'object' || !('Plan' in first)) {
      throw new Error('Postgres did not return an EXPLAIN plan');
    }
    return first as ExplainDocument;
  }

  private static walk(node: PlanNode, visit: (node: PlanNode) => void): void {
    visit(node);
    for (const child of node.Plans ?? []) {
      PlanSummary.walk(child, visit);
    }
  }

  private static buffers(root: PlanNode): { hit: number; read: number } {
    const rootHit = root['Shared Hit Blocks'] ?? 0;
    const rootRead = root['Shared Read Blocks'] ?? 0;
    if (rootHit + rootRead > 0) {
      return { hit: rootHit, read: rootRead };
    }

    let hit = 0;
    let read = 0;
    PlanSummary.walk(root, (node) => {
      hit += node['Shared Hit Blocks'] ?? 0;
      read += node['Shared Read Blocks'] ?? 0;
    });
    return { hit, read };
  }
}
