import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import {
  CreatePaymentDto,
  PaymentMethodEnum,
  VNPayIpnDto,
  MoMoIpnDto,
} from './dto/payment.dto';
import { Request, Response } from 'express';

describe('PaymentController', () => {
  let controller: PaymentController;
  let service: PaymentService;

  const mockPaymentResponse = {
    payment_id: 'pay-001',
    booking_id: 'book-001',
    payment_method: PaymentMethodEnum.VNPAY,
    amount: 150000,
    currency: 'VND',
    payment_url: 'https://sandbox.vnpayment.vn/test',
    expires_at: new Date(),
  };

  const mockPaymentService = {
    createPaymentUrl: jest.fn().mockResolvedValue(mockPaymentResponse),
    handleVNPayIpn: jest.fn().mockResolvedValue({ RspCode: '00', Message: 'Confirm Success' }),
    handleMoMoIpn: jest.fn().mockResolvedValue({
      partnerCode: 'MOMO',
      requestId: 'req-001',
      orderId: 'pay-001',
      resultCode: 0,
      message: 'Confirm Success',
      responseTime: Date.now(),
      extraData: '',
    }),
    handleVNPayReturn: jest.fn().mockResolvedValue({
      redirectUrl: 'http://localhost:5173/booking/success?bookingId=book-001',
    }),
    handleMoMoReturn: jest.fn().mockResolvedValue({
      redirectUrl: 'http://localhost:5173/booking/success?bookingId=book-001',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [{ provide: PaymentService, useValue: mockPaymentService }],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentUrl', () => {
    it('Khởi tạo thanh toán thành công và trả về URL', async () => {
      const dto: CreatePaymentDto = {
        booking_id: 'b1111111-1111-1111-1111-111111111111',
        payment_method: PaymentMethodEnum.VNPAY,
        bank_code: 'NCB',
      };

      const mockReq = {
        headers: { 'x-forwarded-for': '127.0.0.1' },
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;

      const result = await controller.createPaymentUrl(dto, mockReq);

      expect(service.createPaymentUrl).toHaveBeenCalledWith(dto, '127.0.0.1');
      expect(result).toEqual(mockPaymentResponse);
    });
  });

  describe('handleVNPayIpn', () => {
    it('Nhận query webhook từ VNPay và trả về RspCode 00', async () => {
      const query: VNPayIpnDto = {
        vnp_TmnCode: 'TEST',
        vnp_Amount: '15000000',
        vnp_OrderInfo: 'Test',
        vnp_TransactionNo: '12345',
        vnp_ResponseCode: '00',
        vnp_TxnRef: 'pay-001',
        vnp_SecureHash: 'hash',
      };

      const result = await controller.handleVNPayIpn(query);

      expect(service.handleVNPayIpn).toHaveBeenCalledWith(query);
      expect(result.RspCode).toBe('00');
    });
  });

  describe('handleMoMoIpn', () => {
    it('Nhận POST body từ MoMo và trả về resultCode 0', async () => {
      const body: MoMoIpnDto = {
        partnerCode: 'MOMO',
        orderId: 'pay-001',
        requestId: 'req-001',
        amount: 150000,
        orderInfo: 'Test',
        transId: 12345,
        resultCode: 0,
        message: 'Success',
        responseTime: Date.now(),
        signature: 'sig',
      };

      const result = await controller.handleMoMoIpn(body);

      expect(service.handleMoMoIpn).toHaveBeenCalledWith(body);
      expect(result.resultCode).toBe(0);
    });
  });

  describe('handleVNPayReturn & handleMoMoReturn', () => {
    it('Redirect client khi nhận callback từ VNPay', async () => {
      const mockRes = {
        redirect: jest.fn(),
      } as unknown as Response;

      await controller.handleVNPayReturn({ vnp_TxnRef: 'pay-001' }, mockRes);

      expect(service.handleVNPayReturn).toHaveBeenCalledWith({ vnp_TxnRef: 'pay-001' });
      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:5173/booking/success?bookingId=book-001',
      );
    });

    it('Redirect client khi nhận callback từ MoMo', async () => {
      const mockRes = {
        redirect: jest.fn(),
      } as unknown as Response;

      await controller.handleMoMoReturn({ orderId: 'pay-001' }, mockRes);

      expect(service.handleMoMoReturn).toHaveBeenCalledWith({ orderId: 'pay-001' });
      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:5173/booking/success?bookingId=book-001',
      );
    });
  });
});

