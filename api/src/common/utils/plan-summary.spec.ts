import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { QueryResult } from 'pg';
import { PlanSummary } from './plan-summary';

const plan = [
  {
    Plan: {
      'Node Type': 'Limit',
      'Plan Rows': 20,
      'Actual Rows': 20,
      'Shared Hit Blocks': 3,
      'Shared Read Blocks': 0,
      Plans: [
        {
          'Node Type': 'Index Scan',
          'Index Name': 'todos_open_created_idx',
          'Relation Name': 'todos',
          'Plan Rows': 4000,
          'Actual Rows': 20,
          'Shared Hit Blocks': 3,
          'Shared Read Blocks': 0,
        },
      ],
    },
    'Planning Time': 0.12,
    'Execution Time': 0.08,
  },
];

function result(): QueryResult {
  return { rows: [{ 'QUERY PLAN': plan }] } as unknown as QueryResult;
}

describe('PlanSummary', () => {
  it('reads the node path, index, and actual time', () => {
    const view = PlanSummary.fromExplain(result(), true);

    assert.equal(view.path, 'Limit → Index Scan');
    assert.deepEqual(view.indexes, ['todos_open_created_idx']);
    assert.equal(view.estimatedRows, 20);
    assert.equal(view.actualRows, 20);
    assert.equal(view.executionMs, 0.08);
    assert.equal(view.sharedHitBlocks, 3);
    assert.equal(view.sharedReadBlocks, 0);
    assert.equal(view.executed, true);
  });

  it('hides actual measurements when the query was not executed', () => {
    const view = PlanSummary.fromExplain(result(), false);

    assert.equal(view.actualRows, null);
    assert.equal(view.executionMs, null);
    assert.equal(view.sharedHitBlocks, null);
    assert.equal(view.executed, false);
  });
});
