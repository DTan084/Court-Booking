import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, body } = request;
    const requestId = request.headers['x-request-id'] || this.generateRequestId();

    // Add request ID to request for tracking
    request.headers['x-request-id'] = requestId;

    const now = Date.now();

    // Log incoming request
    this.logger.log(`[${requestId}] → ${method} ${url} - ${ip}`);

    // Log request body for non-GET requests (excluding sensitive data)
    if (method !== 'GET' && body && Object.keys(body).length > 0) {
      const sanitizedBody = this.sanitizeBody(body);
      this.logger.debug(`[${requestId}] Body: ${JSON.stringify(sanitizedBody)}`);
    }

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const delay = Date.now() - now;

        // Log response with color coding based on status
        const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';
        this.logger[logLevel](`[${requestId}] ← ${method} ${url} ${statusCode} +${delay}ms`);

        // Warn on slow requests (>1s)
        if (delay > 1000) {
          this.logger.warn(`[${requestId}] Slow request detected: ${delay}ms`);
        }
      }),
      catchError((error) => {
        const delay = Date.now() - now;
        this.logger.error(
          `[${requestId}] ✗ ${method} ${url} ${error.status || 500} +${delay}ms - ${error.message}`,
        );
        return throwError(() => error);
      }),
    );
  }

  private sanitizeBody(body: any): any {
    const sensitiveFields = ['password', 'passwordHash', 'token', 'refreshToken', 'secret'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
