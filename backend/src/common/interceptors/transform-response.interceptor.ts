import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../dto/api-response.dto';

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map(res => {
        // If the service returned pagination or explicit message
        if (
          res &&
          typeof res === 'object' &&
          'data' in res &&
          ('pagination' in res || 'message' in res)
        ) {
          return {
            statusCode,
            success: true,
            message: res.message || 'Request processed successfully',
            data: res.data,
            pagination: res.pagination,
            timestamp: new Date().toISOString(),
          };
        }

        return {
          statusCode,
          success: true,
          message: 'Request processed successfully',
          data: res,
          timestamp: new Date().toISOString(),
        };
      })
    );
  }
}
