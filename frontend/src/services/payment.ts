import { getApiUrl, apiFetch } from '../api/client';
import type { CreateBookingResult, PaymentMethod } from '../types/payment';

// Chỉ cho phép chuyển hướng sang host của cổng thanh toán đã biết (chống open redirect).
// Host production bổ sung qua VITE_PAYMENT_GATEWAY_HOSTS, phân tách bằng dấu phẩy.
const GATEWAY_HOSTS = [
  'sandbox.vnpayment.vn',
  'test-payment.momo.vn',
  ...String(import.meta.env.VITE_PAYMENT_GATEWAY_HOSTS || '')
    .split(',')
    .map((host: string) => host.trim().toLowerCase())
    .filter(Boolean),
];

export const isAllowedGatewayUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && GATEWAY_HOSTS.includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
};

const fallbackMessage = (status: number): string => {
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 409) return 'Ghế đã được đặt hoặc đang có người giữ chỗ.';
  if (status === 503) return 'Dịch vụ giữ ghế tạm thời không khả dụng. Vui lòng thử lại.';
  if (status === 502) return 'Không kết nối được cổng thanh toán. Vui lòng thử lại.';
  return 'Không thể tạo giao dịch thanh toán.';
};

export const createBooking = async (params: {
  tripId: string;
  seatNumber: string;
  paymentMethod: PaymentMethod;
}): Promise<CreateBookingResult> => {
  const res = await apiFetch(getApiUrl('/api/v1/ticketing/bookings'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(body?.message || fallbackMessage(res.status));
  }

  const data = body?.data;
  const result: CreateBookingResult = {
    orderId: data?.payment?.orderId,
    ticketId: data?.ticket?.id,
    ticketCode: data?.ticket?.ticketCode,
    seatNumber: data?.ticket?.seatNumber,
    amount: Number(data?.payment?.amount),
    reservationExpiresAt: data?.ticket?.reservationExpiresAt,
    paymentUrl: data?.paymentUrl,
  };

  if (!result.orderId || !result.ticketId || typeof result.paymentUrl !== 'string') {
    throw new Error('Phản hồi tạo giao dịch từ máy chủ không đúng định dạng.');
  }
  return result;
};
