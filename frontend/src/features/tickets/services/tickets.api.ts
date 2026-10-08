import { service } from '@/services/adapter';
import { audit, notify, requireUser, tripAvailability } from '@/services/mocks/database';
import { getTrip } from '@/features/booking/services/booking.api';
import { can } from '@/configs/permissions';
import type { Ticket } from '../types';
export const ticketsApi = {
  list: (userId: string) =>
    service<Ticket[]>('/tickets', db => {
      requireUser(db, userId);
      return db.tickets.filter(t => t.userId === userId).reverse();
    }),
  detail: (id: string, userId: string) =>
    service<Ticket>('/tickets/' + id, db => {
      requireUser(db, userId);
      const t = db.tickets.find(t => t.id === id && t.userId === userId);
      if (!t) throw new Error('Không tìm thấy vé của bạn.');
      return t;
    }),
  request: (id: string, userId: string, kind: 'cancel' | 'exchange', exchangeTripId?: string) =>
    service<Ticket>(
      '/tickets/' + id + '/requests',
      db => {
        requireUser(db, userId);
        const t = db.tickets.find(t => t.id === id && t.userId === userId);
        if (!t || t.status !== 'valid' || t.request)
          throw new Error('Vé không đủ điều kiện gửi yêu cầu.');
        const trip = getTrip(db, t.tripId);
        if (Date.parse(trip.departure) - Date.now() < 30 * 60000)
          throw new Error('Yêu cầu phải gửi trước giờ khởi hành ít nhất 30 phút.');
        if (kind === 'exchange') {
          const target = getTrip(db, exchangeTripId || '');
          if (
            target.id === trip.id ||
            target.routeId !== trip.routeId ||
            target.seatMode !== trip.seatMode ||
            Date.parse(target.departure) <= Date.now()
          )
            throw new Error('Chọn chuyến khác cùng tuyến và cùng loại vé.');
        }
        t.request = kind;
        t.exchangeTripId = exchangeTripId;
        audit(db, userId, 'Yêu cầu ' + kind + ' ' + id);
        notify(
          db,
          userId,
          'Đã nhận yêu cầu vé',
          'Điều hành sẽ xử lý yêu cầu của bạn.',
          '/account/tickets/' + id
        );
        return t;
      },
      'POST',
      { kind, exchangeTripId }
    ),
  requests: (userId: string) =>
    service<Ticket[]>('/ticket-requests', db => {
      if (!can(requireUser(db, userId), 'support')) throw new Error('Không có quyền xử lý vé.');
      return db.tickets.filter(t => t.request);
    }),
  resolve: (id: string, userId: string, approve: boolean) =>
    service(
      '/ticket-requests/' + id,
      db => {
        if (!can(requireUser(db, userId), 'support')) throw new Error('Không có quyền.');
        const t = db.tickets.find(t => t.id === id && t.request);
        if (!t) throw new Error('Không tìm thấy yêu cầu.');
        const b = db.bookings.find(b => b.id === t.bookingId)!;
        if (approve && t.request === 'cancel') {
          t.status = 'canceled';
          b.status = 'canceled';
          b.refund = 'pending';
        }
        if (approve && t.request === 'exchange') {
          const target = getTrip(db, t.exchangeTripId || '');
          const original = getTrip(db, t.tripId);
          if (
            Date.parse(target.departure) <= Date.now() ||
            target.routeId !== original.routeId ||
            target.seatMode !== original.seatMode
          )
            throw new Error('Chuyến đổi không còn phù hợp. Hãy từ chối yêu cầu để khách chọn lại.');
          if (tripAvailability(db, target) < b.quantity)
            throw new Error('Chuyến đổi không đủ chỗ.');
          const busy = new Set([
            ...db.holds
              .filter(h => h.tripId === target.id && h.status === 'active')
              .flatMap(h => h.seatIds),
            ...db.bookings
              .filter(x => x.tripId === target.id && x.status === 'paid')
              .flatMap(x => x.seatIds),
          ]);
          b.seatIds = target.seatMode
            ? Array.from({ length: target.capacity }, (_, i) => String(i + 1).padStart(2, '0'))
                .filter(s => !busy.has(s))
                .slice(0, b.quantity)
            : [];
          b.tripId = target.id;
          t.tripId = target.id;
          t.expiresAt = new Date(
            Date.parse(target.departure) + (target.duration + 90) * 60000
          ).toISOString();
        }
        delete t.request;
        delete t.exchangeTripId;
        audit(db, userId, 'Xử lý yêu cầu vé ' + id);
        notify(
          db,
          t.userId,
          'Yêu cầu vé đã xử lý',
          approve ? 'Yêu cầu đã được chấp nhận (demo).' : 'Yêu cầu đã bị từ chối.',
          '/account/tickets/' + id
        );
        return t;
      },
      'PUT',
      { approve }
    ),
  refund: (bookingId: string, userId: string) =>
    service(
      '/refunds/' + bookingId,
      db => {
        if (!can(requireUser(db, userId), 'reports')) throw new Error('Không có quyền hoàn tiền.');
        const b = db.bookings.find(b => b.id === bookingId && b.refund === 'pending');
        if (!b) throw new Error('Không có khoản hoàn đang chờ.');
        b.refund = 'refunded';
        notify(
          db,
          b.userId,
          'Hoàn tiền demo hoàn tất',
          'Không có tiền thật được chuyển.',
          '/account/tickets'
        );
        audit(db, userId, 'Hoàn tiền demo ' + bookingId);
        return b;
      },
      'POST'
    ),
};
