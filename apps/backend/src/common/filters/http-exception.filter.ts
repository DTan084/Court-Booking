import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;

    const error =
      exception instanceof HttpException ? exception.constructor.name : 'InternalServerError';

    const message =
      exception instanceof HttpException
        ? (exceptionResponse as any).message || exception.message
        : 'Internal server error';

    const details =
      exception instanceof HttpException ? (exceptionResponse as any).error || null : null;

    const errorResponse = {
      error,
      message,
      details,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log the error detail
    this.logger.error(
      `${request.method} ${request.url} ${status} error: ${
        exception instanceof Error ? exception.stack : JSON.stringify(exception)
      }`,
    );

    response.status(status).json(errorResponse);
  }
}
