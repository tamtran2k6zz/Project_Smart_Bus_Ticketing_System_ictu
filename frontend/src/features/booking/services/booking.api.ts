import { service } from '@/services/adapter';
import { audit, iso, uid, requireUser, tripAvailability } from '@/services/mocks/database';
import type { Database } from '@/services/mocks/database';
import type { Booking, Hold, Seat, Trip } from '../types';
import { localDay, time } from '@/utils/format';
import { journeyStops } from '../utils/journey';
export const getTrip = (db: Database, id: string) => {
  const trip = db.trips.find(t => t.id === id);
  if (!trip) throw new Error('Không tìm thấy chuyến.');
  return trip;
};
export const ownBooking = (db: Database, id: string, userId: string) => {
  requireUser(db, userId);
  const booking = db.bookings.find(b => b.id === id && b.userId === userId);
  if (!booking) throw new Error('Không tìm thấy đặt vé của bạn.');
  return booking;
};
export const bookingApi = {
  history: (userId: string) =>
    service<Booking[]>('/bookings', db => {
      requireUser(db, userId);
      return db.bookings.filter(b => b.userId === userId).reverse();
    }),
  search: (filters: Record<string, string>) =>
    service<Trip[]>('/trips?' + new URLSearchParams(filters), db =>
      db.trips
        .filter(t => {
          const r = db.routes.find(r => r.id === t.routeId && r.active);
          return (
            !!r &&
            !!journeyStops(r, db.stops, filters.from, filters.to) &&
            (!filters.date || localDay(new Date(t.departure)) === filters.date) &&
            (!filters.time || time(t.departure) >= filters.time)
          );
        })
        .map(t => ({ ...t, available: tripAvailability(db, t) }))
        .sort((a, b) => Date.parse(a.departure) - Date.parse(b.departure))
    ),
  trip: (id: string) =>
    service<Trip>('/trips/' + id, db => {
      const t = getTrip(db, id);
      return { ...t, available: tripAvailability(db, t) };
    }),
  seats: (id: string, userId: string) =>
    service<Seat[]>('/trips/' + id + '/seats', db => {
      const trip = getTrip(db, id);
      return Array.from({ length: trip.seatMode ? trip.capacity : 0 }, (_, i) => {
        const seat = String(i + 1).padStart(2, '0');
        const hold = db.holds.find(
          h => h.tripId === id && h.status === 'active' && h.seatIds.includes(seat)
        );
        const booked = db.bookings.some(
          b => b.tripId === id && b.status === 'paid' && b.seatIds.includes(seat)
        );
        return {
          id: seat,
          status: booked ? 'booked' : hold ? 'held' : 'available',
          mine: hold?.userId === userId,
        };
      });
    }),
  hold: (id: string, userId: string) =>
    service<Hold>('/holds/' + id, db => {
      requireUser(db, userId);
      const h = db.holds.find(h => h.id === id && h.userId === userId);
      if (!h) throw new Error('Không tìm thấy lượt giữ chỗ.');
      return { ...h, serverTime: iso() };
    }),
  createHold: (
    tripId: string,
    userId: string,
    seatIds: string[],
    quantity: number,
    journey: { from?: string; to?: string } = {}
  ) =>
    service<Hold>(
      '/holds',
      db => {
        requireUser(db, userId);
        const trip = getTrip(db, tripId);
        const route = db.routes.find(r => r.id === trip.routeId)!;
        const selectedJourney = route && journeyStops(route, db.stops, journey.from, journey.to);
        if (!selectedJourney) throw new Error('Điểm lên/xuống không thuộc tuyến theo đúng chiều.');
        if (
          !db.routes.some(r => r.id === trip.routeId && r.active) ||
          !db.vehicles.some(v => v.id === trip.vehicleId && v.active)
        )
          throw new Error('Tuyến hoặc xe tạm ngừng hoạt động. Chọn chuyến khác.');
        if (Date.parse(trip.departure) <= Date.now() || trip.status === 'completed')
          throw new Error('Chuyến đã khởi hành. Hãy chọn chuyến khác.');
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 6)
          throw new Error('Mỗi lượt đặt từ 1 đến 6 vé.');
        if (
          trip.seatMode &&
          (seatIds.length !== quantity ||
            new Set(seatIds).size !== quantity ||
            seatIds.some(
              s =>
                !Array.from({ length: trip.capacity }, (_, i) =>
                  String(i + 1).padStart(2, '0')
                ).includes(s)
            ))
        )
          throw new Error('Lựa chọn ghế không hợp lệ.');
        if (!trip.seatMode && seatIds.length) throw new Error('Chuyến này không gắn ghế.');
        const mine = db.holds.filter(
          h => h.tripId === tripId && h.userId === userId && h.status === 'active'
        );
        const conflicts =
          db.holds.some(
            h =>
              h.tripId === tripId &&
              h.status === 'active' &&
              h.userId !== userId &&
              h.seatIds.some(s => seatIds.includes(s))
          ) ||
          db.bookings.some(
            b =>
              b.tripId === tripId && b.status === 'paid' && b.seatIds.some(s => seatIds.includes(s))
          );
        if (conflicts) throw new Error('Ghế vừa được khách khác giữ hoặc đặt. Vui lòng chọn lại.');
        if (tripAvailability(db, trip) + mine.reduce((n, h) => n + h.quantity, 0) < quantity)
          throw new Error('Chuyến không đủ chỗ.');
        mine.forEach(h => {
          h.status = 'released';
          db.bookings
            .filter(b => b.holdId === h.id && b.status !== 'paid')
            .forEach(b => (b.status = 'canceled'));
        });
        const hold: Hold = {
          id: uid('h'),
          tripId,
          userId,
          seatIds,
          quantity,
          price: trip.price,
          expiresAt: new Date(Date.now() + 600000).toISOString(),
          serverTime: iso(),
          status: 'active',
          ...selectedJourney,
        };
        db.holds.push(hold);
        audit(db, userId, 'Giữ chỗ ' + tripId);
        return hold;
      },
      'POST',
      { tripId, seatIds, quantity, ...journey }
    ),
  release: (id: string, userId: string) =>
    service(
      '/holds/' + id,
      db => {
        requireUser(db, userId);
        const h = db.holds.find(h => h.id === id && h.userId === userId);
        if (h?.status === 'active') {
          h.status = 'released';
          db.bookings
            .filter(b => b.holdId === id && b.status !== 'paid')
            .forEach(b => (b.status = 'canceled'));
        }
        return true;
      },
      'DELETE'
    ),
  createBooking: (holdId: string, userId: string, name: string, phone: string, voucher: string) =>
    service<Booking>(
      '/bookings',
      db => {
        requireUser(db, userId);
        const hold = db.holds.find(
          h => h.id === holdId && h.userId === userId && h.status === 'active'
        );
        if (!hold) throw new Error('Giữ chỗ đã hết hạn. Vui lòng chọn lại.');
        if (name.trim().length < 2 || !/^(0|\+84)\d{9}$/.test(phone))
          throw new Error('Thông tin hành khách không hợp lệ.');
        const existing = db.bookings.find(b => b.holdId === holdId);
        if (existing) return existing;
        const promo = voucher
          ? db.vouchers.find(
              v =>
                v.code === voucher.toUpperCase() && v.active && Date.parse(v.expiresAt) > Date.now()
            )
          : undefined;
        if (voucher && !promo) throw new Error('Voucher không tồn tại hoặc đã hết hạn.');
        const subtotal = hold.price * hold.quantity;
        const discount = promo ? Math.round((subtotal * promo.percent) / 100) : 0;
        const b: Booking = {
          id: uid('b'),
          tripId: hold.tripId,
          userId,
          holdId,
          seatIds: hold.seatIds,
          quantity: hold.quantity,
          name,
          phone,
          total: subtotal - discount,
          discount,
          voucher: promo?.code,
          status: 'pending',
          createdAt: iso(),
          refund: 'none',
          boardingStopId: hold.boardingStopId,
          alightingStopId: hold.alightingStopId,
        };
        db.bookings.push(b);
        audit(db, userId, 'Tạo đặt vé ' + b.id);
        return b;
      },
      'POST',
      { holdId, name, phone, voucher }
    ),
  booking: (id: string, userId: string) =>
    service<Booking>('/bookings/' + id, db => ownBooking(db, id, userId)),
};
