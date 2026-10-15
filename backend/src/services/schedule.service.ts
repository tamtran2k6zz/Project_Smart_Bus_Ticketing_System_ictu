import { randomUUID } from 'crypto';
import { transaction } from '../config/database';

const fail = (message: string, status = 400): never => {
  throw Object.assign(new Error(message), { status });
};

export interface ScheduleConfig {
  from: string;
  to: string;
  startTime: string;
  endTime: string;
  headway: number;
  duration: number;
  weekdays: number[];
  name: string;
  vehicleIds: string[];
  routeId: string;
  driverIds?: string[];
  conductorIds?: string[];
}

export function scheduleSlots(config: ScheduleConfig) {
  const { from, to, startTime, endTime, headway, duration, weekdays } = config;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
    from > to ||
    !/^\d{2}:\d{2}$/.test(startTime) ||
    !/^\d{2}:\d{2}$/.test(endTime) ||
    !Number.isInteger(headway) ||
    headway < 5 ||
    headway > 1440 ||
    !Number.isInteger(duration) ||
    duration < 5 ||
    duration > 1440 ||
    !Array.isArray(weekdays) ||
    !weekdays.length ||
    weekdays.some((d: number) => !Number.isInteger(d) || d < 0 || d > 6)
  )
    fail('Khoảng ngày, giờ, tần suất hoặc ngày trong tuần không hợp lệ.');
  const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const start = minutes(startTime),
    end = minutes(endTime);
  if (
    start > end ||
    start > 1439 ||
    end > 1439 ||
    Number(startTime.slice(3)) > 59 ||
    Number(endTime.slice(3)) > 59
  )
    fail('Khung giờ không hợp lệ.');
  const first = Date.parse(from + 'T00:00:00+07:00'),
    last = Date.parse(to + 'T00:00:00+07:00');
  if (!Number.isFinite(first) || !Number.isFinite(last) || (last - first) / 86400000 > 30)
    fail('Chỉ sinh lịch tối đa 31 ngày.');
  if (
    new Date(first + 7 * 3600000).toISOString().slice(0, 10) !== from ||
    new Date(last + 7 * 3600000).toISOString().slice(0, 10) !== to
  )
    fail('Ngày không tồn tại trong lịch.');
  const slots: string[] = [];
  for (let day = first; day <= last; day += 86400000) {
    const weekday = new Date(day + 7 * 3600000).getUTCDay();
    if (!weekdays.includes(weekday)) continue;
    for (let minute = start; minute <= end; minute += headway) {
      const time = day + minute * 60000;
      if (time <= Date.now()) continue;
      slots.push(new Date(time).toISOString());
      if (slots.length > 300) fail('Tối đa 300 chuyến mỗi lần sinh lịch.');
    }
  }
  if (!slots.length) fail('Không có chuyến tương lai trong lịch.');
  return slots;
}

export async function createSchedule(actor: string, data: ScheduleConfig) {
  const slots = scheduleSlots(data);
  if (
    typeof data.name !== 'string' ||
    data.name.trim().length < 2 ||
    !Array.isArray(data.vehicleIds) ||
    !data.vehicleIds.length ||
    data.vehicleIds.some((x: string) => typeof x !== 'string') ||
    new Set(data.vehicleIds).size !== data.vehicleIds.length
  )
    fail('Nhập tên lịch và chọn đội xe hợp lệ.');
  const vehicleIds = [...data.vehicleIds].sort() as string[];
  return transaction(async client => {
    const {
      rows: [route],
    } = await client.query(
      "SELECT * FROM routes WHERE id=$1 AND status='ACTIVE' AND deleted_at IS NULL FOR UPDATE",
      [data.routeId]
    );
    if (!route) fail('Tuyến không hoạt động.');
    const { rows: vehicles } = await client.query(
      "SELECT * FROM buses WHERE id=ANY($1::text[]) AND status='READY' ORDER BY id FOR UPDATE",
      [vehicleIds]
    );
    if (vehicles.length !== vehicleIds.length) fail('Đội xe không hoạt động.');
    const id = randomUUID();
    await client.query(
      'INSERT INTO schedule_templates(id,name,route_id,config,created_by) VALUES($1,$2,$3,$4,$5)',
      [id, data.name.trim(), data.routeId, JSON.stringify(data), actor]
    );
    for (let i = 0; i < slots.length; i++) {
      const bus = vehicles[i % vehicles.length],
        departure = slots[i],
        arrival = new Date(Date.parse(departure) + data.duration * 60000).toISOString();
      const { rows: busy } = await client.query(
        "SELECT id FROM trips WHERE bus_id=$1 AND status<>'CANCELLED' AND archived_at IS NULL AND departure_time<$3 AND arrival_time>$2",
        [bus.id, departure, arrival]
      );
      if (busy.length)
        fail(
          'Xe ' +
            bus.plate_number +
            ' trùng lịch tại ' +
            departure +
            '. Tăng số xe hoặc giãn tần suất.',
          409
        );
      const tripId = randomUUID();
      await client.query(
        'INSERT INTO trips(id,route_id,bus_id,departure_time,arrival_time,base_price,total_seats,schedule_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [tripId, route.id, bus.id, departure, arrival, route.base_price, bus.total_seats, id]
      );
    }
    return { id, name: data.name, count: slots.length, departures: slots };
  });
}
