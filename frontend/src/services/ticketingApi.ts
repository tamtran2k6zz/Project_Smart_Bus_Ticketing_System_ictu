import type { TripSeatsResponse } from '../types/seat';

const API_BASE_URL = 'http://localhost:3000';

export async function getTripSeats(
  tripId: string,
): Promise<TripSeatsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/ticketing/trips/${tripId}/seats`,
  );

  if (!response.ok) {
    throw new Error(`Không thể lấy sơ đồ ghế (${response.status})`);
  }

  return response.json() as Promise<TripSeatsResponse>;
}