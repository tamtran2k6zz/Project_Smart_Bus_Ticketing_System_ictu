import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RouteStatus, TicketStatus, TripStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchTripsDto } from './dto/search-trips.dto';
import { SearchTripsResponseDto, TripSearchResultDto } from './dto/trip-search-response.dto';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search available bus trips by origin stop, destination stop, date, and optional time.
   * Ensures stop_order of origin < stop_order of destination.
   * Computes estimated pickup time, arrival time, duration, and real-time available seats.
   */
  async searchTrips(dto: SearchTripsDto): Promise<SearchTripsResponseDto> {
    const { origin_stop_id, destination_stop_id, departure_date, page = 1, limit = 10 } = dto;

    // 1. Validate that origin and destination are distinct
    if (origin_stop_id === destination_stop_id) {
      throw new BadRequestException('destination_stop_id must not be identical to origin_stop_id');
    }
    // 2. Verify existence of both bus stops
    const [originStop, destinationStop] = await Promise.all([
      this.prisma.busStop.findUnique({
        where: { id: origin_stop_id },
      }),
      this.prisma.busStop.findUnique({
        where: { id: destination_stop_id },
      }),
    ]);

    if (!originStop) {
      throw new NotFoundException(`Origin bus stop not found with ID: ${origin_stop_id}`);
    }
    if (!destinationStop) {
      throw new NotFoundException(`Destination bus stop not found with ID: ${destination_stop_id}`);
    }

    // 3. Find matching active routes where origin stop precedes destination stop
    const [originRouteStops, destRouteStops] = await Promise.all([
      this.prisma.routeStop.findMany({
        where: {
          stopId: origin_stop_id,
          route: { status: RouteStatus.ACTIVE },
        },
        include: {
          route: {
            select: { id: true, name: true, status: true },
          },
        },
      }),
      this.prisma.routeStop.findMany({
        where: {
          stopId: destination_stop_id,
          route: { status: RouteStatus.ACTIVE },
        },
      }),
    ]);

    const destMap = new Map(destRouteStops.map(rs => [rs.routeId, rs]));

    interface MatchingRouteInfo {
      routeId: string;
      routeName: string;
      originOffsetMinutes: number;
      destOffsetMinutes: number;
    }

    const validRoutes: MatchingRouteInfo[] = [];

    for (const rsOrigin of originRouteStops) {
      const rsDest = destMap.get(rsOrigin.routeId);
      if (rsDest && rsOrigin.stopOrder < rsDest.stopOrder) {
        validRoutes.push({
          routeId: rsOrigin.routeId,
          routeName: rsOrigin.route.name,
          originOffsetMinutes: rsOrigin.estimatedMinutesFromStart,
          destOffsetMinutes: rsDest.estimatedMinutesFromStart,
        });
      }
    }

    // If no routes connect origin to destination in this direction
    if (validRoutes.length === 0) {
      return {
        data: [],
        pagination: {
          page,
          limit,
          total_items: 0,
          total_pages: 0,
        },
      };
    }

    // 4. Resolve departure time filter
    const effectiveTime = this.resolveDepartureTime(departure_date, dto.departure_time);

    const [startHours, startMinutes] = effectiveTime.split(':').map(Number);
    const searchStartOrigin = new Date(`${departure_date}T00:00:00.000Z`);
    searchStartOrigin.setUTCHours(startHours, startMinutes, 0, 0);

    const searchEndOrigin = new Date(`${departure_date}T23:59:59.999Z`);

    // 5. Query scheduled trips for valid routes
    const routeMap = new Map(validRoutes.map(r => [r.routeId, r]));

    const trips = await this.prisma.trip.findMany({
      where: {
        OR: validRoutes.map(r => ({
          routeId: r.routeId,
          status: TripStatus.SCHEDULED,
          departureTime: {
            gte: new Date(searchStartOrigin.getTime() - r.originOffsetMinutes * 60 * 1000),
            lte: new Date(searchEndOrigin.getTime() - r.originOffsetMinutes * 60 * 1000),
          },
        })),
      },
      include: {
        route: {
          select: { id: true, name: true },
        },
        bus: {
          select: { id: true, busType: true, totalSeats: true },
        },
        tickets: {
          where: {
            status: { in: [TicketStatus.BOOKED, TicketStatus.RESERVED] },
          },
          select: { id: true },
        },
      },
      orderBy: {
        departureTime: 'asc',
      },
    });

    // 6. Map and transform trips into response format
    const searchResults: TripSearchResultDto[] = trips
      .map(trip => {
        const routeInfo = routeMap.get(trip.routeId);
        if (!routeInfo) return null;

        const departureAtOrigin = new Date(
          trip.departureTime.getTime() + routeInfo.originOffsetMinutes * 60 * 1000
        );
        const arrivalAtDest = new Date(
          trip.departureTime.getTime() + routeInfo.destOffsetMinutes * 60 * 1000
        );

        // Filter out if departure at origin is before the requested start time
        if (departureAtOrigin.getTime() < searchStartOrigin.getTime()) {
          return null;
        }

        const durationMinutes = routeInfo.destOffsetMinutes - routeInfo.originOffsetMinutes;

        // Calculate available seats = total_seats - active tickets
        const bookedCount = trip.tickets ? trip.tickets.length : 0;
        const availableSeats = Math.max(0, trip.bus.totalSeats - bookedCount);

        return {
          trip_id: trip.id,
          route_name: trip.route.name,
          bus_type: trip.bus.busType,
          departure_time_at_origin: departureAtOrigin.toISOString(),
          arrival_time_at_destination: arrivalAtDest.toISOString(),
          duration_minutes: durationMinutes,
          available_seats: availableSeats,
          price: Number(trip.basePrice),
        };
      })
      .filter((item): item is TripSearchResultDto => item !== null);

    // Sort by departure time at origin
    searchResults.sort(
      (a, b) =>
        new Date(a.departure_time_at_origin).getTime() -
        new Date(b.departure_time_at_origin).getTime()
    );

    // 7. Pagination
    const totalItems = searchResults.length;
    const totalPages = Math.ceil(totalItems / limit) || (totalItems === 0 ? 0 : 1);
    const startIndex = (page - 1) * limit;
    const paginatedData = searchResults.slice(startIndex, startIndex + limit);

    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        total_items: totalItems,
        total_pages: totalPages,
      },
    };
  }

  /** Get all seats and their status for a specific trip. */
  async getSeatsByTrip(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      throw new NotFoundException(`Trip not found with ID: ${tripId}`);
    }

    const tripSeats = await this.prisma.tripSeat.findMany({
      where: { tripId },
      include: { seat: true },
      orderBy: {
        seat: { seatNumber: 'asc' },
      },
    });

    return tripSeats.map((tripSeat) => ({
      id: tripSeat.seat.id,
      seat_number: tripSeat.seat.seatNumber,
      row_position: tripSeat.seat.rowPosition,
      deck: tripSeat.seat.deck,
      is_priority: tripSeat.seat.isPriority,
      status: tripSeat.status,
    }));
  }

  /**
   * Determine effective departure time:
   * - If user specifies departure_time, use it.
   * - If departure_date is today and no time specified, default to current HH:mm.
   * - If departure_date is in the future and no time specified, default to '00:00'.
   */
  resolveDepartureTime(departureDateStr: string, providedTime?: string): string {
    if (providedTime) {
      return providedTime;
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (departureDateStr === todayStr) {
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }

    return '00:00';
  }
}
