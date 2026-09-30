export interface TripSearchResult {
  trip_id: string;
  route_name: string;
  bus_type: string;
  departure_time_at_origin: string;
  arrival_time_at_destination: string;
  duration_minutes: number;
  available_seats: number;
  price: number;
}

interface TripSearchPagination {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
  errors?: string[];
  pagination: TripSearchPagination;
}

import { getApiUrl } from '../api/client';

export async function searchTrips(
  originStopId: string,
  destinationStopId: string,
  departureDate: string,
): Promise<TripSearchResult[]> {
  const query = new URLSearchParams({
    origin_stop_id: originStopId,
    destination_stop_id: destinationStopId,
    departure_date: departureDate,
  });
  const response = await fetch(getApiUrl(`/api/v1/trips/search?${query.toString()}`), {
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
  });
  const body = (await response.json()) as ApiResponse<TripSearchResult[]> & {
    message?: string;
    errors?: string[];
  };

  if (!response.ok) {
    const details = body.errors?.join('; ');
    throw new Error(
      details
        ? `${body.message ?? 'Không thể tìm chuyến'}: ${details}`
        : (body.message ?? `Không thể tìm chuyến (${response.status})`),
    );
  }

  if (!Array.isArray(body.data)) {
    throw new Error('Dữ liệu chuyến xe trả về không hợp lệ.');
  }
  return body.data;
}
