import api from './client'; // đổi theo cách export thật của bạn
import type { TripSeat } from '../types/seat';

export async function fetchTripSeats(tripId: string | number): Promise<TripSeat[]> {
  const res = await api.get(`/seats/trip/${tripId}`);
  // Backend có thể trả mảng trực tiếp hoặc bọc trong data, xử lý cả hai:
  return Array.isArray(res.data) ? res.data : res.data.data ?? res.data.seats ?? [];
}