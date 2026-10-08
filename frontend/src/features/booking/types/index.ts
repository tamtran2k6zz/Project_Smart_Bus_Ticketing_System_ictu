export interface Trip {
  id: string;
  routeId: string;
  departure: string;
  duration: number;
  seatMode: boolean;
  vehicleId: string;
  status: 'scheduled' | 'running' | 'completed';
  price: number;
  capacity: number;
  available: number;
}
export interface Seat {
  id: string;
  status: 'available' | 'held' | 'booked';
  mine: boolean;
}
export interface Hold {
  boardingStopId?: string;
  alightingStopId?: string;
  id: string;
  tripId: string;
  userId: string;
  seatIds: string[];
  quantity: number;
  expiresAt: string;
  serverTime: string;
  price: number;
  status: 'active' | 'expired' | 'converted' | 'released';
}
export interface Booking {
  boardingStopId?: string;
  alightingStopId?: string;
  id: string;
  tripId: string;
  userId: string;
  holdId: string;
  seatIds: string[];
  quantity: number;
  name: string;
  phone: string;
  total: number;
  discount: number;
  voucher?: string;
  status: 'pending' | 'paid' | 'failed' | 'canceled' | 'expired';
  createdAt: string;
  refund: 'none' | 'pending' | 'refunded';
  invoiceRequested?: boolean;
}
