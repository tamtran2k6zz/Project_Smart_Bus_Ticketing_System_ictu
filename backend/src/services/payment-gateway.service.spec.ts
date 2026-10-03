import { createHmac } from 'crypto';
import { PaymentGatewayService } from './payment-gateway.service';

describe('PaymentGatewayService', () => {
  const originalEnv = { ...process.env };
  let service: PaymentGatewayService;

  beforeEach(() => {
    service = new PaymentGatewayService();
    jest.restoreAllMocks();
    // Start every case from a clean gateway configuration so ordering between
    // tests cannot leak an old URL or credential.
    for (const key of [
      'VNPAY_TMN_CODE',
      'VNPAY_HASH_SECRET',
      'VNPAY_RETURN_URL',
      'VNPAY_IPN_URL',
      'VNPAY_PAYMENT_URL',
      'VNP_TMN_CODE',
      'VNP_HASH_SECRET',
      'VNP_RETURN_URL',
      'VNP_IPN_URL',
      'PAYMENT_PUBLIC_BASE_URL',
      'PAYMENT_RESULT_URL',
      'MOMO_REDIRECT_URL',
      'MOMO_IPN_URL',
      'MOMO_PARTNER_CODE',
      'MOMO_ACCESS_KEY',
      'MOMO_SECRET_KEY',
      'PORT',
    ]) {
      delete process.env[key];
    }
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('creates a signed VNPay checkout URL', async () => {
    process.env.VNPAY_TMN_CODE = 'merchant';
    process.env.VNPAY_HASH_SECRET = 'secret';
    process.env.VNPAY_RETURN_URL = 'https://bus.example/api/v1/ticketing/payments/vnpay/return';

    const paymentUrl = await service.createPaymentUrl('VNPAY', 'order-1', 10000, '127.0.0.1');
    const url = new URL(paymentUrl);

    expect(url.origin + url.pathname).toBe('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
    expect(url.searchParams.get('vnp_Amount')).toBe('1000000');
    expect(url.searchParams.get('vnp_TxnRef')).toBe('order-1');
    expect(url.searchParams.get('vnp_SecureHash')).toEqual(expect.any(String));
  });

  it('verifies a signed VNPay response and rejects altered response data', () => {
    process.env.VNPAY_HASH_SECRET = 'secret';
    const params: Record<string, string> = {
      vnp_Amount: '1000000',
      vnp_ResponseCode: '00',
      vnp_SecureHashType: 'HMACSHA512',
      vnp_TxnRef: 'order-1',
    };
    const signed = Object.fromEntries(
      Object.entries(params).filter(([key]) => key !== 'vnp_SecureHashType')
    );
    const queryString = new URLSearchParams(
      Object.keys(signed)
        .sort()
        .map(key => [key, signed[key]])
    ).toString();
    params.vnp_SecureHash = createHmac('sha512', 'secret').update(queryString).digest('hex');

    expect(service.verifyVnpayCallback(params)).toBe(true);
    expect(service.verifyVnpayCallback({ ...params, vnp_Amount: '1' })).toBe(false);
  });

  it('creates MoMo checkout and returns the provider pay URL', async () => {
    process.env.MOMO_PARTNER_CODE = 'partner';
    process.env.MOMO_ACCESS_KEY = 'access';
    process.env.MOMO_SECRET_KEY = 'secret';
    process.env.MOMO_IPN_URL = 'https://bus.example/api/v1/ticketing/payments/momo/ipn';
    process.env.PAYMENT_RESULT_URL = 'https://wrong.example/payment-result';
    process.env.MOMO_REDIRECT_URL = 'https://bus.example/passenger/booking';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ resultCode: 0, payUrl: 'https://momo.example/pay/1' }),
    } as Response);

    const paymentUrl = await service.createPaymentUrl('MOMO', 'order-2', 10000, '127.0.0.1');

    expect(paymentUrl).toBe('https://momo.example/pay/1');
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body).toMatchObject({
      partnerCode: 'partner',
      orderId: 'order-2',
      amount: 10000,
      ipnUrl: 'https://bus.example/api/v1/ticketing/payments/momo/ipn',
    });
    expect(new URL(body.redirectUrl).origin + new URL(body.redirectUrl).pathname).toBe(
      'https://bus.example/passenger/booking'
    );
    expect(new URL(body.redirectUrl).searchParams.get('paymentOrder')).toBe('order-2');
    expect(body.signature).toEqual(expect.any(String));
  });

  it('verifies a signed MoMo IPN payload', () => {
    process.env.MOMO_ACCESS_KEY = 'access';
    process.env.MOMO_SECRET_KEY = 'secret';
    const payload: Record<string, string | number> = {
      amount: 10000,
      extraData: '',
      message: 'Successful.',
      orderId: 'order-2',
      orderInfo: 'Bus ticket',
      orderType: 'momo_wallet',
      partnerCode: 'partner',
      payType: 'qr',
      requestId: 'request-1',
      responseTime: 1780000000000,
      resultCode: 0,
      transId: 123456,
    };
    const signedFields: [string, string | number][] = [
      ['accessKey', 'access'],
      ['amount', payload.amount],
      ['extraData', payload.extraData],
      ['message', payload.message],
      ['orderId', payload.orderId],
      ['orderInfo', payload.orderInfo],
      ['orderType', payload.orderType],
      ['partnerCode', payload.partnerCode],
      ['payType', payload.payType],
      ['requestId', payload.requestId],
      ['responseTime', payload.responseTime],
      ['resultCode', payload.resultCode],
      ['transId', payload.transId],
    ];
    const rawSignature = signedFields.map(([key, value]) => `${key}=${value}`).join('&');
    payload.signature = createHmac('sha256', 'secret').update(rawSignature).digest('hex');

    expect(service.verifyMomoCallback(payload)).toBe(true);
    expect(service.verifyMomoCallback({ ...payload, amount: 1 })).toBe(false);
  });
  it('uses the canonical VNPAY_* variable names, not the legacy VNP_* ones', async () => {
    process.env.VNPAY_TMN_CODE = 'canonical-merchant';
    process.env.VNPAY_HASH_SECRET = 'canonical-secret';
    process.env.VNPAY_RETURN_URL = 'https://bus.example/api/v1/ticketing/payments/vnpay/return';
    // Stale aliases left over from an old .env must not win.
    process.env.VNP_TMN_CODE = 'legacy-merchant';
    process.env.VNP_HASH_SECRET = 'legacy-secret';
    process.env.VNP_RETURN_URL = 'https://legacy.example/wrong/path';

    const paymentUrl = await service.createPaymentUrl('VNPAY', 'order-3', 10000, '127.0.0.1');
    const url = new URL(paymentUrl);

    expect(url.searchParams.get('vnp_TmnCode')).toBe('canonical-merchant');
    expect(url.searchParams.get('vnp_ReturnUrl')).toBe(
      'https://bus.example/api/v1/ticketing/payments/vnpay/return'
    );

    delete process.env.VNP_TMN_CODE;
    delete process.env.VNP_HASH_SECRET;
    delete process.env.VNP_RETURN_URL;
  });

  it('falls back to a legacy VNP_* alias when the canonical name is absent', async () => {
    process.env.VNPAY_TMN_CODE = 'merchant';
    process.env.VNPAY_HASH_SECRET = 'secret';
    delete process.env.VNPAY_RETURN_URL;
    process.env.VNP_RETURN_URL = 'https://legacy.example/api/v1/ticketing/payments/vnpay/return';

    const paymentUrl = await service.createPaymentUrl('VNPAY', 'order-4', 10000, '127.0.0.1');

    expect(new URL(paymentUrl).searchParams.get('vnp_ReturnUrl')).toBe(
      'https://legacy.example/api/v1/ticketing/payments/vnpay/return'
    );

    delete process.env.VNP_RETURN_URL;
  });

  it('defaults the return URL to the real Express route on port 5000', async () => {
    process.env.VNPAY_TMN_CODE = 'merchant';
    process.env.VNPAY_HASH_SECRET = 'secret';
    delete process.env.VNPAY_RETURN_URL;
    delete process.env.VNP_RETURN_URL;
    delete process.env.PAYMENT_PUBLIC_BASE_URL;
    process.env.PORT = '5000';

    const paymentUrl = await service.createPaymentUrl('VNPAY', 'order-5', 10000, '127.0.0.1');

    expect(new URL(paymentUrl).searchParams.get('vnp_ReturnUrl')).toBe(
      'http://localhost:5000/api/v1/ticketing/payments/vnpay/return'
    );
  });
});
