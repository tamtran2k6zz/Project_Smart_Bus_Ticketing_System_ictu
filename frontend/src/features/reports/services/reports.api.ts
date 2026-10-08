import { service } from '@/services/adapter';
import { requireUser } from '@/services/mocks/database';
import { can } from '@/configs/permissions';
import { localDay } from '@/utils/format';
import type { Report, ReportRow } from '../types';
export interface ReportFilter {
  from: string;
  to: string;
  routeId: string;
}
export const reportsApi = {
  get: (userId: string, filter: ReportFilter) =>
    service<Report>('/reports?' + new URLSearchParams({ ...filter }), db => {
      if (!can(requireUser(db, userId), 'reports') && !can(requireUser(db, userId), 'operations'))
        throw new Error('Không có quyền.');
      if (filter.from > filter.to) throw new Error('Ngày bắt đầu phải trước ngày kết thúc.');
      const rows: ReportRow[] = [];
      db.trips
        .filter(t => {
          const day = localDay(new Date(t.departure));
          return (
            day >= filter.from &&
            day <= filter.to &&
            (!filter.routeId || t.routeId === filter.routeId)
          );
        })
        .forEach(t => {
          const bookings = db.bookings.filter(b => b.tripId === t.id);
          const paid = bookings.filter(b => b.status === 'paid');
          const net = bookings.filter(
            b => b.status === 'paid' || (b.status === 'canceled' && b.refund === 'pending')
          );
          const date = localDay(new Date(t.departure));
          let row = rows.find(r => r.routeId === t.routeId && r.date === date);
          if (!row) {
            row = {
              routeId: t.routeId,
              route: db.routes.find(r => r.id === t.routeId)!.name,
              date,
              revenue: 0,
              tickets: 0,
              capacity: 0,
              occupancy: 0,
            };
            rows.push(row);
          }
          row.revenue += net.reduce((sum, b) => sum + b.total, 0);
          row.tickets += paid.reduce((sum, b) => sum + b.quantity, 0);
          row.capacity += t.capacity;
        });
      rows.forEach(r => (r.occupancy = Math.round((r.tickets / r.capacity) * 100)));
      const tickets = rows.reduce((n, r) => n + r.tickets, 0),
        capacity = rows.reduce((n, r) => n + r.capacity, 0);
      return {
        rows,
        revenue: rows.reduce((n, r) => n + r.revenue, 0),
        tickets,
        occupancy: capacity ? Math.round((tickets / capacity) * 100) : 0,
        refunds: db.bookings
          .filter(
            b =>
              b.refund !== 'none' &&
              db.trips.some(
                t =>
                  t.id === b.tripId &&
                  rows.some(
                    r => r.routeId === t.routeId && r.date === localDay(new Date(t.departure))
                  )
              )
          )
          .map(b => ({ id: b.id, total: b.total, refund: b.refund })),
      };
    }),
};
