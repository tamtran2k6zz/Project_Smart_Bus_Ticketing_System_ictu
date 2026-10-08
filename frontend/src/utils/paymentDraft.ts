import type { PaymentPageState } from '../types/payment';

const MAX_AGE_MS = 30 * 60 * 1000;
export const paymentDraftKey = (userId: string) => `smartbus_payment_draft_${userId}`;

export const isPaymentPageState = (value: unknown): value is PaymentPageState => {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<PaymentPageState>;
  return typeof state.tripId === 'string' && !!state.tripId.trim()
    && typeof state.seatNumber === 'string' && !!state.seatNumber.trim()
    && typeof state.routeCode === 'string' && typeof state.routeName === 'string'
    && typeof state.departureTime === 'string' && Number.isFinite(Date.parse(state.departureTime))
    && typeof state.fare === 'number' && Number.isFinite(state.fare) && state.fare >= 0
    && (state.voucherCode === undefined || typeof state.voucherCode === 'string');
};

export const savePaymentDraft = (userId: string, order: PaymentPageState): boolean => {
  try {
    if (!isPaymentPageState(order)) return false;
    sessionStorage.setItem(paymentDraftKey(userId), JSON.stringify({ order, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
};

export const loadPaymentDraft = (userId: string): PaymentPageState | null => {
  try {
    const raw = sessionStorage.getItem(paymentDraftKey(userId));
    if (!raw) return null;
    const draft = JSON.parse(raw);
    const age = Date.now() - draft.savedAt;
    if (typeof draft.savedAt !== 'number' || !Number.isFinite(age) || age < 0 || age > MAX_AGE_MS
      || !isPaymentPageState(draft.order)) return null;
    return draft.order;
  } catch {
    return null;
  }
};

export const clearPaymentDraft = (userId: string): void => {
  try {
    sessionStorage.removeItem(paymentDraftKey(userId));
  } catch {
    // Navigation still works when browser storage is unavailable.
  }
};

export const bookingPageUrl = (order?: PaymentPageState | null): string =>
  order ? `/passenger/booking?trip_id=${encodeURIComponent(order.tripId)}` : '/passenger/booking';
