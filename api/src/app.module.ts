import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { appValidationPipe } from './common/validation';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { TodosModule } from './todos/todos.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, TodosModule],
  controllers: [HealthController],
  providers: [
    RequestLoggerMiddleware,
    { provide: APP_PIPE, useValue: appValidationPipe },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes({
      path: '{*path}',
      method: RequestMethod.ALL,
    });
  }
}
