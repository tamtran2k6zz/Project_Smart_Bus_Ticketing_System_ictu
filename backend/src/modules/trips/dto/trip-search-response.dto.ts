export class TripSearchResultDto {
  trip_id: string;
  route_name: string;
  bus_type: string;
  departure_time_at_origin: string; // ISO 8601 string
  arrival_time_at_destination: string; // ISO 8601 string
  duration_minutes: number;
  available_seats: number;
  price: number;
}

export class SearchTripsResponseDto {
  data: TripSearchResultDto[];
  pagination: {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
  };
}
