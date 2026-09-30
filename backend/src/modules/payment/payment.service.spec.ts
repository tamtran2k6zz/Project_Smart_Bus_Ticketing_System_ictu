import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { VNPayService } from './services/vnpay.service';
import { MoMoService } from './services/momo.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  CreatePaymentDto,
  VNPayIpnDto,
  MoMoIpnDto,
} from './dto/payment.dto';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: any;
  let redisService: any;
  let vnpayService: any;
  let momoService: any;

  const mockBooking = {
    id: 'b1111111-1111-1111-1111-111111111111',
    userId: 'u1111111-1111-1111-1111-111111111111',
    tripId: 't1111111-1111-1111-1111-111111111111',
    seatNumbers: ['A01', 'A02'],
    totalAmount: 150000,
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    qrCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPayment = {
    id: 'p1111111-1111-1111-1111-111111111111',
    bookingId: mockBooking.id,
    paymentMethod: PaymentMethod.VNPAY,
    transactionNo: null,
    amount: 150000,
    currency: 'VND',
    status: PaymentStatus.PENDING,
    paymentUrl: null,
    rawResponse: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    booking: mockBooking,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      booking: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) =>
        callback({
          payment: { update: jest.fn().mockResolvedValue(mockPayment) },
          booking: { update: jest.fn().mockResolvedValue(mockBooking) },
        }),
      ),
    };

    const mockRedisService = {
      acquireLock: jest.fn().mockResolvedValue(true),
      releaseLock: jest.fn().mockResolvedValue(true),
    };

    const mockVNPayService = {
      createPaymentUrl: jest.fn().mockReturnValue('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=123'),
      verifyChecksum: jest.fn().mockReturnValue(true),
    };

    const mockMoMoService = {
      createPaymentUrl: jest.fn().mockResolvedValue('https://test-payment.momo.vn/v2/gateway/pay?s=123'),
      verifyChecksum: jest.fn().mockReturnValue(true),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'FRONTEND_URL') return 'http://localhost:5173';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: VNPayService, useValue: mockVNPayService },
        { provide: MoMoService, useValue: mockMoMoService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prisma = module.get(PrismaService);
    redisService = module.get(RedisService);
    vnpayService = module.get(VNPayService);
    momoService = module.get(MoMoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentUrl', () => {
    it('Tạo URL thanh toán VNPay thành công với signature hợp lệ', async () => {
      prisma.booking.findUnique.mockResolvedValue(mockBooking);
      prisma.payment.create.mockResolvedValue({
        ...mockPayment,
        id: 'pay-vnpay-01',
        paymentMethod: PaymentMethod.VNPAY,
      });
      prisma.payment.update.mockResolvedValue({
        ...mockPayment,
        paymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?mock=true',
      });

      const dto: CreatePaymentDto = {
        booking_id: mockBooking.id,
        payment_method: PaymentMethod.VNPAY,
        bank_code: 'NCB',
      };

      const result = await service.createPaymentUrl(dto, '192.168.1.1');

      expect(prisma.booking.findUnique).toHaveBeenCalledWith({ where: { id: dto.booking_id } });
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bookingId: mockBooking.id,
            paymentMethod: PaymentMethod.VNPAY,
            status: 'PENDING',
          }),
        }),
      );
      expect(vnpayService.createPaymentUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'pay-vnpay-01',
          amount: 150000,
          bankCode: 'NCB',
        }),
      );
      expect(result).toHaveProperty('payment_url');
      expect(result.booking_id).toBe(mockBooking.id);
      expect(result.amount).toBe(150000);
    });

    it('Tạo URL thanh toán MoMo thành công với signature hợp lệ', async () => {
      prisma.booking.findUnique.mockResolvedValue(mockBooking);
      prisma.payment.create.mockResolvedValue({
        ...mockPayment,
        id: 'pay-momo-01',
        paymentMethod: PaymentMethod.MOMO,
      });
      prisma.payment.update.mockResolvedValue({
        ...mockPayment,
        paymentUrl: 'https://test-payment.momo.vn/v2/gateway/pay?s=123',
      });

      const dto: CreatePaymentDto = {
        booking_id: mockBooking.id,
        payment_method: PaymentMethod.MOMO,
      };

      const result = await service.createPaymentUrl(dto);

      expect(prisma.booking.findUnique).toHaveBeenCalledWith({ where: { id: dto.booking_id } });
      expect(momoService.createPaymentUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'pay-momo-01',
          amount: 150000,
        }),
      );
      expect(result.payment_method).toBe(PaymentMethod.MOMO);
      expect(result.payment_url).toContain('momo.vn');
    });

    it('Báo lỗi khi booking_id không tồn tại (NotFoundException)', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);

      const dto: CreatePaymentDto = {
        booking_id: 'non-existing-id',
        payment_method: PaymentMethod.VNPAY,
      };

      await expect(service.createPaymentUrl(dto)).rejects.toThrow(NotFoundException);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('Báo lỗi khi booking không ở trạng thái PENDING (đã CONFIRMED hoặc CANCELLED)', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: 'CONFIRMED',
      });

      const dto: CreatePaymentDto = {
        booking_id: mockBooking.id,
        payment_method: PaymentMethod.VNPAY,
      };

      await expect(service.createPaymentUrl(dto)).rejects.toThrow(BadRequestException);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('Báo lỗi khi thời gian giữ chỗ 10 phút đã hết hạn (expiresAt < now)', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      const dto: CreatePaymentDto = {
        booking_id: mockBooking.id,
        payment_method: PaymentMethod.VNPAY,
      };

      await expect(service.createPaymentUrl(dto)).rejects.toThrow(BadRequestException);
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: mockBooking.id },
        data: { status: 'EXPIRED' },
      });
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });
  });

  describe('handleVNPayIpn', () => {
    const validVNPayQuery: VNPayIpnDto = {
      vnp_TmnCode: 'TESTTMN01',
      vnp_Amount: '15000000', // 150000 * 100
      vnp_BankCode: 'NCB',
      vnp_BankTranNo: 'VNP12345678',
      vnp_CardType: 'ATM',
      vnp_PayDate: '20260930100000',
      vnp_OrderInfo: 'Thanh toan ve xe',
      vnp_TransactionNo: '14523689',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: mockPayment.id,
      vnp_SecureHash: 'VALID_HASH_512',
    };

    it('Xử lý IPN với Chữ ký không hợp lệ (Invalid Signature) -> trả về RspCode 97', async () => {
      vnpayService.verifyChecksum.mockReturnValue(false);

      const result = await service.handleVNPayIpn(validVNPayQuery);

      expect(result).toEqual({ RspCode: '97', Message: 'Invalid Checksum' });
      expect(redisService.acquireLock).not.toHaveBeenCalled();
      expect(prisma.payment.findUnique).not.toHaveBeenCalled();
    });

    it('Xử lý IPN thành công và cập nhật đúng trạng thái Booking/Payment (RspCode 00)', async () => {
      vnpayService.verifyChecksum.mockReturnValue(true);
      prisma.payment.findUnique.mockResolvedValue(mockPayment);

      const result = await service.handleVNPayIpn(validVNPayQuery);

      expect(result).toEqual({ RspCode: '00', Message: 'Confirm Success' });
      expect(redisService.acquireLock).toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(redisService.releaseLock).toHaveBeenCalled();
    });

    it('Xử lý Idempotent IPN: Gửi IPN lặp lại 2 lần cho đơn đã xử lý -> trả về RspCode 02', async () => {
      vnpayService.verifyChecksum.mockReturnValue(true);
      prisma.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatusEnum.SUCCESS, // Already confirmed previously!
      });

      const result = await service.handleVNPayIpn(validVNPayQuery);

      expect(result).toEqual({ RspCode: '02', Message: 'Order already confirmed' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(redisService.releaseLock).toHaveBeenCalled();
    });

    it('Trả về RspCode 01 nếu không tìm thấy Payment theo TxnRef', async () => {
      vnpayService.verifyChecksum.mockReturnValue(true);
      prisma.payment.findUnique.mockResolvedValue(null);

      const result = await service.handleVNPayIpn(validVNPayQuery);

      expect(result).toEqual({ RspCode: '01', Message: 'Order not found' });
      expect(redisService.releaseLock).toHaveBeenCalled();
    });

    it('Trả về RspCode 04 nếu số tiền không khớp', async () => {
      vnpayService.verifyChecksum.mockReturnValue(true);
      prisma.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        amount: 200000, // Different from 150000
      });

      const result = await service.handleVNPayIpn(validVNPayQuery);

      expect(result).toEqual({ RspCode: '04', Message: 'Invalid amount' });
    });

    it('Xử lý IPN khi giao dịch thất bại (ResponseCode != 00): Cập nhật FAILED và CANCELLED booking', async () => {
      vnpayService.verifyChecksum.mockReturnValue(true);
      prisma.payment.findUnique.mockResolvedValue(mockPayment);

      const failedQuery: VNPayIpnDto = {
        ...validVNPayQuery,
        vnp_ResponseCode: '24', // User cancelled transaction
      };

      const result = await service.handleVNPayIpn(failedQuery);

      expect(result).toEqual({ RspCode: '00', Message: 'Confirm Success' });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('handleMoMoIpn', () => {
    const validMoMoPayload: MoMoIpnDto = {
      partnerCode: 'MOMO',
      orderId: mockPayment.id,
      requestId: 'req-001',
      amount: 150000,
      orderInfo: 'Thanh toan ve xe',
      orderType: 'momo_wallet',
      transId: 230918239,
      resultCode: 0,
      message: 'Thành công',
      payType: 'qr',
      responseTime: 1696070000,
      extraData: '',
      signature: 'VALID_MOMO_SIG',
    };

    it('Xử lý MoMo IPN với chữ ký không hợp lệ -> ném lỗi BadRequestException', async () => {
      momoService.verifyChecksum.mockReturnValue(false);

      await expect(service.handleMoMoIpn(validMoMoPayload)).rejects.toThrow(BadRequestException);
      expect(prisma.payment.findUnique).not.toHaveBeenCalled();
    });

    it('Xử lý MoMo IPN thành công và cập nhật đúng trạng thái Booking/Payment', async () => {
      momoService.verifyChecksum.mockReturnValue(true);
      prisma.payment.findUnique.mockResolvedValue(mockPayment);

      const result = await service.handleMoMoIpn(validMoMoPayload);

      expect(result.resultCode).toBe(0);
      expect(result.message).toBe('Confirm Success');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(redisService.releaseLock).toHaveBeenCalled();
    });

    it('Xử lý Idempotent MoMo IPN: Đơn hàng đã xử lý trước đó -> Trả về resultCode 0 mà không ghi đè DB', async () => {
      momoService.verifyChecksum.mockReturnValue(true);
      prisma.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS, // Already processed
      });

      const result = await service.handleMoMoIpn(validMoMoPayload);

      expect(result.resultCode).toBe(0);
      expect(result.message).toBe('Order already processed');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('Xử lý MoMo IPN thất bại (resultCode != 0): Cập nhật FAILED và CANCELLED booking', async () => {
      momoService.verifyChecksum.mockReturnValue(true);
      prisma.payment.findUnique.mockResolvedValue(mockPayment);

      const failedPayload: MoMoIpnDto = {
        ...validMoMoPayload,
        resultCode: 1006, // User cancelled transaction
        message: 'Giao dịch bị từ chối bởi người dùng',
      };

      const result = await service.handleMoMoIpn(failedPayload);

      expect(result.resultCode).toBe(0);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('handleVNPayReturn & handleMoMoReturn', () => {
    it('Xử lý VNPay Return thành công chuyển hướng về /booking/success', async () => {
      vnpayService.verifyChecksum.mockReturnValue(true);
      prisma.payment.findUnique.mockResolvedValue(mockPayment);

      const result = await service.handleVNPayReturn({
        vnp_TxnRef: mockPayment.id,
        vnp_ResponseCode: '00',
        vnp_TransactionNo: '123456',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.redirectUrl).toContain('/booking/success');
      expect(result.redirectUrl).toContain(`bookingId=${mockBooking.id}`);
    });

    it('Xử lý MoMo Return thất bại chuyển hướng về /booking/failed', async () => {
      prisma.payment.findUnique.mockResolvedValue(mockPayment);

      const result = await service.handleMoMoReturn({
        orderId: mockPayment.id,
        resultCode: '1006',
        transId: '999',
      });

      expect(result.isSuccess).toBe(false);
      expect(result.redirectUrl).toContain('/booking/failed');
    });
  });
});

