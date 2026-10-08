import { service } from '@/services/adapter';
import { audit, requireUser, uid, notify } from '@/services/mocks/database';
import { can } from '@/configs/permissions';
import type { Pass, Eligibility } from '../types';
export const passesApi = {
  list: (userId: string) =>
    service<{ passes: Pass[]; eligibility: Eligibility[] }>('/passes', db => {
      requireUser(db, userId);
      return {
        passes: db.passes.filter(p => p.userId === userId),
        eligibility: db.eligibility.filter(e => e.userId === userId),
      };
    }),
  buy: (userId: string, routeId: string, id?: string) =>
    service<Pass>(
      '/passes',
      db => {
        requireUser(db, userId);
        const route = db.routes.find(r => r.id === routeId && r.active);
        if (!route) throw new Error('Tuyến không hoạt động.');
        const eligible = db.eligibility.some(e => e.userId === userId && e.status === 'approved');
        let p = db.passes.find(
          p => p.userId === userId && (id ? p.id === id : p.routeId === routeId)
        );
        if (!p) {
          p = {
            id: uid('pass'),
            userId,
            routeId,
            expiresAt: new Date().toISOString(),
            price: 0,
            status: 'active',
          };
          db.passes.push(p);
        }
        p.expiresAt = new Date(
          Math.max(Date.now(), Date.parse(p.expiresAt)) + 30 * 86400000
        ).toISOString();
        p.price = eligible ? 150000 : 250000;
        p.status = 'active';
        notify(
          db,
          userId,
          'Vé tháng đã được cập nhật (demo)',
          'Không thực hiện thu tiền thật.',
          '/account/passes'
        );
        audit(db, userId, 'Đăng ký/gia hạn vé tháng demo');
        return p;
      },
      'POST',
      { routeId, id }
    ),
  eligibility: (userId: string, category: string, document: string) =>
    service<Eligibility>(
      '/eligibility',
      db => {
        requireUser(db, userId);
        if (document.trim().length < 5)
          throw new Error('Nhập mã giấy tờ ít nhất 5 ký tự. Chỉ dùng dữ liệu giả trong demo.');
        if (db.eligibility.some(e => e.userId === userId && e.status === 'pending'))
          throw new Error('Bạn đã có hồ sơ đang chờ duyệt.');
        const e: Eligibility = { id: uid('e'), userId, category, document, status: 'pending' };
        db.eligibility.push(e);
        return e;
      },
      'POST',
      { category, document }
    ),
  pending: (userId: string) =>
    service<Eligibility[]>('/eligibility/pending', db => {
      if (!can(requireUser(db, userId), 'eligibility')) throw new Error('Không có quyền.');
      return db.eligibility.filter(e => e.status === 'pending');
    }),
  review: (userId: string, id: string, approve: boolean) =>
    service(
      '/eligibility/' + id,
      db => {
        if (!can(requireUser(db, userId), 'eligibility')) throw new Error('Không có quyền.');
        const e = db.eligibility.find(e => e.id === id);
        if (!e) throw new Error('Không tìm thấy hồ sơ.');
        e.status = approve ? 'approved' : 'rejected';
        notify(
          db,
          e.userId,
          'Hồ sơ ưu đãi đã được xử lý',
          approve ? 'Đã duyệt ưu đãi demo.' : 'Hồ sơ chưa được chấp nhận.',
          '/account/passes'
        );
        audit(db, userId, 'Duyệt hồ sơ ' + id);
        return e;
      },
      'PUT',
      { approve }
    ),
};
