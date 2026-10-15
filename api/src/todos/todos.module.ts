import { Module } from '@nestjs/common';
import { APP_LIMIT_VALUES, APP_LIMITS } from '../common/constants';
import { DebugGuard } from '../common/guards/debug.guard';
import { DatabaseModule } from '../database/database.module';
import { ExplainService } from './explain.service';
import { TodoMapper } from './todo.mapper';
import { TodosController } from './todos.controller';
import { TodosRepository } from './todos.repository';
import { TodosService } from './todos.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TodosController],
  providers: [
    TodosService,
    TodosRepository,
    TodoMapper,
    ExplainService,
    DebugGuard,
    {
      provide: APP_LIMITS,
      useValue: APP_LIMIT_VALUES,
    },
  ],
})
export class TodosModule {}
