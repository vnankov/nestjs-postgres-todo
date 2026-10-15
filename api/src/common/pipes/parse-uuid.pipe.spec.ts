import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { ParseUuidPipe } from './parse-uuid.pipe';

describe('ParseUuidPipe', () => {
  const pipe = new ParseUuidPipe();

  it('returns a valid uuid unchanged', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    assert.equal(pipe.transform(id), id);
  });

  it('rejects a value that is not a uuid', () => {
    assert.throws(() => pipe.transform('todo-1'), BadRequestException);
  });
});
