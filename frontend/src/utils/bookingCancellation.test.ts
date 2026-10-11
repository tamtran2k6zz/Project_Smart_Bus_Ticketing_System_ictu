import { describe, expect, it } from 'vitest';
import { applyCancellationResult, canDisplayBookingQr } from './bookingCancellation';
import type { BookingResult } from '../types/booking';

const paid: BookingResult = {
  status: 'BOOKED',
  payment: { status: 'SUCCESS' },
  ticket: { id: 'ticket-1', status: 'BOOKED' },
  qrCode: 'ticket-qr',
};

describe('cancellation while a refund is pending', () => {
  it('hides a cancelled ticket QR while retaining payment and retry state', () => {
    const cancelled = applyCancellationResult(paid, { refundPending: true });
    expect(canDisplayBookingQr(paid)).toBe(true);
    expect(canDisplayBookingQr(cancelled)).toBe(false);
    expect(cancelled).toMatchObject({
      status: 'CANCELLED',
      paymentStatus: 'SUCCESS',
      refundPending: true,
    });
    expect(cancelled.qrCode).toBeUndefined();
    expect(cancelled.ticket?.id).toBe('ticket-1');
  });
  it('marks payment refunded only after a successful retry', () => {
    const cancelled = applyCancellationResult(paid, { refundPending: true });
    const refunded = applyCancellationResult(cancelled, {});
    expect(refunded).toMatchObject({ paymentStatus: 'REFUNDED', refundPending: false });
    expect(refunded.payment?.status).toBe('REFUNDED');
    expect(canDisplayBookingQr(refunded)).toBe(false);
  });
  it('closes a pending payment without representing it as a refund', () => {
    const cancelled = applyCancellationResult({ status: 'RESERVED', paymentStatus: 'PENDING' }, {});
    expect(cancelled.paymentStatus).toBe('FAILED');
    expect(canDisplayBookingQr(cancelled)).toBe(false);
  });
  it('never displays a used or unpaid ticket as a usable QR', () => {
    expect(canDisplayBookingQr({ ...paid, ticket: { status: 'CHECKED_IN' } })).toBe(false);
    expect(canDisplayBookingQr({ ...paid, paymentStatus: 'PENDING' })).toBe(false);
  });
});
