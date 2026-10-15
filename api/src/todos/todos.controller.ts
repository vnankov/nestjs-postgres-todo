import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DebugGuard } from '../common/guards/debug.guard';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';
import { CreateTodoDto } from './dto/create-todo.dto';
import { ListTodosQuery } from './dto/list-todos.query';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { ExplainService } from './explain.service';
import { Todo } from './todo.types';
import { TodosService } from './todos.service';

@Controller('todos')
export class TodosController {
  constructor(
    private readonly todos: TodosService,
    private readonly explain: ExplainService,
  ) {}

  @Post()
  create(@Body() dto: CreateTodoDto): Promise<Todo> {
    return this.todos.create(dto);
  }

  @Get()
  list(@Query() query: ListTodosQuery): Promise<{ items: Todo[]; total: number }> {
    return this.todos.list(query);
  }

  @Get('debug/plan')
  @UseGuards(DebugGuard)
  plan() {
    return this.explain.plan();
  }

  @Post('debug/seed')
  @UseGuards(DebugGuard)
  seed() {
    return this.explain.seed();
  }

  @Delete('debug/samples')
  @UseGuards(DebugGuard)
  clearSamples() {
    return this.explain.clearSamples();
  }

  @Patch(':id')
  update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateTodoDto): Promise<Todo> {
    return this.todos.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUuidPipe) id: string): Promise<{ id: string }> {
    return this.todos.remove(id);
  }
}
