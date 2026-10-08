import { z } from 'zod';
import { service } from '@/services/adapter';
import { audit, requireUser, uid } from '@/services/mocks/database';
import { can } from '@/configs/permissions';
import type { Voucher } from '../types';
export const voucherSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]{3,20}$/, 'Mã gồm 3–20 chữ in hoa/số'),
  percent: z.coerce.number().min(1).max(50),
  expiresAt: z.string().refine(s => Date.parse(s) > Date.now(), 'Hạn dùng phải ở tương lai'),
  active: z.boolean(),
});
export const promotionsApi = {
  list: (userId: string) =>
    service<Voucher[]>('/vouchers', db => {
      if (!can(requireUser(db, userId), 'promotions')) throw new Error('Không có quyền.');
      return db.vouchers;
    }),
  save: (userId: string, data: Record<string, unknown>) =>
    service(
      '/vouchers' + (data.id ? '/' + data.id : ''),
      db => {
        if (!can(requireUser(db, userId), 'promotions')) throw new Error('Không có quyền.');
        const v = { ...voucherSchema.parse(data), id: String(data.id || uid('voucher')) };
        if (db.vouchers.some(x => x.code === v.code && x.id !== v.id))
          throw new Error('Mã voucher đã tồn tại.');
        const index = db.vouchers.findIndex(x => x.id === v.id);
        if (index < 0) db.vouchers.push(v);
        else db.vouchers[index] = v;
        audit(db, userId, 'Lưu voucher ' + v.code);
        return v;
      },
      data.id ? 'PUT' : 'POST',
      data
    ),
  remove: (userId: string, id: string) =>
    service(
      '/vouchers/' + id,
      db => {
        if (!can(requireUser(db, userId), 'promotions')) throw new Error('Không có quyền.');
        db.vouchers = db.vouchers.filter(v => v.id !== id);
        audit(db, userId, 'Xóa voucher ' + id);
        return true;
      },
      'DELETE'
    ),
};
