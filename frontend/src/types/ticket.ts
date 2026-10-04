export interface TicketDetail {
  ticket_code: string;
  seat_code: string;
  price: number;
  status: string;
  passenger_name: string;
  route_name: string;
  origin_stop: string;
  destination_stop: string;
  departure_time: string;
  arrival_time: string;
  bus_plate_number: string;
  bus_type: string;
  driver_name: string;
  driver_phone: string;
  qr_code_base64: string;
}