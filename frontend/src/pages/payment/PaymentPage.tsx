import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type PaymentMethod = 'momo' | 'vnpay' | 'bank';

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethod>('momo');

  const order = {
    route: 'Bến xe Thái Nguyên → ICTU',
    date: '30/09/2026',
    time: '08:00',
    seat: 'T01',
    quantity: 1,
    price: 8000,
  };

  const paymentMethods = [
    {
      id: 'momo' as PaymentMethod,
      name: 'Ví MoMo',
      description: 'Thanh toán nhanh qua ví điện tử MoMo',
      icon: 'M',
    },
    {
      id: 'vnpay' as PaymentMethod,
      name: 'VNPay QR',
      description: 'Quét mã QR để thanh toán qua VNPay',
      icon: 'QR',
    },
    {
      id: 'bank' as PaymentMethod,
      name: 'Thẻ ATM / Ngân hàng',
      description: 'Thanh toán bằng thẻ ATM hoặc tài khoản ngân hàng',
      icon: 'ATM',
    },
  ];

  const formatPrice = (price: number) => {
    return `${price.toLocaleString('vi-VN')}đ`;
  };

  const handlePayment = () => {
    alert(
      `Bạn đã chọn ${
        paymentMethods.find((method) => method.id === selectedMethod)?.name
      }.`
    );
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
            onClick={() => navigate(-1)}
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
                <strong style={styles.route}>{order.route}</strong>
              </div>
            </div>

            <div style={styles.infoGrid}>
              <div>
                <span style={styles.label}>Ngày đi</span>
                <strong>{order.date}</strong>
              </div>

              <div>
                <span style={styles.label}>Giờ khởi hành</span>
                <strong>{order.time}</strong>
              </div>

              <div>
                <span style={styles.label}>Vị trí ghế</span>
                <strong>{order.seat}</strong>
              </div>

              <div>
                <span style={styles.label}>Số lượng vé</span>
                <strong>{order.quantity} vé</strong>
              </div>
            </div>

            <div style={styles.divider} />

            <div style={styles.totalRow}>
              <span>Tổng tiền</span>
              <strong style={styles.total}>
                {formatPrice(order.price * order.quantity)}
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

        {/* Payment Footer */}
        <div style={styles.footer}>
          <div>
            <span style={styles.footerLabel}>Số tiền cần thanh toán</span>
            <strong style={styles.footerTotal}>
              {formatPrice(order.price * order.quantity)}
            </strong>
          </div>

          <button
            onClick={handlePayment}
            style={styles.paymentButton}
          >
            Thanh toán ngay
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
};

export default PaymentPage;