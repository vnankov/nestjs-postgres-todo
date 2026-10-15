import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { map, Observable } from 'rxjs';
import { ApiResponse } from '../utils/api-response';

@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const startedAt = request.startedAt ?? Date.now();

    return next.handle().pipe(
      map(
        (data) =>
          new ApiResponse(data, {
            requestId: request.requestId ?? 'unknown',
            durationMs: Date.now() - startedAt,
          }),
      ),
    );
  }
}
