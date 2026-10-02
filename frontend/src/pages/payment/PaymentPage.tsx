import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createBooking, isAllowedGatewayUrl } from '../../services/payment';
import { saveBookingSession } from '../../utils/bookingSession';
import type { PaymentMethod, PaymentPageState } from '../../types/payment';

const BOOKING_PAGE = '/passenger/booking';

const paymentMethods: { id: PaymentMethod; name: string; description: string; icon: string }[] = [
  {
    id: 'VNPAY',
    name: 'VNPay',
    description: 'Thanh toán qua cổng VNPay (QR, thẻ ATM, Internet Banking)',
    icon: 'VNP',
  },
  {
    id: 'MOMO',
    name: 'Ví MoMo',
    description: 'Thanh toán nhanh qua ví điện tử MoMo',
    icon: 'M',
  },
];

const isValidState = (value: unknown): value is PaymentPageState => {
  const s = value as Partial<PaymentPageState> | null;
  return (
    !!s &&
    typeof s.tripId === 'string' && !!s.tripId &&
    typeof s.seatNumber === 'string' && !!s.seatNumber &&
    typeof s.departureTime === 'string' &&
    Number.isFinite(s.fare)
  );
};

const formatPrice = (price: number) => `${price.toLocaleString('vi-VN')}đ`;

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('VNPAY');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const order = isValidState(location.state) ? location.state : null;

  if (!order) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Chưa có thông tin đặt chỗ</h2>
            <p style={styles.subtitle}>Vui lòng chọn chuyến xe và ghế trước khi thanh toán.</p>
            <button onClick={() => navigate(BOOKING_PAGE)} style={{ ...styles.paymentButton, marginTop: '20px' }}>
              Chọn chuyến xe
            </button>
          </section>
        </div>
      </div>
    );
  }

  const departure = new Date(order.departureTime);
  const hasDeparture = !Number.isNaN(departure.getTime());

  const handlePayment = async () => {
    if (submitting || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      const booking = await createBooking({
        tripId: order.tripId,
        seatNumber: order.seatNumber,
        paymentMethod: selectedMethod,
      });
      if (!isAllowedGatewayUrl(booking.paymentUrl)) {
        throw new Error('Địa chỉ thanh toán trả về không hợp lệ. Vui lòng liên hệ hỗ trợ.');
      }

      saveBookingSession(user.id, {
        orderId: booking.orderId,
        ticketId: booking.ticketId,
        ticketCode: booking.ticketCode,
        tripId: order.tripId,
        routeCode: order.routeCode,
        routeName: order.routeName,
        departureTime: order.departureTime,
        seatNumber: booking.seatNumber || order.seatNumber,
        amount: booking.amount,
        paymentMethod: selectedMethod,
        paymentUrl: booking.paymentUrl,
        reservationExpiresAt: booking.reservationExpiresAt,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });

      // Domain ngoài nên dùng window.location, không dùng navigate() của router.
      window.location.assign(booking.paymentUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo giao dịch thanh toán.');
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Thanh toán</h1>
            <p style={styles.subtitle}>
              Chọn phương thức thanh toán để hoàn tất đặt vé
            </p>
          </div>

          <button
            onClick={() => navigate(BOOKING_PAGE)}
            disabled={submitting}
            style={styles.backButton}
          >
            ← Quay lại
          </button>
        </div>

        <div style={styles.content}>
          {/* Order Summary */}
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Tóm tắt đơn hàng</h2>

            <div style={styles.routeBox}>
              <div>
                <span style={styles.label}>Tuyến xe</span>
                <strong style={styles.route}>
                  {order.routeCode ? `[${order.routeCode}] ` : ''}
                  {order.routeName || '—'}
                </strong>
              </div>
            </div>

            <div style={styles.infoGrid}>
              <div>
                <span style={styles.label}>Ngày đi</span>
                <strong>{hasDeparture ? departure.toLocaleDateString('vi-VN') : '—'}</strong>
              </div>

              <div>
                <span style={styles.label}>Giờ khởi hành</span>
                <strong>
                  {hasDeparture
                    ? departure.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </strong>
              </div>

              <div>
                <span style={styles.label}>Vị trí ghế</span>
                <strong>{order.seatNumber}</strong>
              </div>
            </div>

            <div style={styles.divider} />

            <div style={styles.totalRow}>
              <span>Tổng tiền</span>
              <strong style={styles.total}>
                {formatPrice(order.fare)}
              </strong>
            </div>
          </section>

          {/* Payment Methods */}
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>
              Chọn phương thức thanh toán
            </h2>

            <div style={styles.methodList}>
              {paymentMethods.map((method) => {
                const isSelected = selectedMethod === method.id;

                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    disabled={submitting}
                    style={{
                      ...styles.method,
                      ...(isSelected ? styles.methodSelected : {}),
                    }}
                  >
                    <div
                      style={{
                        ...styles.methodIcon,
                        ...(isSelected
                          ? styles.methodIconSelected
                          : {}),
                      }}
                    >
                      {method.icon}
                    </div>

                    <div style={styles.methodContent}>
                      <strong>{method.name}</strong>
                      <span>{method.description}</span>
                    </div>

                    <div
                      style={{
                        ...styles.radio,
                        ...(isSelected ? styles.radioSelected : {}),
                      }}
                    >
                      {isSelected && <div style={styles.radioDot} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Payment Footer */}
        <div style={styles.footer}>
          <div>
            <span style={styles.footerLabel}>Số tiền cần thanh toán</span>
            <strong style={styles.footerTotal}>
              {formatPrice(order.fare)}
            </strong>
          </div>

          <button
            onClick={handlePayment}
            disabled={submitting}
            style={{
              ...styles.paymentButton,
              ...(submitting ? styles.paymentButtonDisabled : {}),
            }}
          >
            {submitting ? 'Đang chuyển sang cổng thanh toán...' : 'Thanh toán ngay'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f5f7fb',
    padding: '32px 20px',
  },

  container: {
    maxWidth: '1000px',
    margin: '0 auto',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '16px',
  },

  title: {
    margin: 0,
    fontSize: '30px',
  },

  subtitle: {
    margin: '8px 0 0',
    color: '#666',
  },

  backButton: {
    padding: '10px 16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    background: '#fff',
    cursor: 'pointer',
  },

  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },

  card: {
    background: '#fff',
    borderRadius: '14px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },

  sectionTitle: {
    margin: '0 0 20px',
    fontSize: '20px',
  },

  routeBox: {
    padding: '16px',
    background: '#f7f9fc',
    borderRadius: '10px',
    marginBottom: '20px',
  },

  label: {
    display: 'block',
    color: '#777',
    fontSize: '14px',
    marginBottom: '6px',
  },

  route: {
    fontSize: '18px',
  },

  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '20px',
  },

  divider: {
    height: '1px',
    background: '#eee',
    margin: '24px 0',
  },

  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '18px',
  },

  total: {
    fontSize: '24px',
  },

  methodList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  method: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    border: '1px solid #ddd',
    borderRadius: '12px',
    background: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
  },

  methodSelected: {
    border: '2px solid #2563eb',
    background: '#f5f9ff',
  },

  methodIcon: {
    width: '52px',
    height: '52px',
    borderRadius: '10px',
    background: '#f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '15px',
    flexShrink: 0,
  },

  methodIconSelected: {
    background: '#e5efff',
    color: '#2563eb',
  },

  methodContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },

  radio: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid #bbb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  radioSelected: {
    borderColor: '#2563eb',
  },

  radioDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#2563eb',
  },

  footer: {
    marginTop: '20px',
    background: '#fff',
    borderRadius: '14px',
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },

  footerLabel: {
    display: 'block',
    color: '#777',
    fontSize: '14px',
    marginBottom: '4px',
  },

  footerTotal: {
    fontSize: '24px',
  },

  paymentButton: {
    padding: '14px 28px',
    border: 'none',
    borderRadius: '9px',
    background: '#2563eb',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },

  paymentButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },

  errorBox: {
    marginTop: '20px',
    padding: '14px 18px',
    borderRadius: '10px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    fontSize: '14px',
  },
};

export default PaymentPage;