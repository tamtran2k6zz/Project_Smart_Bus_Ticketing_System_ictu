import { transaction } from '../config/database';
import { notifyTripChange } from './trip-notification.service';

export async function rescheduleTrip(tripId: string, departure: string, arrival: string) {
  const start = new Date(departure),
    end = new Date(arrival);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start.getTime() <= Date.now() ||
    end <= start ||
    end.getTime() - start.getTime() > 86400000
  )
    throw Object.assign(new Error('Giờ chuyến mới không hợp lệ.'), { status: 400 });
  await transaction(async client => {
    const {
      rows: [trip],
    } = await client.query('SELECT * FROM trips WHERE id=$1 FOR UPDATE', [tripId]);
    if (!trip) throw Object.assign(new Error('Không tìm thấy chuyến.'), { status: 404 });
    if (trip.status !== 'SCHEDULED' || new Date(trip.departure_time).getTime() <= Date.now())
      throw Object.assign(new Error('Chỉ đổi giờ chuyến chưa chạy.'), { status: 409 });
    await client.query('SELECT id FROM buses WHERE id=$1 FOR UPDATE', [trip.bus_id]);
    const crew = [trip.driver_id, trip.conductor_id].filter(Boolean);
    await client.query('SELECT id FROM users WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE', [
      crew,
    ]);
    const { rows: conflicts } = await client.query(
      `SELECT id FROM trips WHERE id<>$1 AND status<>'CANCELLED' AND departure_time<$5 AND arrival_time>$4 AND (bus_id=$2 OR driver_id=ANY($3::text[]) OR conductor_id=ANY($3::text[]))`,
      [tripId, trip.bus_id, crew, start, end]
    );
    if (conflicts.length)
      throw Object.assign(new Error('Giờ mới trùng lịch xe hoặc tổ lái.'), { status: 409 });
    await client.query(
      'UPDATE trips SET departure_time=$2,arrival_time=$3,delay_minutes=0 WHERE id=$1',
      [tripId, start, end]
    );
  });
  await notifyTripChange(
    tripId,
    'Thay đổi giờ chuyến',
    'Giờ khởi hành mới: ' +
      start.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) +
      '. Vé và ghế đã đặt vẫn được giữ.'
  );
  return { tripId, departure: start.toISOString(), arrival: end.toISOString() };
}
