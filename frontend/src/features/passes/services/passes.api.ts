import { service } from '@/services/adapter';
import { audit, requireUser, uid, notify } from '@/services/mocks/database';
import { can } from '@/configs/permissions';
import type { Pass, Eligibility, CreateEligibilityInput } from '../types';
import { generateStudentCardSvg } from '../utils/studentCardSamples';

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

  eligibility: (userId: string, inputOrCategory: string | CreateEligibilityInput, doc?: string) =>
    service<Eligibility>(
      '/eligibility',
      db => {
        const user = requireUser(db, userId);
        const input: CreateEligibilityInput =
          typeof inputOrCategory === 'string'
            ? {
                category: inputOrCategory,
                document: doc || '',
                fullName: user.name,
                schoolName: 'Trường Đại học Công nghệ Thông tin & Truyền thông - ICTU',
                facultyOrClass: 'Khoa Công nghệ Thông tin',
              }
            : inputOrCategory;

        if (input.document.trim().length < 4)
          throw new Error('Nhập mã giấy tờ / MSSV ít nhất 4 ký tự.');

        if (db.eligibility.some(e => e.userId === userId && e.status === 'pending'))
          throw new Error('Bạn đã có hồ sơ đang chờ duyệt. Vui lòng đợi quản trị viên phê duyệt.');

        const cardFrontUrl =
          input.cardFrontUrl ||
          generateStudentCardSvg({
            fullName: input.fullName || user.name,
            studentId: input.document,
            schoolName: input.schoolName || 'Đại học Công nghệ Thông tin & TT - ICTU',
            facultyOrClass: input.facultyOrClass || 'Khoa CNTT',
            birthDate: input.birthDate || '15/09/2005',
            expiryDate: input.expiryDate || '30/06/2028',
            cardType: input.category.toUpperCase().includes('HỌC SINH') ? 'THẺ HỌC SINH' : 'THẺ SINH VIÊN',
          });

        const cardBackUrl =
          input.cardBackUrl ||
          generateStudentCardSvg({
            fullName: input.fullName || user.name,
            studentId: input.document,
            schoolName: input.schoolName || 'Đại học Công nghệ Thông tin & TT - ICTU',
            expiryDate: input.expiryDate || '30/06/2028',
            isBack: true,
          });

        const e: Eligibility = {
          id: uid('elg'),
          userId,
          fullName: input.fullName || user.name,
          category: input.category,
          document: input.document,
          schoolName: input.schoolName || 'Đại học Công nghệ Thông tin & TT - ICTU',
          facultyOrClass: input.facultyOrClass || 'Khoa CNTT',
          birthDate: input.birthDate || '15/09/2005',
          expiryDate: input.expiryDate || '30/06/2028',
          cardFrontUrl,
          cardBackUrl,
          submittedAt: new Date().toISOString(),
          status: 'pending',
        };

        db.eligibility.unshift(e);
        audit(db, userId, 'Nộp hồ sơ đối tượng ưu đãi: ' + input.category);
        return e;
      },
      'POST',
      typeof inputOrCategory === 'string' ? { category: inputOrCategory, document: doc } : inputOrCategory
    ),

  pending: (userId: string) =>
    service<Eligibility[]>('/eligibility/pending', db => {
      if (!can(requireUser(db, userId), 'eligibility')) throw new Error('Không có quyền.');
      return db.eligibility.filter(e => e.status === 'pending');
    }),

  listAll: (
    userId: string,
    filter?: { status?: string; category?: string; search?: string }
  ) =>
    service<Eligibility[]>('/eligibility/all', db => {
      if (!can(requireUser(db, userId), 'eligibility')) throw new Error('Không có quyền.');
      let results = [...db.eligibility];
      if (filter?.status && filter.status !== 'all') {
        results = results.filter(e => e.status === filter.status);
      }
      if (filter?.category && filter.category !== 'all') {
        results = results.filter(e => e.category === filter.category);
      }
      if (filter?.search) {
        const query = filter.search.toLowerCase().trim();
        results = results.filter(
          e =>
            (e.fullName && e.fullName.toLowerCase().includes(query)) ||
            e.document.toLowerCase().includes(query) ||
            (e.schoolName && e.schoolName.toLowerCase().includes(query)) ||
            e.userId.toLowerCase().includes(query)
        );
      }
      return results;
    }),

  review: (
    userId: string,
    id: string,
    approve: boolean,
    rejectionReason?: string
  ) =>
    service(
      '/eligibility/' + id,
      db => {
        const reviewer = requireUser(db, userId);
        if (!can(reviewer, 'eligibility')) throw new Error('Không có quyền.');
        const e = db.eligibility.find(e => e.id === id);
        if (!e) throw new Error('Không tìm thấy hồ sơ.');
        e.status = approve ? 'approved' : 'rejected';
        e.reviewedAt = new Date().toISOString();
        e.reviewedBy = reviewer.name;
        if (!approve) {
          e.rejectionReason = rejectionReason || 'Ảnh thẻ hoặc thông tin không hợp lệ.';
        } else {
          e.rejectionReason = undefined;
        }

        notify(
          db,
          e.userId,
          approve ? 'Hồ sơ ưu đãi HSSV đã được duyệt' : 'Hồ sơ ưu đãi bị từ chối',
          approve
            ? 'Chúc mừng bạn! Hồ sơ ưu đãi đã được duyệt thành công. Bạn được giảm 40% khi mua vé tháng.'
            : 'Hồ sơ chưa được phê duyệt. Lý do: ' + (e.rejectionReason || 'Thông tin không hợp lệ.') + ' Vui lòng nộp lại.',
          '/account/passes'
        );
        audit(
          db,
          userId,
          (approve ? 'Phê duyệt' : 'Từ chối') + ' hồ sơ đối tượng ưu đãi ' + id
        );
        return e;
      },
      'PUT',
      { approve, rejectionReason }
    ),
};
