export type PaymentMethod = 'VNPAY' | 'MOMO';

// Dữ liệu chuyến + ghế truyền từ trang chọn ghế sang /payment qua location.state
export interface PaymentPageState {
  tripId: string;
  seatNumber: string;
  routeCode: string;
  routeName: string;
  departureTime: string;
  fare: number;
}

// Kết quả rút gọn từ POST /api/v1/ticketing/bookings khi có paymentMethod
export interface CreateBookingResult {
  orderId: string;
  ticketId: string;
  ticketCode: string;
  seatNumber: string;
  amount: number;
  reservationExpiresAt: string;
  paymentUrl: string;
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
  paymentUrl: string;
  reservationExpiresAt: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
  createdAt: string;
}
