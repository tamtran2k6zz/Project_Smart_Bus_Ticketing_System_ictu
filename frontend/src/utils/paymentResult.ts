import type { PaymentStatusDetail } from '../types/payment';

export type PaymentOutcome = 'SUCCESS' | 'FAILED' | 'PENDING';

// Vé chỉ hợp lệ khi tiền đã nhận VÀ vé đã chuyển BOOKED. Tiền về sau khi hết giữ ghế
// (payment SUCCESS nhưng vé chưa BOOKED) là ca hoàn tiền tự động, chưa coi là thành công.
export const getPaymentOutcome = (detail: PaymentStatusDetail): PaymentOutcome => {
  if (detail.paymentStatus === 'SUCCESS' && detail.ticket?.status === 'BOOKED') return 'SUCCESS';
  if (detail.paymentStatus === 'FAILED' || detail.paymentStatus === 'REFUNDED') return 'FAILED';
  return 'PENDING';
};

// Đọc phản hồi GET /api/v1/ticketing/payments/:orderId; trả null nếu sai định dạng.
export const parsePaymentStatus = (data: unknown): PaymentStatusDetail | null => {
  const d = data as Partial<PaymentStatusDetail> | null;
  if (!d || typeof d.orderId !== 'string' || typeof d.paymentStatus !== 'string') return null;
  return {
    orderId: d.orderId,
    paymentMethod: typeof d.paymentMethod === 'string' ? d.paymentMethod : '',
    amount: Number(d.amount),
    paymentStatus: d.paymentStatus,
    paidAt: typeof d.paidAt === 'string' ? d.paidAt : null,
    ticket: {
      id: String(d.ticket?.id ?? ''),
      ticketCode: String(d.ticket?.ticketCode ?? ''),
      seatNumber: String(d.ticket?.seatNumber ?? ''),
      tripId: String(d.ticket?.tripId ?? ''),
      status: String(d.ticket?.status ?? ''),
    },
  };
};
