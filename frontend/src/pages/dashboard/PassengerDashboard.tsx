import React from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { useAuth } from '../../context/AuthContext';

export const PassengerDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Navbar />
      <main style={{ maxWidth: '1000px', margin: '32px auto', padding: '0 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          Tra cứu & Đặt vé Xe Buýt
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
          Xin chào <strong>{user?.fullName}</strong>, chọn tuyến xe buýt để bắt đầu hành trình.
        </p>

        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          marginBottom: '28px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                Điểm đi (Trạm xuất phát)
              </label>
              <input
                type="text"
                defaultValue="Bến xe Trung tâm Thái Nguyên"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                Điểm đến (Trạm dừng)
              </label>
              <input
                type="text"
                defaultValue="Khu công nghiệp Sông Công"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                Thời gian khởi hành
              </label>
              <input
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <button style={{
            marginTop: '16px',
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: '#2563eb',
            color: '#ffffff',
            fontWeight: 700,
            cursor: 'pointer',
          }}>
            Tìm chuyến xe phù hợp
          </button>
        </div>

        {/* Vé của tôi */}
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
          Vé điện tử đã mua (QR Code)
        </h2>
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '480px',
          boxShadow: '0 8px 20px rgba(37,99,235,0.25)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontWeight: 800, fontSize: '18px' }}>Tuyến 01: BX Thái Nguyên → Sông Công</span>
            <span style={{ background: '#38bdf8', color: '#0f172a', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
              ĐÃ THANH TOÁN
            </span>
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '16px' }}>
            <div>Khởi hành: 07:30 - Hôm nay</div>
            <div>Ghế: <strong>A12</strong> | Xe buýt: <strong>29B-123.45</strong></div>
          </div>
          <div style={{
            background: '#ffffff',
            color: '#0f172a',
            padding: '16px',
            borderRadius: '12px',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '13px',
          }}>
            <div style={{ fontSize: '36px', marginBottom: '4px' }}>📱 QR-CODE</div>
            <div>Mã vé: #SB-2026-998811</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Đưa mã này cho phụ xe/tài xế quét khi lên xe</div>
          </div>
        </div>
      </main>
    </div>
  );
};
