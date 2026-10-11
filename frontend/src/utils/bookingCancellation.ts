import type { BookingResult } from '../types/booking';

export function applyCancellationResult(
  booking: BookingResult,
  result: { refundPending?: boolean }
): BookingResult {
  const previousPaymentStatus = booking.paymentStatus || booking.payment?.status;
  const paymentStatus = result.refundPending
    ? previousPaymentStatus
    : previousPaymentStatus === 'SUCCESS'
      ? 'REFUNDED'
      : previousPaymentStatus === 'PENDING'
        ? 'FAILED'
        : previousPaymentStatus;
  return {
    ...booking,
    status: 'CANCELLED',
    qrCode: undefined,
    expiresAt: undefined,
    refundPending: Boolean(result.refundPending),
    paymentStatus,
    payment: booking.payment ? { ...booking.payment, status: paymentStatus } : undefined,
    ticket: { ...booking.ticket, status: 'CANCELLED', reservationExpiresAt: undefined },
  };
}

export function canDisplayBookingQr(booking: BookingResult): boolean {
  return (
    (booking.ticket?.status || booking.status) === 'BOOKED' &&
    (booking.paymentStatus || booking.payment?.status) === 'SUCCESS'
  );
}
