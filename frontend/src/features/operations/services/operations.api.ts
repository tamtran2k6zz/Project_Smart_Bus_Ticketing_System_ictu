import { service } from '@/services/adapter';
import { audit, requireUser, uid, tripAvailability, notify } from '@/services/mocks/database';
import { can } from '@/configs/permissions';
import { getTrip } from '@/features/booking/services/booking.api';
import { resourceSchemas } from '../schemas/resources';
import type { Assignment, Incident, Route, Staff, Stop, Vehicle } from '../types';
import type { Trip } from '@/features/booking/types';
export type Resource = 'routes' | 'stops' | 'vehicles' | 'staff' | 'trips' | 'assignments';
export interface Catalog {
  routes: Route[];
  stops: Stop[];
  vehicles: Vehicle[];
  trips: Trip[];
}
export const operationsApi = {
  catalog: () =>
    service<Catalog>('/catalog', db => ({
      routes: db.routes,
      stops: db.stops,
      vehicles: db.vehicles,
      trips: db.trips.map(t => ({ ...t, available: tripAvailability(db, t) })),
    })),
  list: (key: Resource, userId: string) =>
    service<(Route | Stop | Vehicle | Staff | Trip | Assignment)[]>('/operations/' + key, db => {
      if (!can(requireUser(db, userId), 'operations')) throw new Error('Không có quyền vận hành.');
      return db[key];
    }),
  save: (key: Resource, userId: string, data: Record<string, unknown>) =>
    service(
      '/operations/' + key + (data.id ? '/' + data.id : ''),
      db => {
        if (!can(requireUser(db, userId), 'operations'))
          throw new Error('Không có quyền vận hành.');
        const parsed = resourceSchemas[key].parse(data);
        const previous = (db[key] as unknown as Record<string, unknown>[]).find(
          row => row.id === data.id
        );
        if (key === 'routes') {
          const r = parsed as unknown as Route;
          if (r.origin === r.destination) throw new Error('Điểm đi và đến phải khác nhau.');
          if (r.stopIds.some(id => !db.stops.some(s => s.id === id)))
            throw new Error('Trạm không tồn tại.');
          if (
            new Set(r.stopIds).size !== r.stopIds.length ||
            db.stops.find(s => s.id === r.stopIds[0])?.name !== r.origin ||
            db.stops.find(s => s.id === r.stopIds[r.stopIds.length - 1])?.name !== r.destination
          )
            throw new Error(
              'Xếp trạm theo đúng chiều: điểm đầu ở đầu danh sách, điểm cuối ở cuối danh sách.'
            );
          if (
            !db.stops.some(s => s.name === r.origin) ||
            !db.stops.some(s => s.name === r.destination)
          )
            throw new Error('Chọn điểm đi/đến từ danh mục trạm.');
        }
        if (key === 'trips') {
          const t = parsed as unknown as Trip;
          const route = db.routes.find(r => r.id === t.routeId && r.active);
          const vehicle = db.vehicles.find(v => v.id === t.vehicleId && v.active);
          if (!route || !vehicle) throw new Error('Tuyến hoặc xe không hoạt động.');
          if (Date.parse(t.departure) <= Date.now())
            throw new Error('Giờ khởi hành phải ở tương lai.');
          t.price = route.price;
          t.capacity = vehicle.capacity;
          t.available = vehicle.capacity;
          if (data.id && db.holds.some(h => h.tripId === data.id && h.status === 'active'))
            throw new Error('Chuyến có giữ chỗ, chưa thể đổi lịch.');
          if (data.id && db.bookings.some(b => b.tripId === data.id && b.status === 'paid'))
            throw new Error('Chuyến có vé, chưa thể sửa cấu hình.');
        }
        if (key === 'vehicles') {
          const vehicle = parsed as unknown as Vehicle;
          if (
            previous &&
            previous.capacity !== vehicle.capacity &&
            db.trips.some(
              t =>
                t.vehicleId === data.id &&
                (db.bookings.some(b => b.tripId === t.id && b.status === 'paid') ||
                  db.holds.some(h => h.tripId === t.id && h.status === 'active'))
            )
          )
            throw new Error('Không đổi sức chứa xe khi chuyến có vé hoặc giữ chỗ.');
        }
        if (
          key === 'staff' &&
          !db.users.some(
            u => u.id === (parsed as unknown as Staff).userId && u.role === 'DRIVER' && u.active
          )
        )
          throw new Error('Nhân sự phải liên kết tài khoản tài xế đang hoạt động.');
        if (key === 'assignments') {
          const a = parsed as unknown as Assignment;
          const trip = getTrip(db, a.tripId);
          if (
            !db.vehicles.some(v => v.id === a.vehicleId && v.active) ||
            !db.staff.some(s => s.id === a.staffId)
          )
            throw new Error('Xe/nhân sự không tồn tại.');
          if (
            db.assignments.some(
              x =>
                x.id !== data.id &&
                (x.tripId === a.tripId ||
                  (Date.parse(getTrip(db, x.tripId).departure) <
                    Date.parse(trip.departure) + trip.duration * 60000 &&
                    Date.parse(trip.departure) <
                      Date.parse(getTrip(db, x.tripId).departure) +
                        getTrip(db, x.tripId).duration * 60000 &&
                    (x.vehicleId === a.vehicleId || x.staffId === a.staffId)))
            )
          )
            throw new Error('Chuyến đã phân công hoặc xe/nhân sự trùng giờ.');
          const vehicle = db.vehicles.find(v => v.id === a.vehicleId)!;
          if (
            vehicle.capacity !== trip.capacity &&
            (db.bookings.some(b => b.tripId === trip.id && b.status === 'paid') ||
              db.holds.some(h => h.tripId === trip.id && h.status === 'active'))
          )
            throw new Error('Không đổi sức chứa khi chuyến có vé hoặc giữ chỗ.');
          trip.vehicleId = a.vehicleId;
          trip.capacity = vehicle.capacity;
        }
        const rows = db[key] as unknown as Record<string, unknown>[];
        const record = { ...parsed, id: typeof data.id === 'string' ? data.id : uid(key) };
        const index = rows.findIndex(r => r.id === record.id);
        if (index < 0) rows.push(record);
        else rows[index] = record;
        if (key === 'stops' && previous) {
          const stop = record as unknown as Stop;
          db.routes.forEach(route => {
            if (route.origin === previous.name) route.origin = stop.name;
            if (route.destination === previous.name) route.destination = stop.name;
          });
        }
        if (key === 'vehicles') {
          const vehicle = record as unknown as Vehicle;
          db.trips
            .filter(t => t.vehicleId === vehicle.id)
            .forEach(t => (t.capacity = vehicle.capacity));
        }
        if (key === 'routes') {
          const route = record as unknown as Route;
          db.trips.filter(t => t.routeId === route.id).forEach(t => (t.price = route.price));
        }
        audit(db, userId, 'Lưu ' + key + ' ' + record.id);
        return record;
      },
      data.id ? 'PUT' : 'POST',
      data
    ),
  remove: (key: Resource, userId: string, id: string) =>
    service(
      '/operations/' + key + '/' + id,
      db => {
        if (!can(requireUser(db, userId), 'operations')) throw new Error('Không có quyền.');
        const referenced =
          key === 'routes'
            ? db.trips.some(t => t.routeId === id) || db.passes.some(p => p.routeId === id)
            : key === 'stops'
              ? db.routes.some(
                  r =>
                    r.stopIds.includes(id) ||
                    r.origin === db.stops.find(s => s.id === id)?.name ||
                    r.destination === db.stops.find(s => s.id === id)?.name
                )
              : key === 'vehicles'
                ? db.trips.some(t => t.vehicleId === id) ||
                  db.assignments.some(a => a.vehicleId === id)
                : key === 'staff'
                  ? db.assignments.some(a => a.staffId === id)
                  : key === 'trips'
                    ? db.holds.some(h => h.tripId === id) ||
                      db.bookings.some(b => b.tripId === id) ||
                      db.assignments.some(a => a.tripId === id)
                    : false;
        if (referenced)
          throw new Error('Bản ghi đang được sử dụng. Hãy chỉnh sửa hoặc ngừng hoạt động.');
        const rows = db[key];
        const index = rows.findIndex(r => r.id === id);
        if (index < 0) throw new Error('Bản ghi không tồn tại.');
        rows.splice(index, 1);
        audit(db, userId, 'Xóa ' + key + ' ' + id);
        return true;
      },
      'DELETE'
    ),
  assigned: (userId: string) =>
    service<Trip[]>('/staff/trips', db => {
      const user = requireUser(db, userId);
      if (!can(user, 'check-in')) throw new Error('Không có quyền.');
      const staffIds = db.staff.filter(s => s.userId === userId).map(s => s.id);
      return user.role === 'DRIVER'
        ? db.trips.filter(t =>
            db.assignments.some(a => a.tripId === t.id && staffIds.includes(a.staffId))
          )
        : db.trips;
    }),
  incidents: (tripId?: string) =>
    service<Incident[]>('/incidents' + (tripId ? '?tripId=' + tripId : ''), db =>
      db.incidents.filter(i => !tripId || i.tripId === tripId)
    ),
  reportIncident: (userId: string, tripId: string, message: string) =>
    service<Incident>(
      '/incidents',
      db => {
        const user = requireUser(db, userId);
        if (!can(user, 'check-in')) throw new Error('Không có quyền.');
        if (
          user.role === 'DRIVER' &&
          !db.assignments.some(
            a =>
              a.tripId === tripId && db.staff.some(s => s.id === a.staffId && s.userId === userId)
          )
        )
          throw new Error('Chuyến chưa được phân công cho bạn.');
        getTrip(db, tripId);
        if (message.trim().length < 10) throw new Error('Mô tả sự cố ít nhất 10 ký tự.');
        const incident: Incident = {
          id: uid('i'),
          tripId,
          message,
          createdAt: new Date().toISOString(),
          resolved: false,
        };
        db.incidents.unshift(incident);
        db.subscriptions
          ?.filter(s => s.tripId === tripId)
          .forEach(s =>
            notify(db, s.userId, 'Cập nhật sự cố tuyến', message, '/tracking/' + tripId)
          );
        audit(db, userId, 'Báo sự cố ' + tripId);
        return incident;
      },
      'POST',
      { tripId, message }
    ),
  resolveIncident: (userId: string, id: string) =>
    service(
      '/incidents/' + id,
      db => {
        if (!can(requireUser(db, userId), 'operations')) throw new Error('Không có quyền.');
        const i = db.incidents.find(i => i.id === id);
        if (!i) throw new Error('Sự cố không tồn tại.');
        i.resolved = true;
        audit(db, userId, 'Xử lý sự cố ' + id);
        return i;
      },
      'PUT',
      { resolved: true }
    ),
};
