import { service } from '@/services/adapter';
import { audit, notify, iso, uid } from '@/services/mocks/database';
import { ownBooking, getTrip } from '@/features/booking/services/booking.api';
import { request } from '@/services/http';
import { appConfig } from '@/configs/app.config';
import type { Gateway, Payment } from '../types';
export const paymentApi = {
  start: (bookingId: string, userId: string, gateway: Gateway) =>
    service<Payment>(
      '/payments',
      db => {
        const b = ownBooking(db, bookingId, userId);
        const hold = db.holds.find(h => h.id === b.holdId);
        if (b.status === 'paid') {
          const p = db.payments.find(p => p.bookingId === bookingId && p.status === 'paid');
          if (p) return p;
        }
        if (!hold || hold.status !== 'active' || !['pending', 'failed'].includes(b.status))
          throw new Error('Đặt vé đã hết hạn hoặc đã hủy.');
        const existing = db.payments.find(p => p.bookingId === bookingId && p.status === 'pending');
        if (existing) return existing;
        const p: Payment = {
          id: uid('p'),
          bookingId,
          gateway,
          status: 'pending',
          amount: b.total,
          createdAt: iso(),
        };
        b.status = 'pending';
        db.payments.push(p);
        audit(db, userId, 'Khởi tạo giao dịch demo ' + p.id);
        return p;
      },
      'POST',
      { bookingId, gateway, idempotencyKey: bookingId }
    ),
  confirmDemo: (paymentId: string, userId: string, status: Payment['status']) => {
    if (!appConfig.demo)
      return Promise.reject(new Error('Mô phỏng chỉ khả dụng trong chế độ demo.'));
    return service<Payment>(
      '/demo/payments/' + paymentId,
      db => {
        const p = db.payments.find(p => p.id === paymentId);
        if (!p) throw new Error('Không tìm thấy giao dịch.');
        const b = ownBooking(db, p.bookingId, userId);
        if (p.status !== 'pending') return p;
        const hold = db.holds.find(h => h.id === b.holdId);
        if (!hold || hold.status !== 'active')
          throw new Error('Giữ chỗ hết hạn. Demo chưa thu tiền và không phát hành QR.');
        p.status = status;
        b.status = status;
        if (status === 'paid') {
          hold.status = 'converted';
          const t = getTrip(db, b.tripId);
          if (!db.tickets.some(t => t.bookingId === b.id))
            db.tickets.push({
              id: uid('tk'),
              bookingId: b.id,
              tripId: b.tripId,
              userId,
              token: uid('SB-DEMO'),
              expiresAt: new Date(
                Date.parse(t.departure) + (t.duration + 90) * 60000
              ).toISOString(),
              status: 'valid',
            });
          notify(
            db,
            userId,
            'Vé đã được phát hành (demo)',
            'QR của bạn đã sẵn sàng.',
            '/account/tickets'
          );
        }
        if (status === 'canceled') hold.status = 'released';
        audit(db, userId, 'Thanh toán demo ' + status);
        return p;
      },
      'POST',
      { status }
    );
  },
  latest: (bookingId: string, userId: string) =>
    service<Payment | null>('/bookings/' + bookingId + '/payment', db => {
      ownBooking(db, bookingId, userId);
      return [...db.payments].reverse().find(p => p.bookingId === bookingId) || null;
    }),
  invoice: (bookingId: string, userId: string) =>
    service(
      '/bookings/' + bookingId + '/invoice',
      db => {
        const b = ownBooking(db, bookingId, userId);
        if (b.status !== 'paid') throw new Error('Chỉ yêu cầu chứng từ cho đặt vé đã thanh toán.');
        b.invoiceRequested = true;
        audit(db, userId, 'Yêu cầu chứng từ ' + bookingId);
        return { message: 'Đã ghi nhận yêu cầu chứng từ demo.' };
      },
      'POST'
    ),
  realInvoice: (id: string) => request<{ url: string }>('/bookings/' + id + '/invoice'),
};
