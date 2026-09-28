import { Test, TestingModule } from '@nestjs/testing';
import { BusStopsController } from './bus-stops.controller';
import { BusStopsService } from './bus-stops.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

describe('BusStopsController', () => {
  let controller: BusStopsController;
  let service: BusStopsService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusStopsController],
      providers: [{ provide: BusStopsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BusStopsController>(BusStopsController);
    service = module.get<BusStopsService>(BusStopsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service.create', async () => {
    const dto = { code: 'BS-01', name: 'Trạm 1', address: 'HN', latitude: 21.0, longitude: 105.8 };
    mockService.create.mockResolvedValue({ id: 'stop-1', ...dto });
    const result = await controller.create(dto);
    expect(result).toEqual({ id: 'stop-1', ...dto });
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('should call service.findAll', async () => {
    mockService.findAll.mockResolvedValue([]);
    const result = await controller.findAll('Trạm', 'true');
    expect(result).toEqual([]);
    expect(mockService.findAll).toHaveBeenCalledWith('Trạm', true);
  });

  it('should call service.findOne', async () => {
    mockService.findOne.mockResolvedValue({ id: 'stop-1' });
    const result = await controller.findOne('stop-1');
    expect(result).toEqual({ id: 'stop-1' });
    expect(mockService.findOne).toHaveBeenCalledWith('stop-1');
  });

  it('should call service.update', async () => {
    mockService.update.mockResolvedValue({ id: 'stop-1', name: 'Updated' });
    const result = await controller.update('stop-1', { name: 'Updated' });
    expect(result).toEqual({ id: 'stop-1', name: 'Updated' });
    expect(mockService.update).toHaveBeenCalledWith('stop-1', { name: 'Updated' });
  });

  it('should call service.remove', async () => {
    mockService.remove.mockResolvedValue({ id: 'stop-1' });
    const result = await controller.remove('stop-1');
    expect(result).toEqual({ id: 'stop-1' });
    expect(mockService.remove).toHaveBeenCalledWith('stop-1');
  });
});
