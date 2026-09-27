import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaginationDto } from './pagination.dto';

describe('PaginationDto', () => {
  it('should use default values when no input provided', () => {
    const dto = new PaginationDto();
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('should transform and validate valid page and limit', async () => {
    const input = { page: '2', limit: '25' };
    const dto = plainToInstance(PaginationDto, input);
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
  });

  it('should fail when page is less than 1', async () => {
    const input = { page: 0, limit: 10 };
    const dto = plainToInstance(PaginationDto, input);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
