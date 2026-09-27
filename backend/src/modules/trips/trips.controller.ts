import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SearchTripsDto } from './dto/search-trips.dto';
import { SearchTripsResponseDto } from './dto/trip-search-response.dto';
import { TripsService } from './trips.service';

@Controller('api/v1/trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  /**
   * GET /api/v1/trips/search
   * Search available trips by origin, destination, date, and optional departure time.
   */
  @Get('search')
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  )
  async searchTrips(@Query() query: SearchTripsDto): Promise<SearchTripsResponseDto> {
    return this.tripsService.searchTrips(query);
  }
}
