import QRCode from 'qrcode';
import { describe, expect, it } from 'vitest';
import { buildPaymentQrPayload } from './paymentQr';

describe('payment QR payload', () => {
  it('includes the pending trip and fare details in a scannable QR', async () => {
    const payload = buildPaymentQrPayload({
      orderId: 'order-123',
      ticketCode: 'ticket-123',
      tripId: 'trip-123',
      routeCode: 'R1',
      routeName: 'ICTU - Trung tâm',
      departureTime: '2026-10-03T08:00:00+07:00',
      seatNumber: 'A01',
      amount: 15000,
      expiresAt: '2026-10-03T01:10:00.000Z',
    });

    expect(JSON.parse(payload)).toMatchObject({
      type: 'SMARTBUS_PAYMENT',
      status: 'PENDING',
      currency: 'VND',
      orderId: 'order-123',
      tripId: 'trip-123',
      amount: 15000,
      seatNumber: 'A01',
    });
    expect(await QRCode.toDataURL(payload)).toMatch(/^data:image\/png;base64,/);
  });
});
