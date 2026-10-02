export type SeatStatus = 'AVAILABLE' | 'BOOKED' | 'LOCKED';

export interface TripSeat {
  id: number | string;
  seat_number: string;   // vd: "A01"
  floor: number;         // 1 hoặc 2
  status: SeatStatus;
}