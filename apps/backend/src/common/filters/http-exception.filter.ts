import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { QueryFailedError } from 'typeorm';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    statusCode: number;
    timestamp: string;
    path: string;
    requestId?: string;
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Generate request ID for tracking
    const requestId = (request.headers['x-request-id'] as string) || this.generateRequestId();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'Internal server error';
    let details: any = null;

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        details = (exceptionResponse as any).error || null;
      } else {
        message = exceptionResponse as string;
      }

      errorCode = this.getErrorCode(exception);
    } else if (exception instanceof QueryFailedError) {
      // Database errors
      status = HttpStatus.BAD_REQUEST;
      errorCode = 'DATABASE_ERROR';
      message = 'Database operation failed';

      // Don't expose internal database errors in production
      if (process.env.NODE_ENV !== 'production') {
        details = exception.message;
      }
    } else if (exception instanceof Error) {
      // Generic errors
      message = exception.message;
      errorCode = 'INTERNAL_ERROR';

      // Include stack trace in development
      if (process.env.NODE_ENV !== 'production') {
        details = exception.stack;
      }
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: errorCode,
        message: Array.isArray(message) ? message.join(', ') : message,
        details,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
      },
    };

    // Log with appropriate level
    const logMessage = `[${requestId}] ${request.method} ${request.url} - ${status} ${errorCode}`;

    if (status >= 500) {
      this.logger.error(
        `${logMessage}\n${exception instanceof Error ? exception.stack : JSON.stringify(exception)}`,
      );
    } else if (status >= 400) {
      this.logger.warn(logMessage);
    }

    response.status(status).json(errorResponse);
  }

  private getErrorCode(exception: HttpException): string {
    const status = exception.getStatus();
    const name = exception.constructor.name;

    // Map exception names to error codes
    const errorCodeMap: Record<string, string> = {
      BadRequestException: 'BAD_REQUEST',
      UnauthorizedException: 'UNAUTHORIZED',
      ForbiddenException: 'FORBIDDEN',
      NotFoundException: 'NOT_FOUND',
      ConflictException: 'CONFLICT',
      UnprocessableEntityException: 'UNPROCESSABLE_ENTITY',
      InternalServerErrorException: 'INTERNAL_SERVER_ERROR',
    };

    return errorCodeMap[name] || `HTTP_${status}`;
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
