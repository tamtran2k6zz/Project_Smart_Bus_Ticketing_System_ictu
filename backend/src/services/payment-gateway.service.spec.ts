import { createHmac } from 'crypto';
import { PaymentGatewayService } from './payment-gateway.service';

describe('PaymentGatewayService', () => {
  const originalEnv = { ...process.env };
  let service: PaymentGatewayService;

  beforeEach(() => {
    service = new PaymentGatewayService();
    jest.restoreAllMocks();
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
    process.env.PAYMENT_RESULT_URL = 'https://bus.example/passenger/booking';
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
});
