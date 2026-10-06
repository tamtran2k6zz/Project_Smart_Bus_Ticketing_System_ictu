import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookingPageUrl, clearPaymentDraft, isPaymentPageState, loadPaymentDraft, paymentDraftKey, savePaymentDraft } from './paymentDraft';
import { bookingSessionKey, loadBookingSession } from './bookingSession';

const order = {
  tripId: 'trip/1', seatNumber: 'A01', routeCode: 'R1', routeName: 'ICTU',
  departureTime: '2026-10-06T01:00:00Z', fare: 15000, voucherCode: 'ICTU2026',
};

describe('payment recovery', () => {
  let values: Map<string, string>;
  beforeEach(() => {
    values = new Map();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
    vi.stubGlobal('sessionStorage', storage);
    vi.stubGlobal('localStorage', storage);
    vi.spyOn(Date, 'now').mockReturnValue(100000000);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('recovers the trip, seat and voucher without router state, scoped to the user', () => {
    expect(savePaymentDraft('alice', order)).toBe(true);
    expect(loadPaymentDraft('alice')).toEqual(order);
    expect(loadPaymentDraft('bob')).toBeNull();
    expect(bookingPageUrl(loadPaymentDraft('alice'))).toBe('/passenger/booking?trip_id=trip%2F1');
  });

  it('expires a stale draft and rejects damaged or future-dated storage', () => {
    savePaymentDraft('alice', order);
    vi.spyOn(Date, 'now').mockReturnValue(100000000 + 31 * 60000);
    expect(loadPaymentDraft('alice')).toBeNull();
    values.set(paymentDraftKey('alice'), '{broken');
    expect(loadPaymentDraft('alice')).toBeNull();
    values.set(paymentDraftKey('alice'), JSON.stringify({ order, savedAt: Date.now() + 1000 }));
    expect(loadPaymentDraft('alice')).toBeNull();
  });

  it('removes the draft after a booking and survives blocked browser storage', () => {
    savePaymentDraft('alice', order);
    clearPaymentDraft('alice');
    expect(loadPaymentDraft('alice')).toBeNull();
    vi.stubGlobal('sessionStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    });
    expect(savePaymentDraft('alice', order)).toBe(false);
    expect(loadPaymentDraft('alice')).toBeNull();
    expect(() => clearPaymentDraft('alice')).not.toThrow();
  });

  it('rejects missing fields, invalid dates, non-numeric fares and empty seat numbers', () => {
    expect(isPaymentPageState(null)).toBe(false);
    expect(isPaymentPageState({ ...order, seatNumber: ' ' })).toBe(false);
    expect(isPaymentPageState({ ...order, departureTime: 'invalid' })).toBe(false);
    expect(isPaymentPageState({ ...order, fare: '15000' })).toBe(false);
    expect(isPaymentPageState({ ...order, fare: -1 })).toBe(false);
    expect(isPaymentPageState({ ...order, routeName: undefined })).toBe(false);
  });

  it('only restores a well-formed created transaction for its owner', () => {
    const session = { ...order, orderId: 'order-1', amount: order.fare, paymentMethod: 'VNPAY' };
    values.set(bookingSessionKey('alice'), JSON.stringify(session));
    expect(loadBookingSession('alice')?.orderId).toBe('order-1');
    expect(loadBookingSession('bob')).toBeNull();
    values.set(bookingSessionKey('alice'), JSON.stringify({ orderId: 'order-1' }));
    expect(loadBookingSession('alice')).toBeNull();
    values.set(bookingSessionKey('alice'), 'null');
    expect(loadBookingSession('alice')).toBeNull();
  });
});
