import { Test, TestingModule } from '@nestjs/testing';
import { FaresService } from './fares.service';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FareType, TicketType } from '@prisma/client';

describe('FaresService', () => {
  let service: FaresService;
  let prisma: PrismaService;

  const mockPrismaService = {
    route: {
      findUnique: jest.fn(),
    },
    routeStop: {
      findFirst: jest.fn(),
    },
    fare: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaresService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FaresService>(FaresService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a flat fare', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue({ id: 'route-1', code: 'BUS-01' });
      mockPrismaService.fare.create.mockResolvedValue({
        id: 'fare-1',
        routeId: 'route-1',
        amount: 7000,
        fareType: FareType.FLAT_FARE,
      });

      const dto = { routeId: 'route-1', amount: 7000, fareType: FareType.FLAT_FARE };
      const result = await service.create(dto as any);
      expect(result).toEqual(expect.objectContaining({ id: 'fare-1', amount: 7000 }));
    });

    it('should throw NotFoundException if route does not exist', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue(null);

      const dto = { routeId: 'invalid-route', amount: 7000 };
      await expect(service.create(dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if amount <= 0', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue({ id: 'route-1' });

      const dto = { routeId: 'route-1', amount: 0 };
      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for stage fare without from/to stops', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue({ id: 'route-1' });

      const dto = {
        routeId: 'route-1',
        amount: 10000,
        fareType: FareType.STAGE_FARE,
      };
      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for stage fare if fromStop and toStop are the same', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue({ id: 'route-1' });

      const dto = {
        routeId: 'route-1',
        amount: 10000,
        fareType: FareType.STAGE_FARE,
        fromStopId: 'stop-1',
        toStopId: 'stop-1',
      };
      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for stage fare if stops do not belong to route', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue({ id: 'route-1' });
      mockPrismaService.routeStop.findFirst.mockResolvedValueOnce({ id: 'rs-1' }).mockResolvedValueOnce(null);

      const dto = {
        routeId: 'route-1',
        amount: 10000,
        fareType: FareType.STAGE_FARE,
        fromStopId: 'stop-1',
        toStopId: 'stop-2',
      };
      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should successfully create a stage fare when both stops are valid', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue({ id: 'route-1' });
      mockPrismaService.routeStop.findFirst.mockResolvedValue({ id: 'rs-1' });
      mockPrismaService.fare.create.mockResolvedValue({
        id: 'fare-stage-1',
        routeId: 'route-1',
        amount: 10000,
        fareType: FareType.STAGE_FARE,
        fromStopId: 'stop-1',
        toStopId: 'stop-2',
      });

      const dto = {
        routeId: 'route-1',
        amount: 10000,
        fareType: FareType.STAGE_FARE,
        fromStopId: 'stop-1',
        toStopId: 'stop-2',
      };
      const result = await service.create(dto as any);
      expect(result).toEqual(expect.objectContaining({ id: 'fare-stage-1', amount: 10000 }));
    });
  });

  describe('findAll', () => {
    it('should return fares list without routeId', async () => {
      const fares = [{ id: 'fare-1', amount: 7000 }];
      mockPrismaService.fare.findMany.mockResolvedValue(fares);

      const result = await service.findAll();
      expect(result).toEqual(fares);
    });

    it('should return fares list filtered by routeId', async () => {
      const fares = [{ id: 'fare-1', amount: 7000, routeId: 'route-1' }];
      mockPrismaService.fare.findMany.mockResolvedValue(fares);

      const result = await service.findAll('route-1');
      expect(result).toEqual(fares);
      expect(mockPrismaService.fare.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null, routeId: 'route-1' } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return fare if found', async () => {
      const fare = { id: 'fare-1', amount: 7000, deletedAt: null };
      mockPrismaService.fare.findFirst.mockResolvedValue(fare);

      const result = await service.findOne('fare-1');
      expect(result).toEqual(fare);
    });

    it('should throw NotFoundException if fare not found', async () => {
      mockPrismaService.fare.findFirst.mockResolvedValue(null);

      await expect(service.findOne('invalid-fare')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should throw BadRequestException if update amount is <= 0', async () => {
      mockPrismaService.fare.findFirst.mockResolvedValue({ id: 'fare-1', amount: 7000 });

      await expect(service.update('fare-1', { amount: -500 })).rejects.toThrow(BadRequestException);
    });

    it('should successfully update fare', async () => {
      const existingFare = { id: 'fare-1', amount: 7000, deletedAt: null };
      mockPrismaService.fare.findFirst.mockResolvedValue(existingFare);
      mockPrismaService.fare.update.mockResolvedValue({ ...existingFare, amount: 8000 });

      const result = await service.update('fare-1', { amount: 8000 });
      expect(result.amount).toBe(8000);
    });
  });

  describe('updateRouteFare', () => {
    it('should throw NotFoundException if fare does not belong to route', async () => {
      mockPrismaService.fare.findFirst.mockResolvedValue(null);

      await expect(
        service.updateRouteFare('route-1', 'fare-99', { amount: 9000 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update route fare successfully if valid', async () => {
      const fare = { id: 'fare-1', routeId: 'route-1', amount: 7000, deletedAt: null };
      mockPrismaService.fare.findFirst.mockResolvedValue(fare);
      mockPrismaService.fare.update.mockResolvedValue({ ...fare, amount: 9000 });

      const result = await service.updateRouteFare('route-1', 'fare-1', { amount: 9000 });
      expect(result.amount).toBe(9000);
    });
  });

  describe('remove', () => {
    it('should soft delete fare', async () => {
      const fare = { id: 'fare-1', amount: 7000, deletedAt: null };
      mockPrismaService.fare.findFirst.mockResolvedValue(fare);
      mockPrismaService.fare.update.mockResolvedValue({ ...fare, deletedAt: new Date() });

      const result = await service.remove('fare-1');
      expect(result).toBeDefined();
    });
  });
});
