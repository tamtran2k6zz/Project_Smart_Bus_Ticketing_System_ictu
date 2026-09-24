import { Test, TestingModule } from '@nestjs/testing';
import { FaresController } from './fares.controller';
import { FaresService } from './fares.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

describe('FaresController', () => {
  let controller: FaresController;
  let service: FaresService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FaresController],
      providers: [{ provide: FaresService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FaresController>(FaresController);
    service = module.get<FaresService>(FaresService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service.create', async () => {
    const dto = { routeId: 'route-1', amount: 7000 };
    mockService.create.mockResolvedValue({ id: 'fare-1', ...dto });
    const result = await controller.create(dto as any);
    expect(result).toEqual({ id: 'fare-1', ...dto });
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('should call service.findAll', async () => {
    mockService.findAll.mockResolvedValue([]);
    const result = await controller.findAll('route-1');
    expect(result).toEqual([]);
    expect(mockService.findAll).toHaveBeenCalledWith('route-1');
  });

  it('should call service.findOne', async () => {
    mockService.findOne.mockResolvedValue({ id: 'fare-1' });
    const result = await controller.findOne('fare-1');
    expect(result).toEqual({ id: 'fare-1' });
    expect(mockService.findOne).toHaveBeenCalledWith('fare-1');
  });

  it('should call service.update', async () => {
    mockService.update.mockResolvedValue({ id: 'fare-1', amount: 9000 });
    const result = await controller.update('fare-1', { amount: 9000 });
    expect(result).toEqual({ id: 'fare-1', amount: 9000 });
    expect(mockService.update).toHaveBeenCalledWith('fare-1', { amount: 9000 });
  });

  it('should call service.remove', async () => {
    mockService.remove.mockResolvedValue({ id: 'fare-1' });
    const result = await controller.remove('fare-1');
    expect(result).toEqual({ id: 'fare-1' });
    expect(mockService.remove).toHaveBeenCalledWith('fare-1');
  });
});
