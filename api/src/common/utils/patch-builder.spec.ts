import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PatchBuilder } from './patch-builder';

describe('PatchBuilder', () => {
  const builder = new PatchBuilder(['title', 'notes', 'status'] as const, {
    status: '::todo_status',
  });

  it('emits whitelisted columns in list order and binds values', () => {
    const sql = builder.build({ status: 'done', title: 'Ship it' });

    assert.equal(sql.setSql, 'title = $1, status = $2::todo_status');
    assert.deepEqual(sql.values, ['Ship it', 'done']);
    assert.equal(sql.nextIndex, 3);
  });

  it('keeps nulls so a column can be cleared', () => {
    const sql = builder.build({ notes: null });

    assert.equal(sql.setSql, 'notes = $1');
    assert.deepEqual(sql.values, [null]);
  });

  it('ignores keys that are not in the field list', () => {
    const sql = builder.build({ title: 'A', unexpected: 'nope' } as { title: string });

    assert.equal(sql.setSql, 'title = $1');
    assert.deepEqual(sql.values, ['A']);
  });
});
