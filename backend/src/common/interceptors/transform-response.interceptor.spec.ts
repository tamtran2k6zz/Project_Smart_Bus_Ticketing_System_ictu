import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformResponseInterceptor } from './transform-response.interceptor';

describe('TransformResponseInterceptor', () => {
  let interceptor: TransformResponseInterceptor<any>;

  beforeEach(() => {
    interceptor = new TransformResponseInterceptor();
  });

  const mockExecutionContext = (statusCode = 200) => {
    return {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode }),
      }),
    } as ExecutionContext;
  };

  it('should transform response wrapping raw data with success envelope', done => {
    const context = mockExecutionContext(200);
    const next = {
      handle: () => of({ test: 'value' }),
    };

    interceptor.intercept(context, next).subscribe({
      next: result => {
        expect(result.statusCode).toBe(200);
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ test: 'value' });
        expect(result.timestamp).toBeDefined();
        done();
      },
    });
  });

  it('should preserve pagination and custom message if returned by service', done => {
    const context = mockExecutionContext(200);
    const next = {
      handle: () =>
        of({
          data: [{ id: 1 }],
          pagination: { page: 1, limit: 10, total_items: 1, total_pages: 1 },
          message: 'Found trips',
        }),
    };

    interceptor.intercept(context, next).subscribe({
      next: result => {
        expect(result.statusCode).toBe(200);
        expect(result.success).toBe(true);
        expect(result.message).toBe('Found trips');
        expect(result.data).toEqual([{ id: 1 }]);
        expect(result.pagination).toEqual({
          page: 1,
          limit: 10,
          total_items: 1,
          total_pages: 1,
        });
        done();
      },
    });
  });
});
