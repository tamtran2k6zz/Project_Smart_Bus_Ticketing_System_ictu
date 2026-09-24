import { Test, TestingModule } from '@nestjs/testing';
import { BusStopsService } from './bus-stops.service';
import { PrismaService } from '../database/prisma.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('BusStopsService', () => {
  let service: BusStopsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    busStop: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    routeStop: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusStopsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BusStopsService>(BusStopsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a bus stop', async () => {
      mockPrismaService.busStop.findUnique.mockResolvedValue(null);
      mockPrismaService.busStop.findMany.mockResolvedValue([]);
      mockPrismaService.busStop.create.mockResolvedValue({
        id: 'stop-1',
        code: 'BS-01',
        name: 'Trạm A',
        address: 'Đường 1',
        latitude: 21.0,
        longitude: 105.8,
        isActive: true,
      });

      const dto = {
        code: 'BS-01',
        name: 'Trạm A',
        address: 'Đường 1',
        latitude: 21.0,
        longitude: 105.8,
      };

      const result = await service.create(dto);
      expect(result).toEqual(expect.objectContaining({ id: 'stop-1', code: 'BS-01' }));
    });

    it('should throw ConflictException if code already exists', async () => {
      mockPrismaService.busStop.findUnique.mockResolvedValue({ id: 'stop-1', code: 'BS-01' });

      const dto = {
        code: 'BS-01',
        name: 'Trạm A',
        address: 'Đường 1',
        latitude: 21.0,
        longitude: 105.8,
      };

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if stop is too close (< 10m) to existing stop', async () => {
      mockPrismaService.busStop.findUnique.mockResolvedValue(null);
      mockPrismaService.busStop.findMany.mockResolvedValue([
        { id: 'stop-2', code: 'BS-02', name: 'Trạm B', latitude: 21.0, longitude: 105.80001 },
      ]);

      const dto = {
        code: 'BS-01',
        name: 'Trạm A',
        address: 'Đường 1',
        latitude: 21.0,
        longitude: 105.8,
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return an array of bus stops without filters', async () => {
      const stops = [{ id: 'stop-1', code: 'BS-01', name: 'Trạm A' }];
      mockPrismaService.busStop.findMany.mockResolvedValue(stops);

      const result = await service.findAll();
      expect(result).toEqual(stops);
      expect(mockPrismaService.busStop.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
    });

    it('should filter bus stops by search keyword and isActive', async () => {
      const stops = [{ id: 'stop-1', code: 'BS-01', name: 'Trạm A' }];
      mockPrismaService.busStop.findMany.mockResolvedValue(stops);

      const result = await service.findAll('Trạm A', true);
      expect(result).toEqual(stops);
      expect(mockPrismaService.busStop.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            isActive: true,
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a bus stop if found', async () => {
      const stop = { id: 'stop-1', code: 'BS-01', name: 'Trạm A', deletedAt: null };
      mockPrismaService.busStop.findFirst.mockResolvedValue(stop);

      const result = await service.findOne('stop-1');
      expect(result).toEqual(stop);
    });

    it('should throw NotFoundException if bus stop not found', async () => {
      mockPrismaService.busStop.findFirst.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update bus stop successfully without changing code or coordinates', async () => {
      const currentStop = { id: 'stop-1', code: 'BS-01', name: 'Trạm A', latitude: 21.0, longitude: 105.8 };
      mockPrismaService.busStop.findFirst.mockResolvedValue(currentStop);
      mockPrismaService.busStop.update.mockResolvedValue({ ...currentStop, name: 'Trạm A Mới' });

      const result = await service.update('stop-1', { name: 'Trạm A Mới' });
      expect(result.name).toBe('Trạm A Mới');
    });

    it('should throw ConflictException if new code already belongs to another stop', async () => {
      const currentStop = { id: 'stop-1', code: 'BS-01', name: 'Trạm A', latitude: 21.0, longitude: 105.8 };
      mockPrismaService.busStop.findFirst.mockResolvedValue(currentStop);
      mockPrismaService.busStop.findUnique.mockResolvedValue({ id: 'stop-2', code: 'BS-99' });

      await expect(service.update('stop-1', { code: 'BS-99' })).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if new coordinates are within 10m of another stop', async () => {
      const currentStop = { id: 'stop-1', code: 'BS-01', name: 'Trạm A', latitude: 21.0, longitude: 105.8 };
      mockPrismaService.busStop.findFirst.mockResolvedValue(currentStop);
      mockPrismaService.busStop.findMany.mockResolvedValue([
        { id: 'stop-2', code: 'BS-02', name: 'Trạm B', latitude: 21.0, longitude: 105.80005 },
      ]);

      await expect(
        service.update('stop-1', { latitude: 21.0, longitude: 105.80004 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update bus stop successfully with new valid coordinates', async () => {
      const currentStop = { id: 'stop-1', code: 'BS-01', name: 'Trạm A', latitude: 21.0, longitude: 105.8 };
      mockPrismaService.busStop.findFirst.mockResolvedValue(currentStop);
      mockPrismaService.busStop.findMany.mockResolvedValue([
        { id: 'stop-2', code: 'BS-02', name: 'Trạm B', latitude: 21.5, longitude: 106.0 },
      ]);
      mockPrismaService.busStop.update.mockResolvedValue({
        ...currentStop,
        latitude: 21.2,
        longitude: 105.9,
      });

      const result = await service.update('stop-1', { latitude: 21.2, longitude: 105.9 });
      expect(result.latitude).toBe(21.2);
    });
  });

  describe('remove', () => {
    it('should soft delete bus stop if not used in any route', async () => {
      const stop = { id: 'stop-1', code: 'BS-01', name: 'Trạm A', deletedAt: null };
      mockPrismaService.busStop.findFirst.mockResolvedValue(stop);
      mockPrismaService.routeStop.count.mockResolvedValue(0);
      mockPrismaService.busStop.update.mockResolvedValue({ ...stop, deletedAt: new Date() });

      const result = await service.remove('stop-1');
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if bus stop is currently used in a route', async () => {
      const stop = { id: 'stop-1', code: 'BS-01', name: 'Trạm A', deletedAt: null };
      mockPrismaService.busStop.findFirst.mockResolvedValue(stop);
      mockPrismaService.routeStop.count.mockResolvedValue(2);

      await expect(service.remove('stop-1')).rejects.toThrow(BadRequestException);
    });
  });
});
