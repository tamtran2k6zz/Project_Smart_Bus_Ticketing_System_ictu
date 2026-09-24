import { Test, TestingModule } from '@nestjs/testing';
import { RoutesService } from './routes.service';
import { PrismaService } from '../database/prisma.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { RouteStatus } from '@prisma/client';

describe('RoutesService', () => {
  let service: RoutesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    route: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    tripSchedule: {
      count: jest.fn(),
    },
    busStop: {
      findFirst: jest.fn(),
    },
    routeStop: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((cbOrPromises) => {
      if (typeof cbOrPromises === 'function') {
        return cbOrPromises(mockPrismaService);
      }
      return Promise.all(cbOrPromises);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RoutesService>(RoutesService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a route', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue(null);
      mockPrismaService.route.create.mockResolvedValue({
        id: 'route-1',
        code: 'BUS-01',
        name: 'Tuyến 1',
      });

      const dto = { code: 'BUS-01', name: 'Tuyến 1' };
      const result = await service.create(dto);
      expect(result).toEqual(expect.objectContaining({ id: 'route-1', code: 'BUS-01' }));
    });

    it('should throw ConflictException if route code already exists', async () => {
      mockPrismaService.route.findUnique.mockResolvedValue({ id: 'route-1', code: 'BUS-01' });

      const dto = { code: 'BUS-01', name: 'Tuyến 1' };
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all routes without query filters', async () => {
      const routes = [{ id: 'route-1', code: 'BUS-01', name: 'Tuyến 1' }];
      mockPrismaService.route.findMany.mockResolvedValue(routes);

      const result = await service.findAll();
      expect(result).toEqual(routes);
      expect(mockPrismaService.route.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
    });

    it('should filter routes by search query and status', async () => {
      const routes = [{ id: 'route-1', code: 'BUS-01', name: 'Tuyến 1' }];
      mockPrismaService.route.findMany.mockResolvedValue(routes);

      const result = await service.findAll('Tuyến', 'ACTIVE');
      expect(result).toEqual(routes);
      expect(mockPrismaService.route.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            status: 'ACTIVE',
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return route details if found', async () => {
      const route = { id: 'route-1', code: 'BUS-01', name: 'Tuyến 1', deletedAt: null };
      mockPrismaService.route.findFirst.mockResolvedValue(route);

      const result = await service.findOne('route-1');
      expect(result).toEqual(route);
    });

    it('should throw NotFoundException if route not found', async () => {
      mockPrismaService.route.findFirst.mockResolvedValue(null);

      await expect(service.findOne('invalid-route')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update route successfully', async () => {
      const route = { id: 'route-1', code: 'BUS-01', name: 'Tuyến 1', deletedAt: null };
      mockPrismaService.route.findFirst.mockResolvedValue(route);
      mockPrismaService.route.update.mockResolvedValue({ ...route, name: 'Tuyến 1 Cập Nhật' });

      const result = await service.update('route-1', { name: 'Tuyến 1 Cập Nhật' });
      expect(result.name).toBe('Tuyến 1 Cập Nhật');
    });

    it('should throw ConflictException if new code already exists', async () => {
      const route = { id: 'route-1', code: 'BUS-01', name: 'Tuyến 1', deletedAt: null };
      mockPrismaService.route.findFirst.mockResolvedValue(route);
      mockPrismaService.route.findUnique.mockResolvedValue({ id: 'route-2', code: 'BUS-02' });

      await expect(service.update('route-1', { code: 'BUS-02' })).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when activating route with less than 2 stops', async () => {
      const route = { id: 'route-1', code: 'BUS-01', name: 'Tuyến 1', deletedAt: null };
      mockPrismaService.route.findFirst.mockResolvedValue(route);
      mockPrismaService.routeStop.count.mockResolvedValue(1);

      await expect(
        service.update('route-1', { status: RouteStatus.ACTIVE }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should succeed activating route with 2 or more stops', async () => {
      const route = { id: 'route-1', code: 'BUS-01', name: 'Tuyến 1', deletedAt: null };
      mockPrismaService.route.findFirst.mockResolvedValue(route);
      mockPrismaService.routeStop.count.mockResolvedValue(3);
      mockPrismaService.route.update.mockResolvedValue({ ...route, status: RouteStatus.ACTIVE });

      const result = await service.update('route-1', { status: RouteStatus.ACTIVE });
      expect(result.status).toBe(RouteStatus.ACTIVE);
    });
  });

  describe('remove', () => {
    it('should soft delete route if no active trips exist', async () => {
      const route = { id: 'route-1', code: 'BUS-01', name: 'Tuyến 1', deletedAt: null };
      mockPrismaService.route.findFirst.mockResolvedValue(route);
      mockPrismaService.tripSchedule.count.mockResolvedValue(0);
      mockPrismaService.route.update.mockResolvedValue({ ...route, deletedAt: new Date() });

      const result = await service.remove('route-1');
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if active trips exist', async () => {
      const route = { id: 'route-1', code: 'BUS-01', name: 'Tuyến 1', deletedAt: null };
      mockPrismaService.route.findFirst.mockResolvedValue(route);
      mockPrismaService.tripSchedule.count.mockResolvedValue(3);

      await expect(service.remove('route-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('addStopToRoute', () => {
    it('should throw NotFoundException if bus stop does not exist or is inactive', async () => {
      const route = { id: 'route-1', code: 'BUS-01', name: 'Tuyến 1', deletedAt: null };
      mockPrismaService.route.findFirst.mockResolvedValue(route);
      mockPrismaService.busStop.findFirst.mockResolvedValue(null);

      await expect(
        service.addStopToRoute('route-1', { stopId: 'stop-invalid', orderIndex: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if bus stop is already in route', async () => {
      const route = { id: 'route-1', code: 'BUS-01', name: 'Tuyến 1', deletedAt: null };
      mockPrismaService.route.findFirst.mockResolvedValue(route);
      mockPrismaService.busStop.findFirst.mockResolvedValue({ id: 'stop-1', name: 'Trạm 1' });
      mockPrismaService.routeStop.findFirst.mockResolvedValueOnce({ id: 'rs-1', routeId: 'route-1', stopId: 'stop-1' });

      await expect(
        service.addStopToRoute('route-1', { stopId: 'stop-1', orderIndex: 1 }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if orderIndex already exists in route', async () => {
      const route = { id: 'route-1', code: 'BUS-01', name: 'Tuyến 1', deletedAt: null };
      mockPrismaService.route.findFirst.mockResolvedValue(route);
      mockPrismaService.busStop.findFirst.mockResolvedValue({ id: 'stop-1', name: 'Trạm 1' });
      mockPrismaService.routeStop.findFirst
        .mockResolvedValueOnce(null) // no existing stop
        .mockResolvedValueOnce({ id: 'rs-existing-order', orderIndex: 1 }); // existing order

      await expect(
        service.addStopToRoute('route-1', { stopId: 'stop-1', orderIndex: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully add stop to route', async () => {
      const route = { id: 'route-1', code: 'BUS-01', name: 'Tuyến 1', deletedAt: null };
      mockPrismaService.route.findFirst.mockResolvedValue(route);
      mockPrismaService.busStop.findFirst.mockResolvedValue({ id: 'stop-1', name: 'Trạm 1' });
      mockPrismaService.routeStop.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrismaService.routeStop.create.mockResolvedValue({
        id: 'rs-new',
        routeId: 'route-1',
        stopId: 'stop-1',
        orderIndex: 1,
      });

      const result = await service.addStopToRoute('route-1', { stopId: 'stop-1', orderIndex: 1 });
      expect(result).toEqual(expect.objectContaining({ id: 'rs-new', stopId: 'stop-1' }));
    });
  });

  describe('removeStopFromRoute', () => {
    it('should throw NotFoundException if stop is not in route', async () => {
      const route = { id: 'route-1', code: 'BUS-01', name: 'Tuyến 1', deletedAt: null };
      mockPrismaService.route.findFirst.mockResolvedValue(route);
      mockPrismaService.routeStop.findFirst.mockResolvedValue(null);

      await expect(service.removeStopFromRoute('route-1', 'stop-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if route has <= 2 stops', async () => {
      const route = { id: 'route-1', code: 'BUS-01', name: 'Tuyến 1', deletedAt: null };
      mockPrismaService.route.findFirst.mockResolvedValue(route);
      mockPrismaService.routeStop.findFirst.mockResolvedValue({ id: 'rs-1', routeId: 'route-1', stopId: 'stop-1' });
      mockPrismaService.routeStop.count.mockResolvedValue(2);

      await expect(service.removeStopFromRoute('route-1', 'stop-1')).rejects.toThrow(BadRequestException);
    });

    it('should delete stop from route if total stops > 2', async () => {
      const route = { id: 'route-1', code: 'BUS-01', name: 'Tuyến 1', deletedAt: null };
      mockPrismaService.route.findFirst.mockResolvedValue(route);
      mockPrismaService.routeStop.findFirst.mockResolvedValue({ id: 'rs-1', routeId: 'route-1', stopId: 'stop-1' });
      mockPrismaService.routeStop.count.mockResolvedValue(4);
      mockPrismaService.routeStop.delete.mockResolvedValue({ id: 'rs-1' });

      const result = await service.removeStopFromRoute('route-1', 'stop-1');
      expect(result).toEqual({ id: 'rs-1' });
    });
  });

  describe('reorderStops', () => {
    it('should throw BadRequestException if less than 2 stops provided', async () => {
      const route = { id: 'route-1', code: 'BUS-01', name: 'Tuyến 1', deletedAt: null };
      mockPrismaService.route.findFirst.mockResolvedValue(route);

      const reorderDto = {
        stops: [{ stopId: 'stop-1', orderIndex: 1 }],
      };

      await expect(service.reorderStops('route-1', reorderDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if duplicate orderIndex provided', async () => {
      const route = { id: 'route-1', code: 'BUS-01', name: 'Tuyến 1', deletedAt: null };
      mockPrismaService.route.findFirst.mockResolvedValue(route);

      const reorderDto = {
        stops: [
          { stopId: 'stop-1', orderIndex: 1 },
          { stopId: 'stop-2', orderIndex: 1 },
        ],
      };

      await expect(service.reorderStops('route-1', reorderDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if stop IDs do not match route current stops', async () => {
      const route = { id: 'route-1', code: 'BUS-01', name: 'Tuyến 1', deletedAt: null };
      mockPrismaService.route.findFirst.mockResolvedValue(route);
      mockPrismaService.routeStop.findMany.mockResolvedValue([
        { id: 'rs-1', stopId: 'stop-1', orderIndex: 1 },
        { id: 'rs-2', stopId: 'stop-2', orderIndex: 2 },
      ]);

      const reorderDto = {
        stops: [
          { stopId: 'stop-1', orderIndex: 2 },
          { stopId: 'stop-999', orderIndex: 1 },
        ],
      };

      await expect(service.reorderStops('route-1', reorderDto)).rejects.toThrow(BadRequestException);
    });

    it('should successfully reorder stops inside transaction and update terminal stops', async () => {
      const route = {
        id: 'route-1',
        code: 'BUS-01',
        name: 'Tuyến 1',
        deletedAt: null,
        routeStops: [],
      };
      mockPrismaService.route.findFirst.mockResolvedValue(route);
      mockPrismaService.routeStop.findMany.mockResolvedValue([
        { id: 'rs-1', stopId: 'stop-1', orderIndex: 1 },
        { id: 'rs-2', stopId: 'stop-2', orderIndex: 2 },
      ]);
      mockPrismaService.routeStop.update.mockResolvedValue({});

      const reorderDto = {
        stops: [
          { stopId: 'stop-1', orderIndex: 2 },
          { stopId: 'stop-2', orderIndex: 1 },
        ],
      };

      const result = await service.reorderStops('route-1', reorderDto);
      expect(result).toBeDefined();
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });
});
