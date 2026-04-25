// TODO: Logging Interceptor
// - Log request ID, path, method, duration
// - Chạy trước và sau controller

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;
        // TODO: Use pino logger instead of console
        console.log(`${method} ${url} — ${duration}ms`);
      }),
    );
  }
}
