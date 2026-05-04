import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
    path?: string;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<SuccessResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.headers['x-request-id'] as string;
    const path = request.url;

    return next.handle().pipe(
      map((data) => {
        // If data already has success field, return as is (for custom responses)
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Standard success response
        return {
          success: true,
          data: data ?? null,
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
            path,
          },
        };
      }),
    );
  }
}
