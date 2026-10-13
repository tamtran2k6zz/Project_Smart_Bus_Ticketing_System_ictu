import { refundZalopay, verifiedZalopayCallback } from './zalopay.service';
import { query } from '../config/database';
jest.mock('../config/database', () => ({ query: jest.fn() }));
const database = query as jest.Mock;
describe('ZaloPay refund settlement', () => {
  const payment = {
    refundRequestId: 'request-001',
    gatewayTransactionId: '123456',
    amount: 15000,
    paidAt: new Date('2026-10-01T00:00:00Z'),
  };
  beforeEach(() => {
    process.env.ZALOPAY_APP_ID = '9999';
    process.env.ZALOPAY_KEY1 = 'test-key1';
    process.env.ZALOPAY_KEY2 = 'test-key2';
    database.mockReset();
    database.mockResolvedValue([{ created_at: '2026-10-12T08:00:00Z' }]);
  });
  afterEach(() => jest.restoreAllMocks());
  it('persists pending acceptance and only considers query confirmation settled', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ return_code: 2 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ return_code: 1, refund_id: 123 })));
    await expect(refundZalopay(payment)).rejects.toThrow('chờ xác nhận');
    const request = new URLSearchParams(String(fetchMock.mock.calls[1][1]?.body));
    expect(request.get('m_refund_id')).toBe('261012_9999_request001');
    expect(request.get('amount')).toBe('15000');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ return_code: 1 })));
    await expect(refundZalopay(payment)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const lookup = new URLSearchParams(String(fetchMock.mock.calls[2][1]?.body));
    expect(lookup.get('m_refund_id')).toBe(request.get('m_refund_id'));
  });
  it('does not resubmit a refund while the provider reports processing', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ return_code: 3 })));
    await expect(refundZalopay(payment)).rejects.toThrow('đang xử lý');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('rejects non-hex signatures before timingSafeEqual', async () => {
    await expect(
      verifiedZalopayCallback({ type: 1, data: '{}', mac: 'é'.repeat(64) })
    ).resolves.toBeNull();
    expect(database).not.toHaveBeenCalled();
  });
});
