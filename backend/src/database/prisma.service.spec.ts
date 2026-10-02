import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    // Mock prisma connect and disconnect to avoid actual DB connection during unit tests
    jest.spyOn(service, '$connect').mockImplementation(async () => {});
    jest.spyOn(service, '$disconnect').mockImplementation(async () => {});
  });

  it('Kết nối cơ sở dữ liệu khi onModuleInit', async () => {
    await service.onModuleInit();
    expect(service.$connect).toHaveBeenCalled();
  });

  it('Ngắt kết nối cơ sở dữ liệu khi onModuleDestroy', async () => {
    await service.onModuleDestroy();
    expect(service.$disconnect).toHaveBeenCalled();
  });
});

