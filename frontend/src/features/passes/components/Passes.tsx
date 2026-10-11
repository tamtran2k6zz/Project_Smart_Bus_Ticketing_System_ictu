import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard, UploadCloud, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import { useSession } from '@/store/session.store';
import { useAction } from '@/hooks/useAction';
import { passesApi } from '../services/passes.api';
import { operationsApi } from '@/features/operations/services/operations.api';
import {
  PageTitle,
  Card,
  Badge,
  Field,
  Button,
  AsyncState,
  ActionMessage,
  Modal,
} from '@/components/ui/Ui';
import { money, dateTime } from '@/utils/format';
import { appConfig } from '@/configs/app.config';
import { SAMPLE_STUDENT_CARDS, generateStudentCardSvg } from '../utils/studentCardSamples';
import type { Eligibility } from '../types';

const schema = z.object({
  fullName: z.string().min(2, 'Nhập họ và tên ít nhất 2 ký tự'),
  category: z.string().min(1),
  schoolName: z.string().min(3, 'Nhập tên trường học ít nhất 3 ký tự'),
  document: z.string().min(4, 'Nhập mã số sinh viên / học sinh ít nhất 4 ký tự'),
  facultyOrClass: z.string().optional(),
});

export function Passes() {
  const user = useSession(s => s.user)!;
  const query = useQuery({ queryKey: ['passes', user.id], queryFn: () => passesApi.list(user.id) });
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: operationsApi.catalog });
  const [route, setRoute] = useState(''),
    [confirm, setConfirm] = useState<{ routeId: string; id?: string } | null>(null);

  // Card photo upload / preview state
  const [cardFrontPreview, setCardFrontPreview] = useState<string>('');
  const [viewingSubmittedCard, setViewingSubmittedCard] = useState<Eligibility | null>(null);

  const buy = useAction(async () => {
    if (!confirm) throw new Error('Chọn tuyến.');
    await passesApi.buy(user.id, confirm.routeId, confirm.id);
    setConfirm(null);
    query.refetch();
  }, 'Vé tháng đã được cập nhật.');

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: user.name || 'Nguyễn Minh Anh',
      category: 'Sinh viên',
      schoolName: 'Trường Đại học Công nghệ Thông tin & Truyền thông - ICTU',
      document: 'DTC245220054',
      facultyOrClass: 'Khoa Công nghệ Thông tin - Lớp D24CNTT01',
    },
  });

  const eligibility = useAction(async (v: z.infer<typeof schema>) => {
    const photo =
      cardFrontPreview ||
      generateStudentCardSvg({
        fullName: v.fullName,
        studentId: v.document,
        schoolName: v.schoolName,
        facultyOrClass: v.facultyOrClass,
        cardType: v.category.toUpperCase().includes('HỌC SINH') ? 'THẺ HỌC SINH' : 'THẺ SINH VIÊN',
      });

    await passesApi.eligibility(user.id, {
      fullName: v.fullName,
      category: v.category,
      document: v.document,
      schoolName: v.schoolName,
      facultyOrClass: v.facultyOrClass,
      cardFrontUrl: photo,
    });
    setCardFrontPreview('');
    query.refetch();
  }, 'Hồ sơ ưu đãi đã được gửi thành công. Quản trị viên sẽ phê duyệt trong 24 giờ.');

  // Handle local image file upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCardFrontPreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Quick fill preset sample
  const applyPreset = (preset: typeof SAMPLE_STUDENT_CARDS[0]) => {
    form.setValue('fullName', preset.fullName);
    form.setValue('document', preset.studentId);
    form.setValue('schoolName', preset.schoolName);
    form.setValue('facultyOrClass', preset.facultyOrClass);
    form.setValue('category', preset.category);
    setCardFrontPreview(
      generateStudentCardSvg({
        fullName: preset.fullName,
        studentId: preset.studentId,
        schoolName: preset.schoolName,
        facultyOrClass: preset.facultyOrClass,
        birthDate: preset.birthDate,
        expiryDate: preset.expiryDate,
        cardType: preset.category.toUpperCase().includes('HỌC SINH') ? 'THẺ HỌC SINH' : 'THẺ SINH VIÊN',
        themeColor: preset.themeColor,
      })
    );
  };

  const isEligible = query.data?.eligibility.some(e => e.status === 'approved');

  return (
    <>
      <PageTitle
        eyebrow="ĐI LẠI THƯỜNG XUYÊN"
        title="Vé tháng & ưu đãi"
        description="Quản lý tuyến quen thuộc và thời hạn sử dụng. Học sinh, sinh viên được giảm 40% giá vé tháng."
      />

      <div className="grid" style={{ gap: 24 }}>
        <div className="stack">
          <Card>
            <div className="row" style={{ gap: 10 }}>
              <CreditCard color="#15803d" size={24} />
              <h3 style={{ margin: 0 }}>Đăng ký vé tháng xe buýt</h3>
            </div>
            <p className="muted" style={{ margin: '10px 0 16px' }}>
              Giá vé tháng thông thường: {money(250000)} / 30 ngày.
              {isEligible ? (
                <strong style={{ color: '#15803d', display: 'block', marginTop: 4 }}>
                  ✓ Đã kích hoạt ưu đãi HSSV: Chỉ còn {money(150000)} / 30 ngày!
                </strong>
              ) : (
                <span style={{ display: 'block', marginTop: 4 }}>
                  Nộp hồ sơ thẻ HSSV bên dưới để được giảm còn {money(150000)} / 30 ngày.
                </span>
              )}
            </p>

            <Field label="Tuyến đăng ký vé tháng">
              <select value={route} onChange={e => setRoute(e.target.value)}>
                <option value="">Chọn tuyến xe buýt</option>
                {catalog.data?.routes
                  .filter(r => r.active)
                  .map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </Field>

            <Button
              style={{ marginTop: 18 }}
              disabled={!route}
              onClick={() => setConfirm({ routeId: route })}
            >
              Đăng ký vé tháng {appConfig.demo ? 'demo' : ''} ({money(isEligible ? 150000 : 250000)})
            </Button>
            <ActionMessage action={buy} />
          </Card>

          <AsyncState
            query={query}
            empty={query.data?.passes.length === 0}
            emptyText="Chưa đăng ký vé tháng"
          >
            {query.data?.passes.map(p => (
              <Card key={p.id}>
                <div className="between" style={{ marginBottom: 8 }}>
                  <Badge tone={Date.parse(p.expiresAt) > Date.now() ? 'green' : 'amber'}>
                    {Date.parse(p.expiresAt) > Date.now() ? 'Đang hoạt động' : 'Hết hạn'}
                  </Badge>
                  <small className="muted">Mã vé: {p.id}</small>
                </div>
                <h3>{catalog.data?.routes.find(r => r.id === p.routeId)?.name}</h3>
                <p className="muted">
                  Hạn dùng: <strong>{dateTime(p.expiresAt)}</strong>
                  <br />
                  Giá lần gần nhất: <strong>{money(p.price)}</strong> / tháng
                </p>
                <Button
                  variant="secondary"
                  onClick={() => setConfirm({ routeId: p.routeId, id: p.id })}
                >
                  Gia hạn thêm 30 ngày ({money(p.price)})
                </Button>
              </Card>
            ))}
          </AsyncState>
        </div>

        {/* Concession Eligibility Application with Student Card Photo */}
        <Card>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Hồ sơ ưu đãi (Thẻ HSSV)</h3>
            {isEligible && <Badge tone="green">Đã duyệt ưu đãi</Badge>}
          </div>
          <p className="muted">
            Tải lên ảnh thẻ học sinh / sinh viên để quản trị viên đối soát và cấp quyền giảm giá vé tháng.
          </p>

          <form className="stack" style={{ gap: 14 }} onSubmit={form.handleSubmit(v => eligibility.mutate(v))}>
            {/* Quick preset picker */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
              <small className="muted" style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Chọn nhanh mẫu thẻ HSSV thử nghiệm:
              </small>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {SAMPLE_STUDENT_CARDS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      borderRadius: 999,
                      border: '1px solid var(--border)',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: 'var(--foreground)',
                    }}
                  >
                    + {preset.label.split(' - ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Nhóm đối tượng">
              <select {...form.register('category')}>
                <option>Sinh viên</option>
                <option>Học sinh</option>
                <option>Người cao tuổi</option>
                <option>Người khuyết tật</option>
              </select>
            </Field>

            <Field label="Họ và tên HSSV" error={form.formState.errors.fullName?.message}>
              <input placeholder="VD: Nguyễn Minh Anh" {...form.register('fullName')} />
            </Field>

            <Field label="Trường đào tạo / Cơ sở học tập" error={form.formState.errors.schoolName?.message}>
              <input placeholder="VD: Trường Đại học CNTT & TT (ICTU)" {...form.register('schoolName')} />
            </Field>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Mã sinh viên / Số thẻ" error={form.formState.errors.document?.message}>
                <input placeholder="VD: DTC245220054" {...form.register('document')} />
              </Field>
              <Field label="Khoa / Lớp">
                <input placeholder="VD: Khoa CNTT - D24" {...form.register('facultyOrClass')} />
              </Field>
            </div>

            {/* Photo upload & Preview Box */}
            <div style={{ border: '1px dashed var(--border)', borderRadius: 8, padding: 14, textAlign: 'center' }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Ảnh chụp thẻ HSSV (Mặt trước):
              </label>

              {cardFrontPreview ? (
                <div style={{ margin: '10px 0', position: 'relative' }}>
                  <img
                    src={cardFrontPreview}
                    alt="Xem trước thẻ HSSV"
                    style={{
                      maxHeight: 180,
                      maxWidth: '100%',
                      borderRadius: 8,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      display: 'inline-block',
                    }}
                  />
                  <div style={{ marginTop: 8 }}>
                    <Button variant="secondary" onClick={() => setCardFrontPreview('')} style={{ fontSize: 12 }}>
                      Đổi ảnh khác
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <UploadCloud size={32} color="#15803d" style={{ margin: '0 auto 6px' }} />
                  <p className="muted" style={{ fontSize: 12, margin: '0 0 10px' }}>
                    Chọn tệp ảnh (.png, .jpg, .svg) hoặc bấm nút mẫu ở trên
                  </p>
                  <label
                    style={{
                      display: 'inline-block',
                      padding: '7px 16px',
                      borderRadius: 6,
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Tải ảnh từ máy
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              )}
            </div>

            <Button disabled={eligibility.isPending} style={{ marginTop: 6 }}>
              Gửi hồ sơ duyệt ưu đãi
            </Button>
            <ActionMessage action={eligibility} />
          </form>

          {/* List of submitted eligibility applications */}
          <hr className="divider" style={{ margin: '20px 0 16px' }} />
          <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>Hồ sơ đã gửi:</h4>

          {query.data?.eligibility.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>Chưa có hồ sơ ưu đãi nào được gửi.</p>
          ) : (
            query.data?.eligibility.map(e => (
              <div
                key={e.id}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <div className="between" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <strong>{e.fullName || user.name}</strong>
                    <p className="muted" style={{ margin: '2px 0 0', fontSize: 12 }}>
                      {e.category} · Mã: {e.document} {e.schoolName ? `· ${e.schoolName}` : ''}
                    </p>
                    <small className="muted">Gửi lúc: {dateTime(e.submittedAt)}</small>
                  </div>
                  <Badge
                    tone={e.status === 'approved' ? 'green' : e.status === 'pending' ? 'amber' : 'red'}
                  >
                    {{ approved: 'Đã duyệt', pending: 'Chờ duyệt', rejected: 'Từ chối' }[e.status]}
                  </Badge>
                </div>

                {e.status === 'approved' && (
                  <div className="row" style={{ gap: 6, color: '#15803d', fontSize: 12, marginTop: 8 }}>
                    <CheckCircle2 size={14} />
                    <span>Hồ sơ hợp lệ! Giá vé tháng được giảm 40%.</span>
                  </div>
                )}

                {e.status === 'rejected' && e.rejectionReason && (
                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 6,
                      padding: '6px 10px',
                      color: '#b91c1c',
                      fontSize: 12,
                      marginTop: 8,
                      display: 'flex',
                      gap: 6,
                      alignItems: 'center',
                    }}
                  >
                    <AlertCircle size={14} />
                    <span>Lý do từ chối: {e.rejectionReason}</span>
                  </div>
                )}

                {e.cardFrontUrl && (
                  <div style={{ marginTop: 8 }}>
                    <Button
                      variant="secondary"
                      onClick={() => setViewingSubmittedCard(e)}
                      style={{ fontSize: 12, padding: '4px 10px' }}
                    >
                      <Eye size={13} /> Xem ảnh thẻ đã nộp
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </Card>
      </div>

      {/* Confirmation modal for pass renewal */}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Xác nhận vé tháng">
        <p>
          Đăng ký / gia hạn tuyến <strong>{catalog.data?.routes.find(r => r.id === confirm?.routeId)?.name}</strong> thêm 30 ngày.
        </p>
        <p>
          Giá thanh toán:{' '}
          <strong style={{ fontSize: 18, color: '#15803d' }}>
            {money(isEligible ? 150000 : 250000)}
          </strong>{' '}
          {isEligible && <span style={{ color: '#15803d', fontSize: 13 }}>(Đã áp dụng giảm giá HSSV)</span>}
        </p>
        <p className="muted">
          Demo không thu tiền thật. Thời hạn gia hạn được cộng nối tiếp từ ngày hết hạn nếu vé còn hiệu lực.
        </p>
        <ActionMessage action={buy} />
        <div className="row" style={{ gap: 10, marginTop: 16 }}>
          <Button disabled={buy.isPending} onClick={() => buy.mutate(undefined)}>
            Xác nhận thanh toán
          </Button>
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Đóng
          </Button>
        </div>
      </Modal>

      {/* View submitted card modal */}
      <Modal
        open={!!viewingSubmittedCard}
        onClose={() => setViewingSubmittedCard(null)}
        title="Ảnh thẻ HSSV đã nộp"
      >
        {viewingSubmittedCard && (
          <div className="stack" style={{ gap: 14, alignItems: 'center' }}>
            <img
              src={viewingSubmittedCard.cardFrontUrl}
              alt="Thẻ HSSV"
              style={{
                maxWidth: '100%',
                maxHeight: 280,
                borderRadius: 8,
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              }}
            />
            <div style={{ width: '100%', fontSize: 13 }}>
              <p><strong>Họ tên:</strong> {viewingSubmittedCard.fullName}</p>
              <p><strong>Mã SV/HS:</strong> {viewingSubmittedCard.document}</p>
              <p><strong>Trường:</strong> {viewingSubmittedCard.schoolName || 'ICTU'}</p>
              <p>
                <strong>Trạng thái:</strong>{' '}
                <Badge
                  tone={
                    viewingSubmittedCard.status === 'approved'
                      ? 'green'
                      : viewingSubmittedCard.status === 'pending'
                        ? 'amber'
                        : 'red'
                  }
                >
                  {viewingSubmittedCard.status}
                </Badge>
              </p>
            </div>
            <Button variant="secondary" onClick={() => setViewingSubmittedCard(null)}>
              Đóng
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
