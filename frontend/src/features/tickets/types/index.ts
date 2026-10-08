export interface Ticket {
  id: string;
  bookingId: string;
  tripId: string;
  userId: string;
  token: string;
  expiresAt: string;
  status: 'valid' | 'used' | 'canceled';
  request?: 'cancel' | 'exchange';
  exchangeTripId?: string;
}
