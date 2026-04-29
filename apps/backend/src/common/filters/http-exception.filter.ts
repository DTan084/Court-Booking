// TODO: HttpException Filter
// - Bắt tất cả HttpExceptions
// - Format thành: { error, message, statusCode }
// - Log full stack trace nội bộ

import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: ctx.getRequest().url,
      error: exception.name,
      message:
        typeof exceptionResponse === 'object'
          ? (exceptionResponse as any).message || exception.message
          : exceptionResponse || exception.message,
    };

    // TODO: Log full stack trace internally using pino
    console.error('HttpException:', JSON.stringify(errorResponse, null, 2));

    response.status(status).json(errorResponse);
  }
}
