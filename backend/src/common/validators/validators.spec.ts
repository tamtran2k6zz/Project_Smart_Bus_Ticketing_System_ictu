import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SearchTripsDto } from '../../modules/trips/dto/search-trips.dto';

describe('SearchTripsDto Validation', () => {
  const getTodayString = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getPastString = (): string => {
    const past = new Date(Date.now() - 86400000 * 2); // 2 days ago
    const year = past.getFullYear();
    const month = String(past.getMonth() + 1).padStart(2, '0');
    const day = String(past.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getFutureString = (): string => {
    const future = new Date(Date.now() + 86400000 * 30); // 30 days later
    const year = future.getFullYear();
    const month = String(future.getMonth() + 1).padStart(2, '0');
    const day = String(future.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  it('should pass validation with valid inputs', async () => {
    const input = {
      origin_stop_id: 'a1111111-1111-4111-8111-111111111111',
      destination_stop_id: 'b2222222-2222-4222-8222-222222222222',
      departure_date: getFutureString(),
      departure_time: '14:30',
      page: 1,
      limit: 20,
    };

    const dto = plainToInstance(SearchTripsDto, input);
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation when departure_date is today', async () => {
    const input = {
      origin_stop_id: 'a1111111-1111-4111-8111-111111111111',
      destination_stop_id: 'b2222222-2222-4222-8222-222222222222',
      departure_date: getTodayString(),
    };

    const dto = plainToInstance(SearchTripsDto, input);
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail validation when origin_stop_id equals destination_stop_id', async () => {
    const sameId = 'a1111111-1111-4111-8111-111111111111';
    const input = {
      origin_stop_id: sameId,
      destination_stop_id: sameId,
      departure_date: getFutureString(),
    };

    const dto = plainToInstance(SearchTripsDto, input);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const destError = errors.find(e => e.property === 'destination_stop_id');
    expect(destError).toBeDefined();
    expect(destError?.constraints?.isNotSameAs).toContain(
      'destination_stop_id must not be identical to origin_stop_id'
    );
  });

  it('should fail validation when departure_date is in the past', async () => {
    const input = {
      origin_stop_id: 'a1111111-1111-4111-8111-111111111111',
      destination_stop_id: 'b2222222-2222-4222-8222-222222222222',
      departure_date: getPastString(),
    };

    const dto = plainToInstance(SearchTripsDto, input);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const dateError = errors.find(e => e.property === 'departure_date');
    expect(dateError).toBeDefined();
    expect(dateError?.constraints?.isNotPastDate).toBeDefined();
  });

  it('should fail validation when UUID format is invalid', async () => {
    const input = {
      origin_stop_id: 'invalid-uuid-string',
      destination_stop_id: 'b2222222-2222-4222-8222-222222222222',
      departure_date: getFutureString(),
    };

    const dto = plainToInstance(SearchTripsDto, input);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const originError = errors.find(e => e.property === 'origin_stop_id');
    expect(originError).toBeDefined();
    expect(originError?.constraints?.isUuid).toBeDefined();
  });

  it('should fail validation when departure_time is not in HH:mm format', async () => {
    const input = {
      origin_stop_id: 'a1111111-1111-4111-8111-111111111111',
      destination_stop_id: 'b2222222-2222-4222-8222-222222222222',
      departure_date: getFutureString(),
      departure_time: '25:99', // Invalid hour and minute
    };

    const dto = plainToInstance(SearchTripsDto, input);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const timeError = errors.find(e => e.property === 'departure_time');
    expect(timeError).toBeDefined();
    expect(timeError?.constraints?.matches).toBeDefined();
  });
});
