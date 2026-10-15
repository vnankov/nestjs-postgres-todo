import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { APP_LIMITS, AppLimits } from '../common/constants';
import { CreateTodoDto } from './dto/create-todo.dto';
import { ListTodosQuery } from './dto/list-todos.query';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { Todo } from './todo.types';
import { TodosRepository } from './todos.repository';

@Injectable()
export class TodosService {
  constructor(
    private readonly todos: TodosRepository,
    @Inject(APP_LIMITS) private readonly limits: AppLimits,
  ) {}

  create(dto: CreateTodoDto): Promise<Todo> {
    return this.todos.create({
      title: dto.title,
      notes: dto.notes ?? null,
    });
  }

  list(query: ListTodosQuery): Promise<{ items: Todo[]; total: number }> {
    return this.todos.list(query.status, this.limits.listLimit);
  }

  async update(id: string, dto: UpdateTodoDto): Promise<Todo> {
    if (dto.title === undefined && dto.notes === undefined && dto.status === undefined) {
      throw new BadRequestException('Provide at least one of: title, notes, status');
    }

    const todo = await this.todos.update(id, dto);
    if (!todo) {
      throw new NotFoundException('Todo not found');
    }
    return todo;
  }

  async remove(id: string): Promise<{ id: string }> {
    const todo = await this.todos.remove(id);
    if (!todo) {
      throw new NotFoundException('Todo not found');
    }
    return { id: todo.id };
  }
}
