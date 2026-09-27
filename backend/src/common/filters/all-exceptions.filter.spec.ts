import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  const mockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const mockArgumentsHost = (response: any, url = '/api/v1/trips/search') => {
    return {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ url }),
      }),
    } as any;
  };

  it('should format HttpException with string response', () => {
    const response = mockResponse();
    const host = mockArgumentsHost(response);
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.FORBIDDEN,
        success: false,
        message: 'Forbidden',
        path: '/api/v1/trips/search',
      })
    );
  });

  it('should format validation errors array from BadRequestException', () => {
    const response = mockResponse();
    const host = mockArgumentsHost(response);
    const exception = new BadRequestException([
      'destination_stop_id must not be identical to origin_stop_id',
    ]);

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        success: false,
        message: 'Validation failed',
        errors: ['destination_stop_id must not be identical to origin_stop_id'],
      })
    );
  });

  it('should format general Error as 500 Internal Server Error', () => {
    const response = mockResponse();
    const host = mockArgumentsHost(response);
    const exception = new Error('Database connection failed');

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        success: false,
        message: 'Database connection failed',
      })
    );
  });
});
