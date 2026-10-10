import { service } from '@/services/adapter';
import { audit, requireUser } from '@/services/mocks/database';
import { can } from '@/configs/permissions';
import type { CheckedInPassenger, ValidationResult } from '../types';

/** Danh sách vé đã soát của một chuyến, cập nhật từ nguồn dữ liệu demo qua polling. */
export const listCheckedInPassengers = (tripId: string) =>
  service<CheckedInPassenger[]>(
    '/ticket-validations/checked-in?tripId=' + encodeURIComponent(tripId),
    db =>
      db.tickets
        .filter(ticket => ticket.tripId === tripId && ticket.status === 'used')
        .map(ticket => {
          const booking = db.bookings.find(item => item.id === ticket.bookingId);
          return {
            ticketId: ticket.id,
            ticketCode: ticket.token,
            passengerName: booking?.name || 'Hành khách',
            seatNumbers: booking?.seatIds ?? [],
            quantity: Math.max(1, booking?.quantity ?? 1),
            checkedInAt: ticket.checkedInAt ?? '',
          };
        })
        .sort((a, b) => {
          const aTime = Date.parse(a.checkedInAt || '1970-01-01T00:00:00.000Z');
          const bTime = Date.parse(b.checkedInAt || '1970-01-01T00:00:00.000Z');
          return bTime - aTime;
        })
  );

export const validateTicket = (userId: string, tripId: string, token: string) =>
  service<ValidationResult>(
    '/ticket-validations',
    db => {
      const user = requireUser(db, userId);
      if (!can(user, 'check-in')) throw new Error('Không có quyền soát vé.');
      if (
        user.role === 'DRIVER' &&
        !db.assignments.some(
          a => a.tripId === tripId && db.staff.some(s => s.id === a.staffId && s.userId === userId)
        )
      )
        throw new Error('Chuyến chưa được phân công cho bạn.');
      const t = db.tickets.find(t => t.token === token.trim());
      if (!t) return { valid: false, message: 'QR không hợp lệ.' };
      if (t.tripId !== tripId) return { valid: false, message: 'Vé thuộc chuyến khác.' };
      if (Date.parse(t.expiresAt) <= Date.now()) return { valid: false, message: 'Vé đã hết hạn.' };
      if (t.status === 'used') return { valid: false, message: 'Vé đã được sử dụng.' };
      if (t.status === 'canceled') return { valid: false, message: 'Vé đã hủy.' };
      const b = db.bookings.find(b => b.id === t.bookingId);
      if (b?.status !== 'paid') return { valid: false, message: 'Chưa xác nhận thanh toán.' };
      if (t.request)
        return {
          valid: false,
          message: 'Vé đang có yêu cầu hủy/đổi. Vui lòng xử lý yêu cầu trước.',
        };

      const checkedInAt = new Date().toISOString();
      t.status = 'used';
      t.checkedInAt = checkedInAt;
      audit(db, userId, 'Soát vé ' + t.id);
      return {
        valid: true,
        message: 'Vé hợp lệ · đã ghi nhận lên xe (demo)',
        ticketId: t.id,
        ticketCode: t.token,
        passengerName: b.name || 'Hành khách',
        seatNumbers: b.seatIds ?? [],
        quantity: b.quantity,
        checkedInAt,
      };
    },
    'POST',
    { tripId, token }
  );
