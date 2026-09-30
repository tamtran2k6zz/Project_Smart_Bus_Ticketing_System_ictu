import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async searchTrips(
    @Query() query: SearchTripsDto,
  ): Promise<SearchTripsResponseDto> {
    return this.tripsService.searchTrips(query);
  }

  @Get(':tripId/seats')
  @HttpCode(HttpStatus.OK)
  async getSeats(@Param('tripId') tripId: string) {
    return this.tripsService.getSeatsByTrip(tripId);
  }
}