import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { seed, transact, loadDatabase } from './database';
import { appConfig } from '@/configs/app.config';
import { bookingApi } from '@/features/booking/services/booking.api';
import { paymentApi } from '@/features/payments/services/payment.api';
import { ticketsApi } from '@/features/tickets/services/tickets.api';
import { validateTicket } from '@/features/check-in/services/checkin.api';
import { reportsApi } from '@/features/reports/services/reports.api';
import { operationsApi } from '@/features/operations/services/operations.api';
import { notificationsApi } from '@/features/notifications/services/notifications.api';
import { trackingApi } from '@/features/tracking/services/tracking.api';
import { remainingSeconds } from '@/utils/format';
import { upcomingTrips } from '@/features/booking/utils/journey';
import { ticketState } from '@/features/tickets/utils/status';
const tripId = 't-1-1-0';
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-06T09:00:00+07:00'));
  localStorage.clear();
  localStorage.setItem(appConfig.demoStorageKey, JSON.stringify(seed()));
});
afterEach(() => vi.useRealTimers());
async function book(seat = '01') {
  const h = await bookingApi.createHold(tripId, 'u0', [seat], 1);
  const b = await bookingApi.createBooking(h.id, 'u0', 'Nguyễn Minh Anh', '0901234560', '');
  const p = await paymentApi.start(b.id, 'u0', 'MoMo');
  return { h, b, p };
}
async function paid(seat = '01') {
  const result = await book(seat);
  await paymentApi.confirmDemo(result.p.id, 'u0', 'paid');
  return result;
}
describe('demo business transactions', () => {
  it('finds ordered intermediate stops and persists the selected journey through checkout', async () => {
    const results = await bookingApi.search({
      from: 'Đại học ICTU',
      to: 'Hồ Núi Cốc',
      date: '2026-10-07',
    });
    expect(results).toHaveLength(6);
    expect(results.every(t => t.routeId === 'r2')).toBe(true);
    expect(await bookingApi.search({ from: 'Hồ Núi Cốc', to: 'Đại học ICTU' })).toHaveLength(0);
    const hold = await bookingApi.createHold(results[0].id, 'u0', ['01'], 1, {
      from: 'Đại học ICTU',
      to: 'Hồ Núi Cốc',
    });
    const booking = await bookingApi.createBooking(hold.id, 'u0', 'Minh Anh', '0901234560', '');
    expect(booking).toMatchObject({ boardingStopId: 's2', alightingStopId: 's3', total: 25000 });
    await expect(
      bookingApi.createHold(results[0].id, 'u0', ['02'], 1, {
        from: 'Hồ Núi Cốc',
        to: 'Đại học ICTU',
      })
    ).rejects.toThrow('đúng chiều');
  });
  it('sorts upcoming trips across routes and excludes completed trips', () => {
    const trips = seed().trips;
    const soon = upcomingTrips(trips).slice(0, 5);
    expect(soon.map(t => t.routeId)).toEqual(['r1', 'r2', 'r3', 'r1', 'r2']);
    expect(upcomingTrips([{ ...soon[0], status: 'completed' }])).toEqual([]);
  });
  it('derives expired ticket UI state at the exact expiry boundary', async () => {
    await paid();
    const ticket = (await ticketsApi.list('u0'))[0];
    expect(ticketState(ticket, Date.parse(ticket.expiresAt) - 1)).toBe('valid');
    expect(ticketState(ticket, Date.parse(ticket.expiresAt))).toBe('expired');
    expect(ticketState({ ...ticket, status: 'used' }, Date.parse(ticket.expiresAt))).toBe('used');
  });
  it('requires ordered route endpoints rather than unordered multiple selection', async () => {
    const route = seed().routes[1];
    await expect(
      operationsApi.save('routes', 'u4', { ...route, stopIds: ['s3', 's2', 's1'] })
    ).rejects.toThrow('đúng chiều');
    expect(await operationsApi.save('routes', 'u4', { ...route })).toMatchObject({
      stopIds: ['s1', 's2', 's3'],
    });
  });
  it('keeps station names/capacity linked and rejects overlapping assignments', async () => {
    const db = loadDatabase();
    await operationsApi.save('stops', 'u4', { ...db.stops[0], name: 'Bến xe Demo mới' });
    expect((await operationsApi.catalog()).routes[0].origin).toBe('Bến xe Demo mới');
    await operationsApi.save('vehicles', 'u4', { ...db.vehicles[0], capacity: 26 });
    expect((await bookingApi.trip(tripId)).capacity).toBe(26);
    await paid();
    await expect(
      operationsApi.save('vehicles', 'u4', { ...db.vehicles[0], capacity: 20 })
    ).rejects.toThrow('sức chứa');
    await expect(
      operationsApi.save('assignments', 'u4', { tripId: 't2', vehicleId: 'v1', staffId: 'st1' })
    ).rejects.toThrow('trùng giờ');
  });
  it('publishes station and incident notifications without duplicate subscriptions', async () => {
    await notificationsApi.subscribe('u0', tripId);
    await notificationsApi.subscribe('u0', tripId);
    expect(loadDatabase().subscriptions).toHaveLength(1);
    const day = Date.parse('2026-10-06T09:00:00+07:00');
    vi.setSystemTime(day - (day % 240000) + 105000);
    await trackingApi.location(tripId);
    await trackingApi.location(tripId);
    expect(
      (await notificationsApi.list('u0')).filter(n => n.title === 'Xe sắp đến trạm (demo)')
    ).toHaveLength(1);
    await operationsApi.reportIncident('u4', tripId, 'Xe đến trễ 10 phút do tắc đường.');
    expect((await notificationsApi.list('u0')).some(n => n.title === 'Cập nhật sự cố tuyến')).toBe(
      true
    );
  });
  it('preserves hold expiry on refresh and releases inventory after 10 minutes', async () => {
    const h = await bookingApi.createHold(tripId, 'u0', ['01'], 1);
    vi.advanceTimersByTime(120000);
    expect((await bookingApi.hold(h.id, 'u0')).expiresAt).toBe(h.expiresAt);
    expect(remainingSeconds(h.expiresAt, 0)).toBe(480);
    vi.advanceTimersByTime(480001);
    expect((await bookingApi.hold(h.id, 'u0')).status).toBe('expired');
    expect((await bookingApi.seats(tripId, 'u0'))[0].status).toBe('available');
    await expect(
      bookingApi.createBooking(h.id, 'u0', 'Minh Anh', '0901234560', '')
    ).rejects.toThrow('hết hạn');
  });
  it('rejects simultaneous seat claims, invalid seats and exceeding capacity', async () => {
    await bookingApi.createHold(tripId, 'u0', ['01'], 1);
    await expect(bookingApi.createHold(tripId, 'u4', ['01'], 1)).rejects.toThrow('khách khác');
    await expect(bookingApi.createHold(tripId, 'u0', ['99'], 1)).rejects.toThrow('không hợp lệ');
    await expect(bookingApi.createHold(tripId, 'u0', ['02', '02'], 2)).rejects.toThrow(
      'không hợp lệ'
    );
  });
  it('supports unassigned-seat purchases and uses service prices/voucher', async () => {
    const h = await bookingApi.createHold('t-1-0-0', 'u0', [], 2);
    expect(h.price).toBe(15000);
    const b = await bookingApi.createBooking(h.id, 'u0', 'Minh Anh', '0901234560', 'SMART10');
    expect(b.total).toBe(27000);
    expect(b.seatIds).toEqual([]);
    await expect(bookingApi.createHold('t-1-0-0', 'u4', ['01'], 1)).rejects.toThrow(
      'không gắn ghế'
    );
  });
  it('issues no QR for pending/failed, is idempotent after confirmed payment', async () => {
    const { b, p } = await book();
    expect(await ticketsApi.list('u0')).toHaveLength(0);
    expect((await paymentApi.start(b.id, 'u0', 'MoMo')).id).toBe(p.id);
    await paymentApi.confirmDemo(p.id, 'u0', 'failed');
    expect(await ticketsApi.list('u0')).toHaveLength(0);
    const retry = await paymentApi.start(b.id, 'u0', 'VNPay');
    await paymentApi.confirmDemo(retry.id, 'u0', 'paid');
    await paymentApi.confirmDemo(retry.id, 'u0', 'paid');
    expect(await ticketsApi.list('u0')).toHaveLength(1);
    expect((await bookingApi.booking(b.id, 'u0')).status).toBe('paid');
  });
  it('rejects late confirmation and foreign booking access', async () => {
    const { b, p } = await book();
    await expect(bookingApi.booking(b.id, 'u4')).rejects.toThrow('của bạn');
    vi.advanceTimersByTime(600001);
    await expect(paymentApi.confirmDemo(p.id, 'u0', 'paid')).rejects.toThrow('hết hạn');
    expect(await ticketsApi.list('u0')).toHaveLength(0);
  });
  it('validates wrong/expired/wrong-trip/reused QR and checks staff assignment', async () => {
    await paid();
    const t = (await ticketsApi.list('u0'))[0];
    expect((await validateTicket('u4', tripId, 'invalid')).valid).toBe(false);
    expect((await validateTicket('u4', 't1', t.token)).message).toContain('chuyến khác');
    await expect(validateTicket('u1', tripId, t.token)).rejects.toThrow('phân công');
    expect((await validateTicket('u4', tripId, t.token)).valid).toBe(true);
    expect((await validateTicket('u4', tripId, t.token)).message).toContain('đã được sử dụng');
    await paid('02');
    const t2 = (await ticketsApi.list('u0'))[0];
    vi.setSystemTime(new Date(Date.parse(t2.expiresAt) + 1000));
    expect((await validateTicket('u4', tripId, t2.token)).message).toContain('hết hạn');
  });
  it('links cancellation to capacity, pending refund and revenue', async () => {
    const { b } = await paid();
    const t = (await ticketsApi.list('u0'))[0];
    await ticketsApi.request(t.id, 'u0', 'cancel');
    await ticketsApi.resolve(t.id, 'u4', true);
    expect((await bookingApi.seats(tripId, 'u0'))[0].status).toBe('available');
    expect((await bookingApi.booking(b.id, 'u0')).refund).toBe('pending');
    const filter = { from: '2026-10-07', to: '2026-10-07', routeId: 'r2' };
    expect((await reportsApi.get('u4', filter)).revenue).toBe(25000);
    await ticketsApi.refund(b.id, 'u4');
    expect((await reportsApi.get('u4', filter)).revenue).toBe(0);
  });
  it('updates linked trip on exchange and rejects deletion of referenced resources', async () => {
    const { b } = await paid();
    const t = (await ticketsApi.list('u0'))[0];
    await ticketsApi.request(t.id, 'u0', 'exchange', 't-1-1-1');
    await ticketsApi.resolve(t.id, 'u4', true);
    expect((await bookingApi.booking(b.id, 'u0')).tripId).toBe('t-1-1-1');
    expect((await ticketsApi.detail(t.id, 'u0')).tripId).toBe('t-1-1-1');
    await expect(operationsApi.remove('routes', 'u4', 'r2')).rejects.toThrow('được sử dụng');
  });
  it('enforces service permissions and report filters', async () => {
    await paid();
    await expect(
      reportsApi.get('u0', { from: '2026-10-07', to: '2026-10-07', routeId: '' })
    ).rejects.toThrow('quyền');
    const report = await reportsApi.get('u4', {
      from: '2026-10-07',
      to: '2026-10-07',
      routeId: 'r1',
    });
    expect(report.revenue).toBe(0);
    expect(report.rows.every(r => r.routeId === 'r1' && r.date === '2026-10-07')).toBe(true);
    await transact(db => {
      db.users.find(u => u.id === 'u0')!.active = false;
    });
    await expect(bookingApi.history('u0')).rejects.toThrow('vô hiệu hóa');
    expect(loadDatabase().audits.length).toBeGreaterThan(0);
  });
});
