import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  constructor(private readonly config: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = req.requestId ?? randomUUID();
    req.requestId = requestId;
    req.startedAt = req.startedAt ?? Date.now();
    res.setHeader('x-request-id', requestId);

    if (this.config.get<string>('LOG_REQUESTS') !== 'false') {
      res.on('finish', () => {
        const durationMs = Date.now() - (req.startedAt ?? Date.now());
        this.logger.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms ${requestId}`);
      });
    }

    next();
  }
}
