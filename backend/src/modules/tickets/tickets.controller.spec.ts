import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TicketDetailDto } from './dto/ticket-detail.dto';

describe('TicketsController', () => {
  let controller: TicketsController;
  let service: TicketsService;

  const mockTicketDetail: TicketDetailDto = {
    ticket_code: 'TKT-ICTU-8888',
    seat_code: 'A08',
    price: 10000,
    status: 'BOOKED',
    passenger_name: 'Lê Thị Hành Khách',
    route_name: 'Bến xe Mỹ Đình - Bến xe Long Biên',
    origin_stop: 'Bến xe Mỹ Đình',
    destination_stop: 'Bến xe Long Biên',
    departure_time: new Date('2026-10-01T06:30:00Z').toISOString(),
    arrival_time: new Date('2026-10-01T07:15:00Z').toISOString(),
    bus_plate_number: '29B-188.22',
    bus_type: 'STANDARD',
    driver_name: 'Bác tài Nguyễn Văn Lái',
    driver_phone: '0987654321',
    qr_code_base64: 'data:image/png;base64,MOCK_QR_DATA_URL==',
  };

  const mockTicketsService = {
    getTicketByCode: jest.fn().mockResolvedValue(mockTicketDetail),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [{ provide: TicketsService, useValue: mockTicketsService }],
    })
      // Bỏ qua JWT Guard trong unit test controller (chỉ test logic handler).
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TicketsController>(TicketsController);
    service = module.get<TicketsService>(TicketsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTicketDetail', () => {
    it('GET :ticket_code trả về chi tiết vé điện tử', async () => {
      const result = await controller.getTicketDetail('TKT-ICTU-8888');

      expect(service.getTicketByCode).toHaveBeenCalledWith('TKT-ICTU-8888');
      expect(result).toEqual(mockTicketDetail);
    });

    it('Ủy quyền NotFoundException từ service khi mã vé không tồn tại', async () => {
      mockTicketsService.getTicketByCode.mockRejectedValueOnce(
        new NotFoundException('Vé điện tử không tồn tại'),
      );

      await expect(controller.getTicketDetail('KHONG-TON-TAI')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
