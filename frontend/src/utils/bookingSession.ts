import type { BookingSession } from '../types/payment';

// Gắn theo userId để tài khoản khác đăng nhập trên cùng trình duyệt không đọc nhầm phiên.
export const bookingSessionKey = (userId: string): string => `smartbus_booking_session_${userId}`;

// Trả về null nếu không có phiên, dữ liệu hỏng hoặc LocalStorage bị chặn.
export const loadBookingSession = (userId: string): BookingSession | null => {
  try {
    const raw = localStorage.getItem(bookingSessionKey(userId));
    return raw ? (JSON.parse(raw) as BookingSession) : null;
  } catch {
    return null;
  }
};

// Trả về false nếu trình duyệt chặn LocalStorage (chế độ riêng tư, hết dung lượng...).
export const saveBookingSession = (userId: string, session: BookingSession): boolean => {
  try {
    localStorage.setItem(bookingSessionKey(userId), JSON.stringify(session));
    return true;
  } catch (error) {
    console.warn('Không thể lưu phiên đặt chỗ vào LocalStorage:', error);
    return false;
  }
};
