import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../api/client';
import { createBooking, isAllowedGatewayUrl } from './payment';

vi.mock('../api/client', () => ({ apiFetch: vi.fn(), getApiUrl: (path: string) => path }));
const data = {
  ticket: { id: 'ticket-1', ticketCode: 'TK1', seatNumber: 'A01', reservationExpiresAt: '2026-10-06T01:00:00Z' },
  payment: { orderId: 'order-1', amount: '15000' },
};
const respond = (body: unknown, status = 201) => vi.mocked(apiFetch).mockResolvedValue(new Response(JSON.stringify(body), { status }));
afterEach(() => vi.resetAllMocks());

describe('booking payment API', () => {
  it('passes the chosen gateway and voucher and reads the authoritative amount', async () => {
    respond({ data: { ...data, paymentUrl: 'https://sandbox.vnpayment.vn/pay' } });
    const booking = await createBooking({ tripId: 'trip-1', seatNumber: 'A01', paymentMethod: 'MOMO', voucherCode: 'ICTU2026' });
    expect(JSON.parse(vi.mocked(apiFetch).mock.calls[0][1]!.body as string)).toEqual({
      tripId: 'trip-1', seatNumber: 'A01', paymentMethod: 'MOMO', voucherCode: 'ICTU2026',
    });
    expect(booking.amount).toBe(15000);
  });

  it('accepts a QR demo reservation without an external payment URL', async () => {
    respond({ data });
    expect((await createBooking({ tripId: 'trip-1', seatNumber: 'A01', paymentMethod: 'QR' })).paymentUrl).toBeNull();
  });

  it('rejects an online reservation without a gateway URL or with an invalid amount', async () => {
    respond({ data });
    await expect(createBooking({ tripId: 'trip-1', seatNumber: 'A01', paymentMethod: 'VNPAY' })).rejects.toThrow('định dạng');
    respond({ data: { ...data, payment: { ...data.payment, amount: 'invalid' } } });
    await expect(createBooking({ tripId: 'trip-1', seatNumber: 'A01', paymentMethod: 'QR' })).rejects.toThrow('định dạng');
  });

  it('shows a seat conflict from the server', async () => {
    respond({ message: 'Ghế đang được người khác giữ.' }, 409);
    await expect(createBooking({ tripId: 'trip-1', seatNumber: 'A01', paymentMethod: 'MOMO' })).rejects.toThrow('Ghế đang được người khác giữ.');
  });

  it('restricts gateway redirects to HTTPS and allowed hosts', () => {
    expect(isAllowedGatewayUrl('https://sandbox.vnpayment.vn/pay')).toBe(true);
    expect(isAllowedGatewayUrl('https://test-payment.momo.vn/pay')).toBe(true);
    expect(isAllowedGatewayUrl('http://sandbox.vnpayment.vn/pay')).toBe(false);
    expect(isAllowedGatewayUrl('https://sandbox.vnpayment.vn.evil.example/pay')).toBe(false);
  });
});
