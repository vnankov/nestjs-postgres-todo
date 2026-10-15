import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import express, { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // Nest talks to Node through a server adapter. ExpressAdapter is the default.
  // Swapping in FastifyAdapter from @nestjs/platform-fastify keeps the same
  // controllers, because they depend on Nest's HTTP decorators rather than Express.
  //
  // This middleware is attached to the Express instance itself, so it runs before
  // Nest's JSON parser. A malformed body still gets a request id.
  const server = express();
  server.use((req: Request, res: Response, next: NextFunction) => {
    req.requestId = randomUUID();
    req.startedAt = Date.now();
    res.setHeader('x-request-id', req.requestId);
    next();
  });

  const adapter = new ExpressAdapter(server);
  const app = await NestFactory.create<NestExpressApplication>(AppModule, adapter);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: ['http://localhost:5173'] });
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const port = Number(config.get<string>('PORT') ?? 3000);
  await app.listen(port);

  Logger.log(`Listening on http://localhost:${port}/api (${adapter.getType()})`, 'Bootstrap');
}

void bootstrap();
