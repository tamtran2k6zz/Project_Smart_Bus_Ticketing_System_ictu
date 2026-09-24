import { Test, TestingModule } from '@nestjs/testing';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { FaresService } from '../fares/fares.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

describe('RoutesController', () => {
  let controller: RoutesController;
  let routesService: RoutesService;
  let faresService: FaresService;

  const mockRoutesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addStopToRoute: jest.fn(),
    removeStopFromRoute: jest.fn(),
    reorderStops: jest.fn(),
  };

  const mockFaresService = {
    create: jest.fn(),
    updateRouteFare: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoutesController],
      providers: [
        { provide: RoutesService, useValue: mockRoutesService },
        { provide: FaresService, useValue: mockFaresService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RoutesController>(RoutesController);
    routesService = module.get<RoutesService>(RoutesService);
    faresService = module.get<FaresService>(FaresService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call routesService.create', async () => {
    const dto = { code: 'BUS-01', name: 'Tuyến 1' };
    mockRoutesService.create.mockResolvedValue({ id: 'route-1', ...dto });

    const result = await controller.create(dto);
    expect(result).toEqual({ id: 'route-1', ...dto });
    expect(mockRoutesService.create).toHaveBeenCalledWith(dto);
  });

  it('should call routesService.findAll', async () => {
    mockRoutesService.findAll.mockResolvedValue([]);
    const result = await controller.findAll('BUS', 'ACTIVE');
    expect(result).toEqual([]);
    expect(mockRoutesService.findAll).toHaveBeenCalledWith('BUS', 'ACTIVE');
  });

  it('should call routesService.findOne', async () => {
    mockRoutesService.findOne.mockResolvedValue({ id: 'route-1' });
    const result = await controller.findOne('route-1');
    expect(result).toEqual({ id: 'route-1' });
    expect(mockRoutesService.findOne).toHaveBeenCalledWith('route-1');
  });

  it('should call routesService.update', async () => {
    mockRoutesService.update.mockResolvedValue({ id: 'route-1', name: 'New' });
    const result = await controller.update('route-1', { name: 'New' });
    expect(result).toEqual({ id: 'route-1', name: 'New' });
    expect(mockRoutesService.update).toHaveBeenCalledWith('route-1', { name: 'New' });
  });

  it('should call routesService.remove', async () => {
    mockRoutesService.remove.mockResolvedValue({ id: 'route-1' });
    const result = await controller.remove('route-1');
    expect(result).toEqual({ id: 'route-1' });
    expect(mockRoutesService.remove).toHaveBeenCalledWith('route-1');
  });

  it('should call routesService.addStopToRoute', async () => {
    const dto = { stopId: 'stop-1', orderIndex: 1 };
    mockRoutesService.addStopToRoute.mockResolvedValue({ id: 'rs-1' });
    const result = await controller.addStop('route-1', dto);
    expect(result).toEqual({ id: 'rs-1' });
    expect(mockRoutesService.addStopToRoute).toHaveBeenCalledWith('route-1', dto);
  });

  it('should call routesService.removeStopFromRoute', async () => {
    mockRoutesService.removeStopFromRoute.mockResolvedValue({ id: 'rs-1' });
    const result = await controller.removeStop('route-1', 'stop-1');
    expect(result).toEqual({ id: 'rs-1' });
    expect(mockRoutesService.removeStopFromRoute).toHaveBeenCalledWith('route-1', 'stop-1');
  });

  it('should call routesService.reorderStops', async () => {
    const dto = { stops: [{ stopId: 'stop-1', orderIndex: 1 }, { stopId: 'stop-2', orderIndex: 2 }] };
    mockRoutesService.reorderStops.mockResolvedValue({ id: 'route-1' });
    const result = await controller.reorderStops('route-1', dto);
    expect(result).toEqual({ id: 'route-1' });
    expect(mockRoutesService.reorderStops).toHaveBeenCalledWith('route-1', dto);
  });

  it('should call faresService.create for createRouteFare', async () => {
    const dto = { amount: 7000 };
    mockFaresService.create.mockResolvedValue({ id: 'fare-1' });
    const result = await controller.createRouteFare('route-1', dto);
    expect(result).toEqual({ id: 'fare-1' });
    expect(mockFaresService.create).toHaveBeenCalledWith({ ...dto, routeId: 'route-1' });
  });

  it('should call faresService.updateRouteFare', async () => {
    const dto = { amount: 8000 };
    mockFaresService.updateRouteFare.mockResolvedValue({ id: 'fare-1', amount: 8000 });
    const result = await controller.updateRouteFare('route-1', 'fare-1', dto);
    expect(result).toEqual({ id: 'fare-1', amount: 8000 });
    expect(mockFaresService.updateRouteFare).toHaveBeenCalledWith('route-1', 'fare-1', dto);
  });

  it('should call faresService.findAll for getRouteFares', async () => {
    mockFaresService.findAll.mockResolvedValue([]);
    const result = await controller.getRouteFares('route-1');
    expect(result).toEqual([]);
    expect(mockFaresService.findAll).toHaveBeenCalledWith('route-1');
  });
});
