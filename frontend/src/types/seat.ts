export type SeatStatus = 'available' | 'occupied';

export interface SeatApi {
  id: string;
  seatNumber: string;
  rowPosition: string;
  deck: string;
  isPriority: boolean;
  isAvailable: boolean;
}

export interface TripSeatsResponse {
  tripId: string;
  bus: {
    plateNumber: string;
    busType: string;
    totalSeats: number;
    standingCapacity: number;
  };
  seats: SeatApi[];
}