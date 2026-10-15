import { query, transaction } from '../config/database';
import { notifyTripChange } from './trip-notification.service';
const fail = (message: string, status = 400): never => {
  throw Object.assign(new Error(message), { status });
};
export async function assignCrew(data: any) {
  const result = await transaction(async client => {
    const {
      rows: [trip],
    } = await client.query('SELECT * FROM trips WHERE id=$1 FOR UPDATE', [data.tripId]);
    if (!trip) fail('Không tìm thấy chuyến.', 404);
    if (trip.status !== 'SCHEDULED') fail('Chỉ phân công chuyến chưa chạy.', 409);
    const {
      rows: [bus],
    } = await client.query("SELECT * FROM buses WHERE id=$1 AND status='READY' FOR UPDATE", [
      data.vehicleId,
    ]);
    if (!bus) fail('Xe không hoạt động.');
    const staffIds = [data.staffId, ...(data.conductorId ? [data.conductorId] : [])];
    if (!data.staffId || new Set(staffIds).size !== staffIds.length)
      fail('Tài xế và phụ xe phải là hai nhân sự khác nhau.');
    const { rows: staff } = await client.query(
      "SELECT s.id,s.user_id FROM staff_profiles s JOIN users u ON u.id=s.user_id WHERE s.id=ANY($1::text[]) AND u.status='ACTIVE' AND u.role='DRIVER' ORDER BY u.id FOR UPDATE OF u",
      [staffIds]
    );
    if (staff.length !== staffIds.length) fail('Nhân sự không hoạt động.');
    const driver = staff.find(s => s.id === data.staffId)!.user_id,
      conductor = data.conductorId ? staff.find(s => s.id === data.conductorId)!.user_id : null;
    const { rows: busy } = await client.query(
      `SELECT id FROM trips WHERE id<>$1 AND status<>'CANCELLED' AND archived_at IS NULL AND departure_time<$5 AND arrival_time>$4 AND (bus_id=$2 OR driver_id=ANY($3::text[]) OR conductor_id=ANY($3::text[]))`,
      [trip.id, bus.id, staff.map(s => s.user_id), trip.departure_time, trip.arrival_time]
    );
    if (busy.length) fail('Xe hoặc tổ lái trùng lịch.', 409);
    if (bus.id !== trip.bus_id) {
      const { rows: held } = await client.query(
        "SELECT id FROM trip_seats WHERE trip_id=$1 AND (status IN ('BOOKED','CHECKED_IN') OR (status='LOCKED' AND lock_expires_at>NOW()))",
        [trip.id]
      );
      if (held.length) fail('Không đổi xe khi đã có vé hoặc giữ chỗ.', 409);
      await client.query('DELETE FROM trip_seats WHERE trip_id=$1', [trip.id]);
    }
    await client.query(
      'UPDATE trips SET bus_id=$2,driver_id=$3,conductor_id=$4,total_seats=$5 WHERE id=$1',
      [trip.id, bus.id, driver, conductor, bus.total_seats]
    );
    return {
      id: trip.id,
      tripId: trip.id,
      vehicleId: bus.id,
      staffId: data.staffId,
      conductorId: data.conductorId || '',
    };
  });
  await notifyTripChange(
    data.tripId,
    'Cập nhật chuyến xe',
    'Nhà xe đã cập nhật xe hoặc tổ lái cho chuyến của bạn.'
  );
  return result;
}
export async function listCrew(archived = false) {
  return query<any[]>(
    `SELECT t.id,t.id AS "tripId",t.bus_id AS "vehicleId",s.id AS "staffId",COALESCE(c.id,'') AS "conductorId"
    FROM trips t JOIN staff_profiles s ON s.user_id=t.driver_id LEFT JOIN staff_profiles c ON c.user_id=t.conductor_id WHERE (t.archived_at IS NOT NULL)=$1`,
    [archived]
  );
}
