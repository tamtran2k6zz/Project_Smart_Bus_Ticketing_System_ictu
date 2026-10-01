/**
 * DTO phản hồi chi tiết vé điện tử (phục vụ màn hình hiển thị trên app khách hàng).
 */
export class TicketDetailDto {
  /** Mã vé điện tử (ticket_code) */
  ticket_code: string;

  /** Mã ghế ngồi (seat_number) */
  seat_code: string;

  /** Giá vé (VND) */
  price: number;

  /** Trạng thái vé: RESERVED | BOOKED | CHECKED_IN | CANCELLED */
  status: string;

  /** Tên hành khách (chủ sở hữu vé) */
  passenger_name: string;

  /** Tên tuyến xe */
  route_name: string;

  /** Trạm/điểm khởi hành (trạm đầu tiên của tuyến) */
  origin_stop: string;

  /** Trạm/điểm đến (trạm cuối cùng của tuyến) */
  destination_stop: string;

  /** Thời gian khởi hành (ISO 8601) */
  departure_time: string;

  /** Thời gian đến dự kiến (ISO 8601) */
  arrival_time: string;

  /** Biển số xe buýt */
  bus_plate_number: string;

  /** Loại xe buýt */
  bus_type: string;

  /** Tên tài xế */
  driver_name: string;

  /** Số điện thoại tài xế */
  driver_phone: string;

  /** Ảnh mã QR dạng Data URL (Base64): data:image/png;base64,... */
  qr_code_base64: string;
}
