import { Test, TestingModule } from '@nestjs/testing';
import { SearchTripsDto } from './dto/search-trips.dto';
import { SearchTripsResponseDto } from './dto/trip-search-response.dto';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

describe('TripsController', () => {
  let controller: TripsController;
  let service: TripsService;

  const mockTripsService = {
    searchTrips: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TripsController],
      providers: [
        {
          provide: TripsService,
          useValue: mockTripsService,
        },
      ],
    }).compile();

    controller = module.get<TripsController>(TripsController);
    service = module.get<TripsService>(TripsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('searchTrips', () => {
    it('should call TripsService.searchTrips with query dto and return result', async () => {
      const queryDto: SearchTripsDto = {
        origin_stop_id: 'a1111111-1111-1111-1111-111111111111',
        destination_stop_id: 'b2222222-2222-2222-2222-222222222222',
        departure_date: '2026-10-01',
        departure_time: '08:00',
        page: 1,
        limit: 10,
      };

      const expectedResponse: SearchTripsResponseDto = {
        data: [
          {
            trip_id: 'trip-1',
            route_name: 'Hà Nội - Hải Phòng',
            bus_type: 'Limousine 22',
            departure_time_at_origin: '2026-10-01T08:30:00.000Z',
            arrival_time_at_destination: '2026-10-01T10:30:00.000Z',
            duration_minutes: 120,
            available_seats: 18,
            price: 250000,
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total_items: 1,
          total_pages: 1,
        },
      };

      mockTripsService.searchTrips.mockResolvedValue(expectedResponse);

      const result = await controller.searchTrips(queryDto);

      expect(service.searchTrips).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(expectedResponse);
    });
  });
});
