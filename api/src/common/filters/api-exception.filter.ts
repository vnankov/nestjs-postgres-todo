import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

interface PgErrorShape {
  code: string;
  message: string;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const resolved = this.resolve(exception);

    response.status(resolved.status).json({
      statusCode: resolved.status,
      message: resolved.message,
      path: request.originalUrl,
      requestId: request.requestId ?? null,
    });
  }

  private resolve(exception: unknown): { status: number; message: string | string[] } {
    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        message: messageFromHttpException(exception),
      };
    }

    if (isPgError(exception)) {
      this.logger.error(`${exception.code} ${exception.message}`);
      if (exception.code === '23514' || exception.code === '22P02') {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'The database rejected this todo. Check the title, notes, and status.',
        };
      }
      if (exception.code === '40001') {
        return {
          status: HttpStatus.CONFLICT,
          message: 'The row changed while it was being saved. Try again.',
        };
      }
      return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Database request failed' };
    }

    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error('Unknown error');
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }
}

function messageFromHttpException(exception: HttpException): string | string[] {
  const body = exception.getResponse();
  if (typeof body === 'string') {
    return body;
  }
  if (typeof body === 'object' && body && 'message' in body) {
    const message = (body as { message: string | string[] }).message;
    return message;
  }
  return exception.message;
}

function isPgError(error: unknown): error is PgErrorShape {
  if (typeof error !== 'object' || error === null || !('code' in error) || !('message' in error)) {
    return false;
  }
  const code = (error as { code: unknown }).code;
  const message = (error as { message: unknown }).message;
  return typeof code === 'string' && code.length === 5 && typeof message === 'string';
}
