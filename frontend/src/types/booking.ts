export interface BookingResult {
  orderId?: string;
  ticketId?: string;
  ticketCode?: string;
  seatNumber?: string;
  qrCode?: string;
  fareAmount?: number;
  status?: string;
  expiresAt?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  payment?: {
    orderId?: string;
    amount?: number;
    method?: string;
    status?: string;
  };
  ticket?: {
    id?: string;
    ticketCode?: string;
    seatNumber?: string;
    fareAmount?: number;
    status?: string;
    reservationExpiresAt?: string;
    tripId?: string;
  };
}
