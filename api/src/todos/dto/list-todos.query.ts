import { IsIn, IsOptional } from 'class-validator';
import { TODO_STATUSES, TodoStatus } from '../todo.types';

export class ListTodosQuery {
  @IsOptional()
  @IsIn(TODO_STATUSES)
  status?: TodoStatus;
}
