export interface Ticket {
  id: string;
  bookingId: string;
  tripId: string;
  userId: string;
  token: string;
  expiresAt: string;
  status: 'valid' | 'used' | 'canceled';
  /** Thời điểm soát vé thành công trong dữ liệu demo. */
  checkedInAt?: string;
  request?: 'cancel' | 'exchange';
  exchangeTripId?: string;
}
