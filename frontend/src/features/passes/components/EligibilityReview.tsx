import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  X,
  ZoomIn,
  RotateCw,
  Download,
  Search,
  School,
  IdCard,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useSession } from '@/store/session.store';
import { useAction } from '@/hooks/useAction';
import { passesApi } from '../services/passes.api';
import type { Eligibility } from '../types';
import { PageTitle, Card, Badge, Button, AsyncState, ActionMessage, Modal } from '@/components/ui/Ui';
import { dateTime } from '@/utils/format';

export function EligibilityReview() {
  const user = useSession(s => s.user)!;

  // Filters state
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Modals state
  const [viewingCard, setViewingCard] = useState<Eligibility | null>(null);
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  const [rejectingCard, setRejectingCard] = useState<Eligibility | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const query = useQuery({
    queryKey: ['eligibility-all', user.id],
    queryFn: () => passesApi.listAll(user.id),
  });

  const reviewAction = useAction(
    async ({ id, approve, reason }: { id: string; approve: boolean; reason?: string }) => {
      await passesApi.review(user.id, id, approve, reason);
      setRejectingCard(null);
      setRejectionReason('');
      query.refetch();
    },
    'Đã cập nhật trạng thái hồ sơ ưu đãi thành công.'
  );

  // Quick preset reasons for rejection
  const PRESET_REASONS = [
    'Ảnh thẻ bị mờ, không rõ họ tên hoặc mã sinh viên.',
    'Thẻ học sinh - sinh viên đã hết hạn sử dụng.',
    'Thông tin trường học hoặc niên khóa không khớp với hồ sơ khai báo.',
    'Ảnh chụp không phải là thẻ HSSV hợp lệ hoặc giấy xác nhận từ nhà trường.',
    'Hồ sơ không có dấu mộc hoặc chữ ký xác nhận của cơ sở đào tạo.',
  ];

  // Filtered list
  const filteredList = useMemo(() => {
    if (!query.data) return [];
    return query.data.filter(item => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = item.fullName?.toLowerCase().includes(q);
        const matchDoc = item.document?.toLowerCase().includes(q);
        const matchSchool = item.schoolName?.toLowerCase().includes(q);
        const matchId = item.id.toLowerCase().includes(q);
        if (!matchName && !matchDoc && !matchSchool && !matchId) return false;
      }
      return true;
    });
  }, [query.data, statusFilter, categoryFilter, search]);

  // Statistics
  const stats = useMemo(() => {
    const all = query.data || [];
    return {
      total: all.length,
      pending: all.filter(e => e.status === 'pending').length,
      approved: all.filter(e => e.status === 'approved').length,
      rejected: all.filter(e => e.status === 'rejected').length,
    };
  }, [query.data]);

  // Export to Excel function
  const handleExportExcel = async () => {
    if (!query.data || query.data.length === 0) return;
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SmartBus Management';

    const sheet = workbook.addWorksheet('Danh sach ho so uu dai');
    sheet.addRow(['BÁO CÁO DUYỆT HỒ SƠ ĐỐI TƯỢNG ƯU ĐÃI (HSSV)']);
    sheet.addRow(['Ngày xuất:', new Date().toLocaleDateString('vi-VN')]);
    sheet.addRow([]);
    sheet.addRow([
      'Mã hồ sơ',
      'Họ và tên HSSV',
      'Nhóm đối tượng',
      'Mã SV / Số thẻ',
      'Trường đào tạo',
      'Khoa / Lớp',
      'Ngày sinh',
      'Ngày nộp',
      'Trạng thái',
      'Lý do từ chối (nếu có)',
      'Người duyệt',
    ]);

    filteredList.forEach(e => {
      sheet.addRow([
        e.id,
        e.fullName,
        e.category,
        e.document,
        e.schoolName || '',
        e.facultyOrClass || '',
        e.birthDate || '',
        new Date(e.submittedAt).toLocaleDateString('vi-VN'),
        e.status === 'approved' ? 'Đã duyệt' : e.status === 'pending' ? 'Chờ duyệt' : 'Từ chối',
        e.rejectionReason || '',
        e.reviewedBy || '',
      ]);
    });

    sheet.columns.forEach((col, i) => {
      col.width = i === 1 ? 25 : i === 4 ? 35 : 18;
    });
    sheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `danh-sach-ho-so-uu-dai-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const openCardViewer = (card: Eligibility) => {
    setViewingCard(card);
    setCardSide('front');
    setZoomLevel(1);
    setRotation(0);
  };

  return (
    <>
      <PageTitle
        eyebrow="QUẢN TRỊ & XÉT DUYỆT"
        title="Duyệt hồ sơ ưu đãi (Thẻ HSSV)"
        description="Kiểm tra đối chiếu ảnh thẻ học sinh - sinh viên và hồ sơ ưu đãi để áp dụng chính sách giảm 40% vé tháng."
        action={
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              onClick={handleExportExcel}
              disabled={!query.data?.length}
            >
              <Download size={16} />
              Xuất danh sách Excel
            </Button>
            <Button variant="secondary" onClick={() => query.refetch()}>
              Làm mới
            </Button>
          </div>
        }
      />

      <ActionMessage action={reviewAction} />

      {/* Quick KPI stats */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 20 }}>
        <Card style={{ padding: '16px 20px' }}>
          <span className="muted" style={{ fontSize: 13 }}>TỔNG HỒ SƠ</span>
          <p className="price" style={{ margin: '6px 0 2px' }}>{stats.total}</p>
          <small className="muted">Toàn bộ hồ sơ trong hệ thống</small>
        </Card>
        <Card style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b' }}>
          <div className="between">
            <span className="muted" style={{ fontSize: 13 }}>CHỜ DUYỆT</span>
            <Badge tone="amber">{stats.pending}</Badge>
          </div>
          <p className="price" style={{ margin: '6px 0 2px', color: '#b45309' }}>{stats.pending}</p>
          <small className="muted">Cần xác minh ảnh thẻ HSSV</small>
        </Card>
        <Card style={{ padding: '16px 20px', borderLeft: '4px solid #22c55e' }}>
          <div className="between">
            <span className="muted" style={{ fontSize: 13 }}>ĐÃ PHÊ DUYỆT</span>
            <Badge tone="green">{stats.approved}</Badge>
          </div>
          <p className="price" style={{ margin: '6px 0 2px', color: '#15803d' }}>{stats.approved}</p>
          <small className="muted">Đã hưởng ưu đãi vé tháng</small>
        </Card>
        <Card style={{ padding: '16px 20px', borderLeft: '4px solid #ef4444' }}>
          <div className="between">
            <span className="muted" style={{ fontSize: 13 }}>TỪ CHỐI</span>
            <Badge tone="red">{stats.rejected}</Badge>
          </div>
          <p className="price" style={{ margin: '6px 0 2px', color: '#b91c1c' }}>{stats.rejected}</p>
          <small className="muted">Hồ sơ không hợp lệ</small>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card style={{ marginBottom: 22, padding: 18 }}>
        <div
          className="grid"
          style={{ gridTemplateColumns: 'minmax(220px, 1.8fr) minmax(150px, 1fr) minmax(150px, 1fr)', gap: 14 }}
        >
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)', pointerEvents: 'none' }}>
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Tìm theo tên HSSV, mã SV, trường học..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36, width: '100%' }}
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
              style={{ width: '100%' }}
            >
              <option value="all">Tất cả trạng thái ({stats.total})</option>
              <option value="pending">Chờ duyệt ({stats.pending})</option>
              <option value="approved">Đã phê duyệt ({stats.approved})</option>
              <option value="rejected">Bị từ chối ({stats.rejected})</option>
            </select>
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="all">Tất cả đối tượng</option>
              <option value="Sinh viên">Sinh viên đại học/CĐ</option>
              <option value="Học sinh">Học sinh phổ thông</option>
              <option value="Người cao tuổi">Người cao tuổi</option>
              <option value="Người khuyết tật">Người khuyết tật</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main List of Eligibility Profiles */}
      <AsyncState
        query={query}
        empty={filteredList.length === 0}
        emptyText="Không tìm thấy hồ sơ ưu đãi phù hợp"
      >
        <div className="stack" style={{ gap: 16 }}>
          {filteredList.map(item => {
            const isPending = item.status === 'pending';
            const isApproved = item.status === 'approved';
            const isRejected = item.status === 'rejected';

            return (
              <Card
                key={item.id}
                style={{
                  borderLeft: `5px solid ${isApproved ? '#22c55e' : isPending ? '#f59e0b' : '#ef4444'}`,
                  transition: 'box-shadow 0.2s ease',
                }}
              >
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: 'minmax(180px, 220px) minmax(280px, 1fr) auto',
                    gap: 20,
                    alignItems: 'center',
                  }}
                  data-responsive-grid
                >
                  {/* Student Card Photo Thumbnail with zoom trigger */}
                  <div
                    style={{
                      position: 'relative',
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: '1px solid var(--border)',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
                      cursor: 'pointer',
                      background: '#f8fafc',
                    }}
                    onClick={() => openCardViewer(item)}
                    title="Bấm để phóng to xem ảnh thẻ"
                  >
                    <img
                      src={item.cardFrontUrl}
                      alt={`Thẻ HSSV ${item.fullName}`}
                      style={{
                        width: '100%',
                        height: 135,
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.3)',
                        opacity: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 12,
                        transition: 'opacity 0.2s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                    >
                      <ZoomIn size={16} /> Xem ảnh thẻ
                    </div>
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        right: 6,
                        background: 'rgba(15, 23, 42, 0.75)',
                        color: '#fff',
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      Mặt trước
                    </span>
                  </div>

                  {/* Student Info Details */}
                  <div>
                    <div className="row" style={{ gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <Badge tone={isApproved ? 'green' : isPending ? 'amber' : 'red'}>
                        {isApproved ? 'Đã phê duyệt' : isPending ? 'Chờ kiểm tra' : 'Từ chối'}
                      </Badge>
                      <Badge tone="neutral">{item.category}</Badge>
                      <small className="muted">Mã HS: {item.id}</small>
                    </div>

                    <h3 style={{ margin: '0 0 6px', fontSize: 17, color: 'var(--foreground)' }}>
                      {item.fullName}
                    </h3>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '6px 14px',
                        fontSize: 13,
                        margin: '8px 0',
                      }}
                    >
                      <div className="row" style={{ gap: 6, color: 'var(--muted)' }}>
                        <IdCard size={14} color="#15803d" />
                        <span>Mã SV/HS: <strong>{item.document}</strong></span>
                      </div>
                      <div className="row" style={{ gap: 6, color: 'var(--muted)' }}>
                        <School size={14} color="#15803d" />
                        <span>Trường: <strong>{item.schoolName || 'ICTU'}</strong></span>
                      </div>
                      <div className="row" style={{ gap: 6, color: 'var(--muted)' }}>
                        <Sparkles size={14} color="#15803d" />
                        <span>Khoa/Lớp: {item.facultyOrClass || 'Chưa cung cấp'}</span>
                      </div>
                      <div className="row" style={{ gap: 6, color: 'var(--muted)' }}>
                        <Calendar size={14} color="#15803d" />
                        <span>Ngày gửi: {dateTime(item.submittedAt)}</span>
                      </div>
                    </div>

                    {/* Display rejection reason if rejected */}
                    {isRejected && item.rejectionReason && (
                      <div
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: 6,
                          padding: '6px 12px',
                          marginTop: 8,
                          color: '#b91c1c',
                          fontSize: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <AlertTriangle size={14} />
                        <span><strong>Lý do từ chối:</strong> {item.rejectionReason}</span>
                      </div>
                    )}

                    {/* Display reviewer name if reviewed */}
                    {item.reviewedBy && (
                      <small className="muted" style={{ display: 'block', marginTop: 4 }}>
                        Được duyệt bởi <strong>{item.reviewedBy}</strong> lúc {item.reviewedAt ? dateTime(item.reviewedAt) : ''}
                      </small>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div
                    className="stack"
                    style={{
                      gap: 8,
                      alignItems: 'stretch',
                      minWidth: 150,
                      justifyContent: 'center',
                    }}
                  >
                    <Button
                      variant="secondary"
                      onClick={() => openCardViewer(item)}
                      style={{ fontSize: 13 }}
                    >
                      <ZoomIn size={14} /> Xem ảnh thẻ
                    </Button>

                    {isPending ? (
                      <>
                        <Button
                          disabled={reviewAction.isPending}
                          onClick={() => reviewAction.mutate({ id: item.id, approve: true })}
                          style={{ fontSize: 13, background: '#15803d' }}
                        >
                          <Check size={14} /> Duyệt ưu đãi
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={reviewAction.isPending}
                          onClick={() => {
                            setRejectingCard(item);
                            setRejectionReason(PRESET_REASONS[0]);
                          }}
                          style={{ fontSize: 13, color: '#dc2626' }}
                        >
                          <X size={14} /> Từ chối
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        disabled={reviewAction.isPending}
                        onClick={() => {
                          if (isApproved) {
                            setRejectingCard(item);
                            setRejectionReason('Thu hồi quyền ưu đãi do hết hạn hoặc thông tin không còn hiệu lực.');
                          } else {
                            reviewAction.mutate({ id: item.id, approve: true });
                          }
                        }}
                        style={{ fontSize: 12 }}
                      >
                        <RotateCcw size={13} /> {isApproved ? 'Hủy duyệt' : 'Duyệt lại'}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </AsyncState>

      {/* Modal 1: Phóng to và kiểm tra ảnh thẻ HSSV chi tiết */}
      <Modal
        open={!!viewingCard}
        onClose={() => setViewingCard(null)}
        title={`Chi tiết ảnh thẻ HSSV · ${viewingCard?.fullName || ''}`}
      >
        {viewingCard && (
          <div className="stack" style={{ gap: 16 }}>
            {/* Toolbar for image viewer */}
            <div className="between" style={{ flexWrap: 'wrap', gap: 10, background: 'var(--card)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div className="row" style={{ gap: 8 }}>
                <Button
                  variant={cardSide === 'front' ? 'primary' : 'secondary'}
                  onClick={() => setCardSide('front')}
                  style={{ fontSize: 12, padding: '6px 12px' }}
                >
                  Mặt trước thẻ
                </Button>
                <Button
                  variant={cardSide === 'back' ? 'primary' : 'secondary'}
                  onClick={() => setCardSide('back')}
                  style={{ fontSize: 12, padding: '6px 12px' }}
                >
                  Mặt sau thẻ
                </Button>
              </div>

              <div className="row" style={{ gap: 6 }}>
                <Button
                  variant="secondary"
                  onClick={() => setZoomLevel(z => Math.max(0.7, z - 0.2))}
                  title="Thu nhỏ"
                  style={{ padding: '6px 10px', fontSize: 12 }}
                >
                  −
                </Button>
                <span style={{ fontSize: 12, minWidth: 45, textAlign: 'center' }}>
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.2))}
                  title="Phóng to"
                  style={{ padding: '6px 10px', fontSize: 12 }}
                >
                  +
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  title="Xoay ảnh 90 độ"
                  style={{ padding: '6px 10px' }}
                >
                  <RotateCw size={14} />
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const src = cardSide === 'front' ? viewingCard.cardFrontUrl : viewingCard.cardBackUrl;
                    if (!src) return;
                    const a = document.createElement('a');
                    a.href = src;
                    a.download = `the-${viewingCard.document}-${cardSide}.svg`;
                    a.click();
                  }}
                  title="Tải ảnh thẻ về máy"
                  style={{ padding: '6px 10px' }}
                >
                  <Download size={14} />
                </Button>
              </div>
            </div>

            {/* Image display canvas with zoom & rotation */}
            <div
              style={{
                width: '100%',
                minHeight: 320,
                maxHeight: 460,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0f172a',
                borderRadius: 10,
                overflow: 'auto',
                padding: 24,
                position: 'relative',
              }}
            >
              <img
                src={cardSide === 'front' ? viewingCard.cardFrontUrl : viewingCard.cardBackUrl}
                alt="Ảnh thẻ HSSV phóng to"
                style={{
                  maxWidth: '100%',
                  maxHeight: 400,
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  borderRadius: 8,
                }}
              />
            </div>

            {/* Comparison Information Panel */}
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '14px 18px',
                fontSize: 13,
              }}
            >
              <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>
                Thông tin đối soát hồ sơ:
              </h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 10,
                }}
              >
                <div>
                  <span className="muted">Họ tên:</span>{' '}
                  <strong>{viewingCard.fullName}</strong>
                </div>
                <div>
                  <span className="muted">Mã số thẻ/SV:</span>{' '}
                  <strong style={{ color: '#15803d' }}>{viewingCard.document}</strong>
                </div>
                <div>
                  <span className="muted">Trường:</span>{' '}
                  <strong>{viewingCard.schoolName || 'ICTU'}</strong>
                </div>
                <div>
                  <span className="muted">Khoa/Lớp:</span>{' '}
                  <strong>{viewingCard.facultyOrClass || '—'}</strong>
                </div>
                <div>
                  <span className="muted">Hạn sử dụng thẻ:</span>{' '}
                  <strong>{viewingCard.expiryDate || '30/06/2028'}</strong>
                </div>
                <div>
                  <span className="muted">Trạng thái:</span>{' '}
                  <Badge tone={viewingCard.status === 'approved' ? 'green' : viewingCard.status === 'pending' ? 'amber' : 'red'}>
                    {viewingCard.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Quick action buttons in modal */}
            {viewingCard.status === 'pending' && (
              <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
                <Button
                  variant="secondary"
                  disabled={reviewAction.isPending}
                  onClick={() => {
                    setRejectingCard(viewingCard);
                    setRejectionReason(PRESET_REASONS[0]);
                    setViewingCard(null);
                  }}
                  style={{ color: '#dc2626' }}
                >
                  <X size={15} /> Từ chối hồ sơ
                </Button>
                <Button
                  disabled={reviewAction.isPending}
                  onClick={() => {
                    reviewAction.mutate({ id: viewingCard.id, approve: true });
                    setViewingCard(null);
                  }}
                  style={{ background: '#15803d' }}
                >
                  <Check size={15} /> Phê duyệt hồ sơ này
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal 2: Chọn / Nhập lý do từ chối hồ sơ */}
      <Modal
        open={!!rejectingCard}
        onClose={() => setRejectingCard(null)}
        title="Từ chối hồ sơ đối tượng ưu đãi"
      >
        {rejectingCard && (
          <div className="stack" style={{ gap: 14 }}>
            <p>
              Hồ sơ của <strong>{rejectingCard.fullName}</strong> (Mã: {rejectingCard.document}) sẽ bị từ chối.
              Hành khách sẽ nhận được thông báo kèm lý do này để nộp lại thẻ hợp lệ.
            </p>

            <label style={{ fontSize: 13, fontWeight: 600 }}>
              Chọn lý do thường gặp:
            </label>
            <div className="stack" style={{ gap: 6 }}>
              {PRESET_REASONS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRejectionReason(preset)}
                  style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: rejectionReason === preset ? '1px solid #dc2626' : '1px solid var(--border)',
                    background: rejectionReason === preset ? '#fef2f2' : 'transparent',
                    color: rejectionReason === preset ? '#b91c1c' : 'var(--foreground)',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  • {preset}
                </button>
              ))}
            </div>

            <label style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
              Hoặc nhập lý do chi tiết:
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Nhập nội dung phản hồi cho hành khách..."
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontFamily: 'inherit',
                fontSize: 13,
              }}
            />

            <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <Button variant="secondary" onClick={() => setRejectingCard(null)}>
                Hủy bỏ
              </Button>
              <Button
                disabled={!rejectionReason.trim() || reviewAction.isPending}
                onClick={() =>
                  reviewAction.mutate({
                    id: rejectingCard.id,
                    approve: false,
                    reason: rejectionReason,
                  })
                }
                style={{ background: '#dc2626', color: '#fff' }}
              >
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
