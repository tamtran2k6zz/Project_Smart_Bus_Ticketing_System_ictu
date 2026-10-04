import { describe, expect, it } from 'vitest';
import { getPaymentOutcome, parsePaymentStatus } from './paymentResult';

const detail = (paymentStatus: string, ticketStatus: string) =>
  parsePaymentStatus({
    orderId: 'order-1',
    paymentMethod: 'VNPAY',
    amount: '15000',
    paymentStatus,
    paidAt: null,
    ticket: { id: 't-1', ticketCode: 'TK1', seatNumber: 'A01', tripId: 'trip-1', status: ticketStatus },
  })!;

describe('payment result outcome', () => {
  it('is SUCCESS only when payment succeeded and the ticket is BOOKED', () => {
    expect(getPaymentOutcome(detail('SUCCESS', 'BOOKED'))).toBe('SUCCESS');
    expect(getPaymentOutcome(detail('SUCCESS', 'RESERVED'))).toBe('PENDING');
  });

  it('treats FAILED and REFUNDED as failures', () => {
    expect(getPaymentOutcome(detail('FAILED', 'RESERVED'))).toBe('FAILED');
    expect(getPaymentOutcome(detail('REFUNDED', 'CANCELLED'))).toBe('FAILED');
  });

  it('keeps PENDING while the gateway has not confirmed', () => {
    expect(getPaymentOutcome(detail('PENDING', 'RESERVED'))).toBe('PENDING');
  });
});

describe('parsePaymentStatus', () => {
  it('converts amount to a number', () => {
    expect(detail('SUCCESS', 'BOOKED').amount).toBe(15000);
  });

  it('rejects responses without orderId or status', () => {
    expect(parsePaymentStatus(null)).toBeNull();
    expect(parsePaymentStatus({ orderId: 'x' })).toBeNull();
  });
});
