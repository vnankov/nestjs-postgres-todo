import { Injectable } from '@nestjs/common';
import { Mapper, Todo, TodoRow } from './todo.types';

@Injectable()
export class TodoMapper implements Mapper<TodoRow, Todo> {
  toDomain(row: TodoRow): Todo {
    return {
      id: row.id,
      title: row.title,
      notes: row.notes,
      status: row.status,
      source: row.source,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
