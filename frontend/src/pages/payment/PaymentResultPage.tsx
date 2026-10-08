import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch, getApiUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { loadBookingSession, saveBookingSession } from '../../utils/bookingSession';
import { savePaymentDraft } from '../../utils/paymentDraft';
import { getPaymentOutcome, parsePaymentStatus, type PaymentOutcome } from '../../utils/paymentResult';
import type { PaymentPageState, PaymentStatusDetail } from '../../types/payment';

const BOOKING_PAGE = '/passenger/booking';
// Cổng trả IPN có thể chậm hơn redirect vài giây: hỏi lại tối đa 10 lần, mỗi 3 giây.
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

const methodLabels: Record<string, string> = {
  VNPAY: 'VNPay',
  MOMO: 'Ví MoMo',
  QR: 'QR (demo)',
};

const formatPrice = (price: number) =>
  Number.isFinite(price) ? `${price.toLocaleString('vi-VN')}đ` : '—';

const formatDateTime = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
};

const content: Record<PaymentOutcome, { icon: string; title: string; color: string; steps: string[] }> = {
  SUCCESS: {
    icon: '✓',
    title: 'Thanh toán thành công',
    color: '#16a34a',
    steps: [
      'Bấm "Xem vé" để mở vé điện tử và mã QR soát vé.',
      'Có mặt tại điểm đón trước giờ khởi hành.',
      'Đưa mã QR cho tài xế quét khi lên xe.',
    ],
  },
  FAILED: {
    icon: '✕',
    title: 'Thanh toán thất bại',
    color: '#dc2626',
    steps: [
      'Vé chưa được xuất cho giao dịch này.',
      'Bấm "Thử lại" để thanh toán lại hoặc chọn ghế khác.',
      'Nếu tài khoản đã bị trừ tiền, liên hệ bộ phận hỗ trợ và cung cấp mã giao dịch ở trên.',
    ],
  },
  PENDING: {
    icon: '…',
    title: 'Đang chờ xác nhận thanh toán',
    color: '#d97706',
    steps: [
      'Hệ thống đang chờ cổng thanh toán xác nhận giao dịch.',
      'Không thanh toán lại để tránh bị trừ tiền hai lần.',
      'Bấm "Kiểm tra lại" sau ít phút để cập nhật trạng thái.',
    ],
  },
};

const PaymentResultPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId')?.trim() || searchParams.get('paymentOrder')?.trim() || '';

  const [detail, setDetail] = useState<PaymentStatusDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [polls, setPolls] = useState(0);
  const requestRef = useRef<AbortController | null>(null);

  const fetchStatus = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await apiFetch(getApiUrl(`/api/v1/ticketing/payments/${encodeURIComponent(orderId)}`), { signal: controller.signal });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || 'Không thể tải trạng thái thanh toán.');
      const parsed = parsePaymentStatus(body?.data);
      if (!parsed || parsed.orderId !== orderId) throw new Error('Phản hồi trạng thái thanh toán không đúng định dạng.');
      if (requestRef.current !== controller) return;
      setDetail(parsed);
      setError(null);
    } catch (err) {
      if (requestRef.current !== controller) return;
      setError(err instanceof Error ? err.message : 'Không thể tải trạng thái thanh toán.');
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    setDetail(null);
    setError(null);
    setPolls(0);
    setLoading(!!orderId);
    if (!orderId) {
      setLoading(false);
      return;
    }
    void fetchStatus();
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [orderId, fetchStatus]);

  const outcome = detail ? getPaymentOutcome(detail) : null;

  useEffect(() => {
    if (!user || !outcome) return;
    const session = loadBookingSession(user.id);
    if (session?.orderId === orderId) saveBookingSession(user.id, { ...session, status: outcome });
  }, [user, orderId, outcome]);

  useEffect(() => {
    if (outcome !== 'PENDING' || polls >= MAX_POLLS) return;
    const timer = setTimeout(() => {
      setPolls((n) => n + 1);
      void fetchStatus();
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [outcome, polls, fetchStatus]);

  const handleRecheck = () => {
    setPolls(0);
    void fetchStatus();
  };

  const handleViewTicket = () => {
    navigate(`${BOOKING_PAGE}?view_order=${encodeURIComponent(orderId)}`, { state: { viewOrderId: orderId } });
  };

  // VNPay/MoMo: dựng lại state cho /payment từ phiên đặt chỗ đã lưu trước khi rời sang cổng.
  // QR hoặc không còn phiên: quay về chọn ghế của đúng chuyến đó.
  const handleRetry = () => {
    const session = user ? loadBookingSession(user.id) : null;
    if (session && session.orderId === orderId && session.paymentMethod !== 'QR') {
      const state: PaymentPageState = {
        tripId: session.tripId,
        seatNumber: session.seatNumber,
        routeCode: session.routeCode,
        routeName: session.routeName,
        departureTime: session.departureTime,
        fare: session.amount,
        voucherCode: session.voucherCode,
      };
      savePaymentDraft(user!.id, state);
      navigate('/payment', { state });
      return;
    }
    const tripId = detail?.ticket.tripId;
    navigate(tripId ? `${BOOKING_PAGE}?trip_id=${encodeURIComponent(tripId)}` : BOOKING_PAGE);
  };

  if (!orderId || (!detail && !loading)) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Không tìm thấy kết quả giao dịch</h2>
            <p style={styles.subtitle} role="alert">
              {orderId ? error : 'Thiếu mã giao dịch trong đường dẫn.'}
            </p>
            <div style={styles.actions}>
              {orderId && (
                <button onClick={handleRecheck} style={styles.secondaryButton}>
                  Tải lại
                </button>
              )}
              <button onClick={() => navigate(BOOKING_PAGE)} style={styles.primaryButton}>
                Về trang đặt vé
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!detail || !outcome) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <section style={styles.card} role="status">
            <p style={{ ...styles.subtitle, margin: 0 }}>Đang kiểm tra trạng thái thanh toán...</p>
          </section>
        </div>
      </div>
    );
  }

  const view = content[outcome];
  const isRefunded = detail.paymentStatus === 'REFUNDED';
  const pollingDone = polls >= MAX_POLLS;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <section style={styles.card}>
          <div style={styles.statusHeader} role="status" aria-live="polite">
            <div style={{ ...styles.statusIcon, background: view.color }} aria-hidden="true">
              {view.icon}
            </div>
            <h1 style={{ ...styles.title, color: view.color }}>{view.title}</h1>
            {isRefunded && <p style={styles.subtitle}>Giao dịch đã được hoàn tiền.</p>}
            {outcome === 'PENDING' && !pollingDone && (
              <p style={styles.subtitle}>Đang tự động kiểm tra lại...</p>
            )}
          </div>

          <div style={styles.amountBox}>
            <span style={styles.label}>Số tiền thanh toán</span>
            <strong style={styles.total}>{formatPrice(detail.amount)}</strong>
          </div>

          <dl style={styles.infoGrid}>
            <div>
              <dt style={styles.label}>Mã giao dịch</dt>
              <dd style={styles.mono}>{detail.orderId}</dd>
            </div>
            <div>
              <dt style={styles.label}>Phương thức</dt>
              <dd style={styles.value}>{methodLabels[detail.paymentMethod] || detail.paymentMethod || '—'}</dd>
            </div>
            <div>
              <dt style={styles.label}>Thời gian thanh toán</dt>
              <dd style={styles.value}>{formatDateTime(detail.paidAt)}</dd>
            </div>
            <div>
              <dt style={styles.label}>Mã vé</dt>
              <dd style={styles.value}>{detail.ticket.ticketCode || '—'}</dd>
            </div>
            <div>
              <dt style={styles.label}>Vị trí ghế</dt>
              <dd style={styles.value}>{detail.ticket.seatNumber || '—'}</dd>
            </div>
          </dl>

          <div style={styles.divider} />

          <h2 style={styles.sectionTitle}>Bước tiếp theo</h2>
          <ol style={styles.steps}>
            {view.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          {error && (
            <div style={styles.errorBox} role="alert">
              {error}
            </div>
          )}

          <div style={styles.actions}>
            {outcome === 'SUCCESS' && (
              <button onClick={handleViewTicket} style={styles.primaryButton}>
                Xem vé
              </button>
            )}
            {/* QR demo xác nhận thanh toán đồng thời hoàn thành chuyến, nên được đánh giá ngay */}
            {outcome === 'SUCCESS' && detail.paymentMethod === 'QR' && (
              <button
                onClick={() => navigate(BOOKING_PAGE, { state: { openTab: 'feedback' } })}
                style={styles.secondaryButton}
              >
                Đánh giá chuyến đi
              </button>
            )}
            {outcome === 'FAILED' && (
              <button onClick={handleRetry} style={styles.primaryButton}>
                Thử lại
              </button>
            )}
            {outcome === 'PENDING' && (
              <button onClick={handleRecheck} disabled={!pollingDone && !error} style={{
                ...styles.primaryButton,
                ...(!pollingDone && !error ? styles.buttonDisabled : {}),
              }}>
                Kiểm tra lại
              </button>
            )}
            <button onClick={() => navigate(BOOKING_PAGE)} style={styles.secondaryButton}>
              Về trang đặt vé
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f5f7fb',
    padding: '32px 16px',
    color: '#111',
  },
  container: {
    maxWidth: '640px',
    margin: '0 auto',
  },
  card: {
    background: '#fff',
    borderRadius: '14px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  statusHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '8px',
    marginBottom: '24px',
  },
  statusIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    color: '#fff',
    fontSize: '28px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    margin: 0,
    fontSize: '26px',
  },
  subtitle: {
    margin: '8px 0 0',
    color: '#666',
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: '18px',
    color: '#111', // index.css tô trắng mọi heading cho nền tối
  },
  amountBox: {
    padding: '16px',
    background: '#f7f9fc',
    borderRadius: '10px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  total: {
    fontSize: '28px',
  },
  label: {
    display: 'block',
    color: '#777',
    fontSize: '14px',
    marginBottom: '6px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px 20px',
    margin: 0,
  },
  value: {
    margin: 0,
    fontWeight: 600,
  },
  mono: {
    margin: 0,
    fontWeight: 600,
    fontFamily: 'monospace',
    fontSize: '13px',
    wordBreak: 'break-all',
  },
  divider: {
    height: '1px',
    background: '#eee',
    margin: '24px 0',
  },
  steps: {
    margin: 0,
    paddingLeft: '20px',
    lineHeight: 1.7,
    color: '#333',
  },
  errorBox: {
    marginTop: '20px',
    padding: '12px 16px',
    borderRadius: '10px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginTop: '24px',
  },
  primaryButton: {
    flex: '1 1 200px',
    padding: '14px 24px',
    border: 'none',
    borderRadius: '10px',
    background: '#2563eb',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryButton: {
    flex: '1 1 200px',
    padding: '14px 24px',
    border: '1px solid #ddd',
    borderRadius: '10px',
    background: '#fff',
    color: '#111',
    fontSize: '16px',
    cursor: 'pointer',
  },
  buttonDisabled: {
    background: '#93c5fd',
    cursor: 'not-allowed',
  },
};

export default PaymentResultPage;
