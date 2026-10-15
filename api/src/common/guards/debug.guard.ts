import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class DebugGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const env = this.config.get<string>('NODE_ENV') ?? 'development';
    if (env !== 'production') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header('x-debug-key');
    const expected = this.config.get<string>('DEBUG_KEY');

    if (expected && provided === expected) {
      return true;
    }

    throw new ForbiddenException('Debug routes are closed in production');
  }
}
