import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';
import { IsNotPastDate } from '../../../common/validators/is-not-past-date.validator';
import { IsNotSameAs } from '../../../common/validators/is-not-same-as.validator';

export class SearchTripsDto {
  @IsNotEmpty({ message: 'origin_stop_id is required' })
  @IsUUID('4', { message: 'origin_stop_id must be a valid UUID v4' })
  origin_stop_id: string;

  @IsNotEmpty({ message: 'destination_stop_id is required' })
  @IsUUID('4', { message: 'destination_stop_id must be a valid UUID v4' })
  @IsNotSameAs('origin_stop_id', {
    message: 'destination_stop_id must not be identical to origin_stop_id',
  })
  destination_stop_id: string;

  @IsNotEmpty({ message: 'departure_date is required' })
  @IsNotPastDate({
    message: 'departure_date must be today or a future date (format YYYY-MM-DD)',
  })
  departure_date: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'departure_time must be in HH:mm format (24-hour)',
  })
  departure_time?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'page must be greater than or equal to 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'limit must be greater than or equal to 1' })
  @Max(100, { message: 'limit cannot exceed 100' })
  limit?: number = 10;
}
