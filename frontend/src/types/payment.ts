export type PaymentMethod = 'VNPAY' | 'MOMO' | 'QR';

// Dữ liệu chuyến + ghế truyền từ trang chọn ghế sang /payment qua location.state
export interface PaymentPageState {
  tripId: string;
  seatNumber: string;
  routeCode: string;
  routeName: string;
  departureTime: string;
  fare: number;
  voucherCode?: string;
}

// Kết quả rút gọn từ POST /api/v1/ticketing/bookings khi có paymentMethod
export interface CreateBookingResult {
  orderId: string;
  ticketId: string;
  ticketCode: string;
  seatNumber: string;
  amount: number;
  reservationExpiresAt: string;
  paymentUrl: string | null;
}

// Phản hồi GET /api/v1/ticketing/payments/:orderId (trạng thái lấy từ DB, không tin query URL)
export interface PaymentStatusDetail {
  orderId: string;
  paymentMethod: string;
  amount: number;
  paymentStatus: string;
  paidAt: string | null;
  ticket: {
    id: string;
    ticketCode: string;
    seatNumber: string;
    tripId: string;
    status: string;
  };
}

// Phiên đặt chỗ lưu trong LocalStorage trước khi chuyển sang cổng thanh toán
export interface BookingSession {
  orderId: string;
  ticketId: string;
  ticketCode: string;
  tripId: string;
  routeCode: string;
  routeName: string;
  departureTime: string;
  seatNumber: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentUrl: string | null;
  reservationExpiresAt: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
  createdAt: string;
  voucherCode?: string;
}
