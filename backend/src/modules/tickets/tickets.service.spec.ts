import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../../database/prisma.service';

// Mock thư viện qrcode để test không phụ thuộc I/O và xác minh có gọi sinh QR.
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,MOCK_QR_DATA_URL=='),
}));

import * as QRCode from 'qrcode';

describe('TicketsService', () => {
  let service: TicketsService;
  let prisma: any;

  const mockTicket = {
    id: 'tkt-001',
    ticketCode: 'TKT-ICTU-8888',
    tripId: 1,
    status: 'BOOKED',
    seatNumber: 'A08',
    userId: 4,
    fareAmount: 10000,
    createdAt: new Date('2026-10-01T05:00:00Z'),
    user: {
      id: 4,
      fullName: 'Lê Thị Hành Khách',
      phoneNumber: '0912345678',
      email: 'khachhang@gmail.com',
    },
    trip: {
      id: 1,
      routeId: 1,
      busId: 'bus-01',
      busPlate: '29B-188.22',
      driverId: 3,
      departureTime: new Date('2026-10-01T06:30:00Z'),
      arrivalTime: new Date('2026-10-01T07:15:00Z'),
      status: 'SCHEDULED',
      bus: { id: 'bus-01', plateNumber: '29B-188.22', busType: 'STANDARD' },
      driver: {
        id: 3,
        fullName: 'Bác tài Nguyễn Văn Lái',
        phoneNumber: '0987654321',
      },
      route: {
        id: 1,
        code: 'R01',
        name: 'Bến xe Mỹ Đình - Bến xe Long Biên',
        routeStops: [
          { id: 1, stopOrder: 1, busStop: { id: 1, code: 'BS-01', name: 'Bến xe Mỹ Đình' } },
          { id: 2, stopOrder: 2, busStop: { id: 2, code: 'BS-02', name: 'ĐH Quốc gia Hà Nội' } },
          { id: 5, stopOrder: 5, busStop: { id: 5, code: 'BS-05', name: 'Bến xe Long Biên' } },
        ],
      },
    },
  };

  beforeEach(async () => {
    const mockPrismaService = {
      ticket: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTicketByCode', () => {
    it('Trả về đầy đủ thông tin chi tiết vé khi mã vé hợp lệ', async () => {
      prisma.ticket.findUnique.mockResolvedValue(mockTicket);

      const result = await service.getTicketByCode('TKT-ICTU-8888');

      expect(prisma.ticket.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ticketCode: 'TKT-ICTU-8888' } }),
      );

      expect(result.ticket_code).toBe('TKT-ICTU-8888');
      expect(result.seat_code).toBe('A08');
      expect(result.price).toBe(10000);
      expect(result.status).toBe('BOOKED');
      expect(result.passenger_name).toBe('Lê Thị Hành Khách');
      expect(result.route_name).toBe('Bến xe Mỹ Đình - Bến xe Long Biên');
      expect(result.origin_stop).toBe('Bến xe Mỹ Đình');
      expect(result.destination_stop).toBe('Bến xe Long Biên');
      expect(result.departure_time).toBe(
        new Date('2026-10-01T06:30:00Z').toISOString(),
      );
      expect(result.arrival_time).toBe(
        new Date('2026-10-01T07:15:00Z').toISOString(),
      );
      expect(result.bus_plate_number).toBe('29B-188.22');
      expect(result.bus_type).toBe('STANDARD');
      expect(result.driver_name).toBe('Bác tài Nguyễn Văn Lái');
      expect(result.driver_phone).toBe('0987654321');
      expect(result.qr_code_base64).toContain('data:image/png;base64');
    });

    it('Ném NotFoundException("Vé điện tử không tồn tại") khi mã vé không tồn tại', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.getTicketByCode('KHONG-TON-TAI')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getTicketByCode('KHONG-TON-TAI')).rejects.toThrow(
        'Vé điện tử không tồn tại',
      );
      expect(QRCode.toDataURL).not.toHaveBeenCalled();
    });

    it('Sinh mã QR Base64 (Data URL) từ thông tin định danh của vé', async () => {
      prisma.ticket.findUnique.mockResolvedValue(mockTicket);

      await service.getTicketByCode('TKT-ICTU-8888');

      expect(QRCode.toDataURL).toHaveBeenCalledTimes(1);
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        expect.stringContaining('TKT-ICTU-8888'),
        expect.objectContaining({ type: 'image/png' }),
      );
    });

    it('Xử lý an toàn khi vé thiếu dữ liệu liên quan (bus/driver/routeStops/user nullable)', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        user: null,
        trip: {
          ...mockTicket.trip,
          bus: null,
          driver: null,
          route: { ...mockTicket.trip.route, routeStops: [] },
        },
      });

      const result = await service.getTicketByCode('TKT-ICTU-8888');

      expect(result.passenger_name).toBe('Khách hàng');
      expect(result.bus_type).toBe('');
      expect(result.driver_name).toBe('');
      expect(result.driver_phone).toBe('');
      expect(result.origin_stop).toBe('');
      expect(result.destination_stop).toBe('');
      // Vẫn trả về biển số xe từ trip.busPlate khi không có quan hệ Bus
      expect(result.bus_plate_number).toBe('29B-188.22');
      expect(result.qr_code_base64).toContain('data:image/png;base64');
    });

    it('Trả về biển số xe từ quan hệ Bus khi trip.busPlate trống', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        trip: { ...mockTicket.trip, busPlate: '' },
      });

      const result = await service.getTicketByCode('TKT-ICTU-8888');
      expect(result.bus_plate_number).toBe('29B-188.22');
    });

    it('Xử lý khi ghế / thời gian / số điện thoại tài xế / tên tuyến bị null', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        seatNumber: null,
        trip: {
          ...mockTicket.trip,
          departureTime: null,
          arrivalTime: null,
          driver: { id: 3, fullName: 'Bác tài', phoneNumber: null },
          route: { ...mockTicket.trip.route, name: null, routeStops: [] },
        },
      });

      const result = await service.getTicketByCode('TKT-ICTU-8888');

      expect(result.seat_code).toBe('');
      expect(result.departure_time).toBe('');
      expect(result.arrival_time).toBe('');
      expect(result.driver_phone).toBe('');
      expect(result.route_name).toBe('');
      expect(result.origin_stop).toBe('');
      expect(result.destination_stop).toBe('');
    });
  });
});
