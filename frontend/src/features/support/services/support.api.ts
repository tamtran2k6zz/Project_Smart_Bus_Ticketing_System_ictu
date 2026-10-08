import { service } from '@/services/adapter';
import { audit, requireUser, uid, iso, notify } from '@/services/mocks/database';
import { can } from '@/configs/permissions';
import type { SupportRequest } from '../types';
export const supportApi = {
  list: (userId: string, admin = false) =>
    service<SupportRequest[]>(admin ? '/support/all' : '/support', db => {
      const user = requireUser(db, userId);
      if (admin && !can(user, 'support')) throw new Error('Không có quyền.');
      return db.support.filter(s => admin || s.userId === userId);
    }),
  send: (userId: string, subject: string, message: string, rating: number) =>
    service<SupportRequest>(
      '/support',
      db => {
        requireUser(db, userId);
        if (subject.trim().length < 3 || message.trim().length < 10 || rating < 1 || rating > 5)
          throw new Error('Kiểm tra nội dung và đánh giá.');
        const s: SupportRequest = {
          id: uid('support'),
          userId,
          subject,
          message,
          rating,
          status: 'open',
          reply: '',
          createdAt: iso(),
        };
        db.support.unshift(s);
        audit(db, userId, 'Gửi phản ánh');
        return s;
      },
      'POST',
      { subject, message, rating }
    ),
  reply: (userId: string, id: string, reply: string) =>
    service(
      '/support/' + id,
      db => {
        if (!can(requireUser(db, userId), 'support')) throw new Error('Không có quyền.');
        if (reply.trim().length < 5) throw new Error('Phản hồi ít nhất 5 ký tự.');
        const s = db.support.find(s => s.id === id);
        if (!s) throw new Error('Không tìm thấy phản ánh.');
        s.reply = reply;
        s.status = 'resolved';
        notify(db, s.userId, 'Phản ánh đã được trả lời', reply, '/account/support');
        audit(db, userId, 'Trả lời phản ánh ' + id);
        return s;
      },
      'PUT',
      { reply }
    ),
};
