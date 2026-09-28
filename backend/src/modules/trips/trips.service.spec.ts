import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TripStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchTripsDto } from './dto/search-trips.dto';
import { TripsService } from './trips.service';

describe('TripsService', () => {
  let service: TripsService;

  const mockOriginStopId = 'a1111111-1111-1111-1111-111111111111';
  const mockDestStopId = 'b2222222-2222-2222-2222-222222222222';
  const mockRouteId = 'c3333333-3333-3333-3333-333333333333';
  const mockTripId = 'd4444444-4444-4444-4444-444444444444';
  const mockBusId = 'e5555555-5555-5555-5555-555555555555';

  const mockPrisma = {
    busStop: {
      findUnique: jest.fn(),
    },
    routeStop: {
      findMany: jest.fn(),
    },
    trip: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchTrips', () => {
    const validDto: SearchTripsDto = {
      origin_stop_id: mockOriginStopId,
      destination_stop_id: mockDestStopId,
      departure_date: '2026-10-01',
      departure_time: '08:00',
      page: 1,
      limit: 10,
    };

    it('should throw BadRequestException if origin_stop_id equals destination_stop_id', async () => {
      const invalidDto: SearchTripsDto = {
        ...validDto,
        origin_stop_id: mockOriginStopId,
        destination_stop_id: mockOriginStopId,
      };

      await expect(service.searchTrips(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if origin bus stop does not exist', async () => {
      mockPrisma.busStop.findUnique.mockImplementation(({ where }) => {
        if (where.id === mockOriginStopId) return Promise.resolve(null);
        return Promise.resolve({ id: mockDestStopId, name: 'Hải Phòng' });
      });

      await expect(service.searchTrips(validDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if destination bus stop does not exist', async () => {
      mockPrisma.busStop.findUnique.mockImplementation(({ where }) => {
        if (where.id === mockOriginStopId)
          return Promise.resolve({ id: mockOriginStopId, name: 'Hà Nội' });
        return Promise.resolve(null);
      });

      await expect(service.searchTrips(validDto)).rejects.toThrow(NotFoundException);
    });

    it('should return empty list when no route connects origin and destination', async () => {
      mockPrisma.busStop.findUnique.mockImplementation(({ where }) => {
        return Promise.resolve({ id: where.id, name: 'Sample Stop' });
      });

      // No matching routes
      mockPrisma.routeStop.findMany.mockImplementation(({ where }) => {
        if (where.stopId === mockOriginStopId) {
          return Promise.resolve([
            {
              id: 'rs-1',
              routeId: mockRouteId,
              stopId: mockOriginStopId,
              stopOrder: 1,
              estimatedTimeMinutes: 0,
              route: { id: mockRouteId, name: 'Tuyến 01', isActive: true },
            },
          ]);
        }
        return Promise.resolve([]); // Destination not on this route
      });

      const result = await service.searchTrips(validDto);

      expect(result.data).toEqual([]);
      expect(result.pagination.total_items).toBe(0);
      expect(result.pagination.total_pages).toBe(0);
    });

    it('should return empty list when route passes origin AFTER destination (reverse order)', async () => {
      mockPrisma.busStop.findUnique.mockImplementation(({ where }) => {
        return Promise.resolve({ id: where.id, name: 'Sample Stop' });
      });

      // Origin has stopOrder 3, Destination has stopOrder 1
      mockPrisma.routeStop.findMany.mockImplementation(({ where }) => {
        if (where.stopId === mockOriginStopId) {
          return Promise.resolve([
            {
              id: 'rs-1',
              routeId: mockRouteId,
              stopId: mockOriginStopId,
              stopOrder: 3,
              estimatedTimeMinutes: 60,
              route: { id: mockRouteId, name: 'Tuyến 01', isActive: true },
            },
          ]);
        }
        return Promise.resolve([
          {
            id: 'rs-2',
            routeId: mockRouteId,
            stopId: mockDestStopId,
            stopOrder: 1,
            estimatedTimeMinutes: 0,
          },
        ]);
      });

      const result = await service.searchTrips(validDto);

      expect(result.data).toEqual([]);
      expect(result.pagination.total_items).toBe(0);
    });

    it('should search successfully and return trips with correct timing, seat calculation and pricing', async () => {
      mockPrisma.busStop.findUnique.mockImplementation(({ where }) => {
        return Promise.resolve({ id: where.id, name: 'Stop ' + where.id });
      });

      // Origin order: 1 (offset: 15 min), Destination order: 2 (offset: 135 min)
      mockPrisma.routeStop.findMany.mockImplementation(({ where }) => {
        if (where.stopId === mockOriginStopId) {
          return Promise.resolve([
            {
              id: 'rs-1',
              routeId: mockRouteId,
              stopId: mockOriginStopId,
              stopOrder: 1,
              estimatedTimeMinutes: 15,
              route: {
                id: mockRouteId,
                name: 'Hà Nội - Hải Phòng VIP',
                isActive: true,
              },
            },
          ]);
        }
        return Promise.resolve([
          {
            id: 'rs-2',
            routeId: mockRouteId,
            stopId: mockDestStopId,
            stopOrder: 2,
            estimatedTimeMinutes: 135,
          },
        ]);
      });

      const tripDeparture = new Date('2026-10-01T08:00:00.000Z'); // Start station 08:00
      const tripArrival = new Date('2026-10-01T10:15:00.000Z');

      mockPrisma.trip.findMany.mockResolvedValue([
        {
          id: mockTripId,
          routeId: mockRouteId,
          busId: mockBusId,
          departureTime: tripDeparture,
          arrivalTime: tripArrival,
          status: TripStatus.SCHEDULED,
          basePrice: '220000',
          route: { id: mockRouteId, name: 'Hà Nội - Hải Phòng VIP' },
          bus: { id: mockBusId, busType: 'Limousine VIP 24', totalSeats: 24 },
          tickets: [{ id: 'tk-1' }, { id: 'tk-2' }, { id: 'tk-3' }, { id: 'tk-4' }], // 4 booked
        },
      ]);

      const result = await service.searchTrips(validDto);

      expect(result.data).toHaveLength(1);
      const tripResult = result.data[0];
      expect(tripResult.trip_id).toBe(mockTripId);
      expect(tripResult.route_name).toBe('Hà Nội - Hải Phòng VIP');
      expect(tripResult.bus_type).toBe('Limousine VIP 24');
      // Origin pickup = 08:00 + 15m = 08:15:00.000Z
      expect(tripResult.departure_time_at_origin).toBe('2026-10-01T08:15:00.000Z');
      // Destination arrival = 08:00 + 135m = 10:15:00.000Z
      expect(tripResult.arrival_time_at_destination).toBe('2026-10-01T10:15:00.000Z');
      expect(tripResult.duration_minutes).toBe(120); // 135 - 15 = 120 min
      expect(tripResult.available_seats).toBe(20); // 24 total - 4 booked = 20
      expect(tripResult.price).toBe(220000);
      expect(result.pagination.total_items).toBe(1);
      expect(result.pagination.total_pages).toBe(1);
    });

    it('should correctly report 0 available seats when a trip is sold out', async () => {
      mockPrisma.busStop.findUnique.mockResolvedValue({ id: 'dummy', name: 'Stop' });

      mockPrisma.routeStop.findMany.mockImplementation(({ where }) => {
        if (where.stopId === mockOriginStopId) {
          return Promise.resolve([
            {
              id: 'rs-1',
              routeId: mockRouteId,
              stopId: mockOriginStopId,
              stopOrder: 1,
              estimatedTimeMinutes: 0,
              route: { id: mockRouteId, name: 'Hà Nội - Sapa', isActive: true },
            },
          ]);
        }
        return Promise.resolve([
          {
            id: 'rs-2',
            routeId: mockRouteId,
            stopId: mockDestStopId,
            stopOrder: 2,
            estimatedTimeMinutes: 300,
          },
        ]);
      });

      // Total seats: 2, Active tickets: 2 -> 0 available
      mockPrisma.trip.findMany.mockResolvedValue([
        {
          id: mockTripId,
          routeId: mockRouteId,
          busId: mockBusId,
          departureTime: new Date('2026-10-01T09:00:00.000Z'),
          arrivalTime: new Date('2026-10-01T14:00:00.000Z'),
          status: TripStatus.SCHEDULED,
          basePrice: '350000',
          route: { id: mockRouteId, name: 'Hà Nội - Sapa' },
          bus: { id: mockBusId, busType: 'Sleeper 34', totalSeats: 2 },
          tickets: [{ id: 'tk-1' }, { id: 'tk-2' }],
        },
      ]);

      const result = await service.searchTrips(validDto);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].available_seats).toBe(0);
    });

    it('should default departure_time properly for today and future dates', () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // When today and no time provided, should return current UTC HH:mm
      const todayTime = service.resolveDepartureTime(todayStr, undefined);
      expect(todayTime).toMatch(/^\d{2}:\d{2}$/);

      // When future date and no time provided, should return '00:00'
      const futureTime = service.resolveDepartureTime('2099-01-01', undefined);
      expect(futureTime).toBe('00:00');

      // When time explicitly provided, should preserve it
      const explicitTime = service.resolveDepartureTime('2099-01-01', '14:30');
      expect(explicitTime).toBe('14:30');
    });

    it('should support pagination correctly', async () => {
      mockPrisma.busStop.findUnique.mockResolvedValue({ id: 'dummy', name: 'Stop' });

      mockPrisma.routeStop.findMany.mockImplementation(({ where }) => {
        if (where.stopId === mockOriginStopId) {
          return Promise.resolve([
            {
              id: 'rs-1',
              routeId: mockRouteId,
              stopId: mockOriginStopId,
              stopOrder: 1,
              estimatedTimeMinutes: 0,
              route: { id: mockRouteId, name: 'Route 1', isActive: true },
            },
          ]);
        }
        return Promise.resolve([
          {
            id: 'rs-2',
            routeId: mockRouteId,
            stopId: mockDestStopId,
            stopOrder: 2,
            estimatedTimeMinutes: 60,
          },
        ]);
      });

      // 3 trips
      mockPrisma.trip.findMany.mockResolvedValue([
        {
          id: 'trip-1',
          routeId: mockRouteId,
          departureTime: new Date('2026-10-01T08:00:00.000Z'),
          arrivalTime: new Date('2026-10-01T09:00:00.000Z'),
          status: TripStatus.SCHEDULED,
          basePrice: '100000',
          route: { id: mockRouteId, name: 'Route 1' },
          bus: { id: 'b-1', busType: 'Standard', totalSeats: 40 },
          tickets: [],
        },
        {
          id: 'trip-2',
          routeId: mockRouteId,
          departureTime: new Date('2026-10-01T09:00:00.000Z'),
          arrivalTime: new Date('2026-10-01T10:00:00.000Z'),
          status: TripStatus.SCHEDULED,
          basePrice: '100000',
          route: { id: mockRouteId, name: 'Route 1' },
          bus: { id: 'b-2', busType: 'Standard', totalSeats: 40 },
          tickets: [],
        },
        {
          id: 'trip-3',
          routeId: mockRouteId,
          departureTime: new Date('2026-10-01T10:00:00.000Z'),
          arrivalTime: new Date('2026-10-01T11:00:00.000Z'),
          status: TripStatus.SCHEDULED,
          basePrice: '100000',
          route: { id: mockRouteId, name: 'Route 1' },
          bus: { id: 'b-3', busType: 'Standard', totalSeats: 40 },
          tickets: [],
        },
      ]);

      const paginatedResult = await service.searchTrips({
        ...validDto,
        page: 2,
        limit: 2,
      });

      expect(paginatedResult.pagination.page).toBe(2);
      expect(paginatedResult.pagination.limit).toBe(2);
      expect(paginatedResult.pagination.total_items).toBe(3);
      expect(paginatedResult.pagination.total_pages).toBe(2);
      expect(paginatedResult.data).toHaveLength(1);
      expect(paginatedResult.data[0].trip_id).toBe('trip-3');
    });
  });
});
