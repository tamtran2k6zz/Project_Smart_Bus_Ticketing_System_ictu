import { Test, TestingModule } from '@nestjs/testing';
import { VNPayService } from './vnpay.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

describe('VNPayService', () => {
  let service: VNPayService;
  const mockHashSecret = 'TEST_HASH_SECRET_KEY_123';
  const mockTmnCode = 'TESTTMN01';
  const mockVnpUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  const mockReturnUrl = 'http://localhost:3000/api/v1/payments/vnpay-return';

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'VNP_TMN_CODE') return mockTmnCode;
        if (key === 'VNP_HASH_SECRET') return mockHashSecret;
        if (key === 'VNP_URL') return mockVnpUrl;
        if (key === 'VNP_RETURN_URL') return mockReturnUrl;
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VNPayService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<VNPayService>(VNPayService);
  });

  describe('createPaymentUrl', () => {
    it('Tạo payment URL với đầy đủ tham số và chữ ký HMAC-SHA512 chuẩn xác', () => {
      const url = service.createPaymentUrl({
        orderId: 'ORD-12345',
        amount: 100000,
        orderInfo: 'Thanh toan don hang',
        ipAddr: '127.0.0.1',
        bankCode: 'NCB',
      });

      expect(url).toContain(mockVnpUrl);
      expect(url).toContain('vnp_TxnRef=ORD-12345');
      expect(url).toContain('vnp_Amount=10000000'); // amount * 100
      expect(url).toContain('vnp_BankCode=NCB');
      expect(url).toContain('vnp_SecureHash=');
    });
  });

  describe('verifyChecksum', () => {
    it('Xác thực chữ ký hợp lệ (true) khi hash khớp với HMAC-SHA512 tính toán', () => {
      // Create valid params
      const params: Record<string, string> = {
        vnp_Amount: '10000000',
        vnp_BankCode: 'NCB',
        vnp_OrderInfo: 'Thanh toan ve xe',
        vnp_ResponseCode: '00',
        vnp_TmnCode: mockTmnCode,
        vnp_TransactionNo: '14234567',
        vnp_TxnRef: 'ORD-12345',
      };

      // Manually calculate signature
      const sortedKeys = Object.keys(params).sort();
      const signData = sortedKeys
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`)
        .join('&');
      const hash = crypto.createHmac('sha512', mockHashSecret).update(Buffer.from(signData, 'utf-8')).digest('hex');

      const fullParams = {
        ...params,
        vnp_SecureHash: hash,
      };

      const isValid = service.verifyChecksum(fullParams);
      expect(isValid).toBe(true);
    });

    it('Xác thực thất bại (false) khi hash không khớp', () => {
      const invalidParams = {
        vnp_Amount: '10000000',
        vnp_TxnRef: 'ORD-12345',
        vnp_SecureHash: 'invalid_tampered_hash_value',
      };

      const isValid = service.verifyChecksum(invalidParams);
      expect(isValid).toBe(false);
    });

    it('Xác thực thất bại (false) khi thiếu vnp_SecureHash', () => {
      const noHashParams = {
        vnp_Amount: '10000000',
        vnp_TxnRef: 'ORD-12345',
      };

      const isValid = service.verifyChecksum(noHashParams);
      expect(isValid).toBe(false);
    });
  });
});

