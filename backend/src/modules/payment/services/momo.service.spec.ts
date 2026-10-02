import { Test, TestingModule } from '@nestjs/testing';
import { MoMoService } from './momo.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { MoMoIpnDto } from '../dto/payment.dto';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MoMoService', () => {
  let service: MoMoService;
  const mockPartnerCode = 'MOMO';
  const mockAccessKey = 'F8BBA842ECF85';
  const mockSecretKey = 'K951B6PE1wa8ngfBWR1nF6o0BmNipd4M';
  const mockEndpoint = 'https://test-payment.momo.vn/v2/gateway/api/create';
  const mockRedirectUrl = 'http://localhost:3000/api/v1/payments/momo-return';
  const mockIpnUrl = 'http://localhost:3000/api/v1/payments/momo-ipn';

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'MOMO_PARTNER_CODE') return mockPartnerCode;
        if (key === 'MOMO_ACCESS_KEY') return mockAccessKey;
        if (key === 'MOMO_SECRET_KEY') return mockSecretKey;
        if (key === 'MOMO_ENDPOINT') return mockEndpoint;
        if (key === 'MOMO_REDIRECT_URL') return mockRedirectUrl;
        if (key === 'MOMO_IPN_URL') return mockIpnUrl;
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoMoService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MoMoService>(MoMoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentUrl', () => {
    it('Gửi POST request đến MoMo Gateway và trả về payUrl thành công', async () => {
      const mockPayUrl = 'https://test-payment.momo.vn/v2/gateway/pay?s=mockedToken';
      const mockQrCodeUrl = 'https://test-payment.momo.vn/v2/gateway/pay/qr?s=mockedToken';
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          partnerCode: mockPartnerCode,
          orderId: 'ORD-MOMO-01',
          requestId: 'REQ-01',
          amount: 150000,
          responseTime: 1696070000,
          message: 'Thành công',
          resultCode: 0,
          payUrl: mockPayUrl,
          qrCodeUrl: mockQrCodeUrl,
        },
      });

      const response = await service.createPaymentUrl({
        orderId: 'ORD-MOMO-01',
        amount: 150000,
        orderInfo: 'Thanh toan ve xe MoMo',
        redirectUrl: 'http://localhost:5173/booking/return',
      });

      expect(response.payUrl).toBe(mockPayUrl);
      expect(response.qrCodeUrl).toBe(mockQrCodeUrl);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockEndpoint,
        expect.objectContaining({
          partnerCode: mockPartnerCode,
          orderId: 'ORD-MOMO-01',
          amount: 150000,
          redirectUrl: 'http://localhost:5173/booking/return',
          signature: expect.any(String),
        }),
        expect.any(Object),
      );
    });

    it('Ném lỗi BadRequestException khi MoMo trả về resultCode != 0', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { resultCode: 1006, message: 'Giao dịch bị từ chối' },
      });

      await expect(
        service.createPaymentUrl({
          orderId: 'ORD-MOMO-03',
          amount: 150000,
          orderInfo: 'Thanh toan ve xe MoMo',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Ném lỗi InternalServerErrorException khi axios gặp lỗi mạng', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        service.createPaymentUrl({
          orderId: 'ORD-MOMO-02',
          amount: 150000,
          orderInfo: 'Thanh toan ve xe MoMo',
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('verifyChecksum', () => {
    it('Xác thực chữ ký MoMo IPN hợp lệ (true)', () => {
      const payload: Partial<MoMoIpnDto> = {
        partnerCode: mockPartnerCode,
        orderId: 'ORD-MOMO-01',
        requestId: 'REQ-01',
        amount: 150000,
        orderInfo: 'Thanh toan ve xe',
        orderType: 'momo_wallet',
        transId: 12345678,
        resultCode: 0,
        message: 'Thành công',
        payType: 'qr',
        responseTime: 1696070000,
        extraData: '',
      };

      const rawSignature =
        `accessKey=${mockAccessKey}` +
        `&amount=${payload.amount}` +
        `&extraData=${payload.extraData}` +
        `&message=${payload.message}` +
        `&orderId=${payload.orderId}` +
        `&orderInfo=${payload.orderInfo}` +
        `&orderType=${payload.orderType}` +
        `&partnerCode=${payload.partnerCode}` +
        `&payType=${payload.payType}` +
        `&requestId=${payload.requestId}` +
        `&responseTime=${payload.responseTime}` +
        `&resultCode=${payload.resultCode}` +
        `&transId=${payload.transId}`;

      const validSignature = crypto.createHmac('sha256', mockSecretKey).update(rawSignature).digest('hex');

      const fullDto: MoMoIpnDto = {
        ...(payload as any),
        signature: validSignature,
      };

      const isValid = service.verifyChecksum(fullDto);
      expect(isValid).toBe(true);
    });

    it('Xác thực thất bại (false) khi chữ ký không khớp hoặc thiếu', () => {
      const invalidDto: MoMoIpnDto = {
        partnerCode: mockPartnerCode,
        orderId: 'ORD-MOMO-01',
        requestId: 'REQ-01',
        amount: 150000,
        orderInfo: 'Thanh toan ve xe',
        orderType: 'momo_wallet',
        transId: 12345678,
        resultCode: 0,
        message: 'Thành công',
        payType: 'qr',
        responseTime: 1696070000,
        extraData: '',
        signature: 'invalid_signature_mock',
      };

      expect(service.verifyChecksum(invalidDto)).toBe(false);
      expect(service.verifyChecksum({ ...invalidDto, signature: '' })).toBe(false);
    });
  });
});

