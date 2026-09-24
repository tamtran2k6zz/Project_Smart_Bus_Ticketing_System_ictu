import React, { useState } from 'react';
import { Navbar } from '../../components/layout/Navbar';

export const DriverDashboard: React.FC = () => {
  const [scanResult, setScanResult] = useState<string | null>(null);

  const simulateScan = () => {
    setScanResult('HỢP LỆ: Vé Tuyến Tuyến 01 (BX Thái Nguyên - Sông Công) | Ghế A12 | Khách: Nguyễn Văn A');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Navbar />
      <main style={{ maxWidth: '600px', margin: '32px auto', padding: '0 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          Ứng dụng Soát vé QR (Tài xế / Phụ xe)
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
          Dành cho Tài xế (DRIVER) - Quét mã QR trên vé điện tử của hành khách
        </p>

        <div style={{
          background: '#0f172a',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        }}>
          <div style={{
            width: '200px',
            height: '200px',
            border: '2px dashed #38bdf8',
            borderRadius: '12px',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8',
            fontSize: '48px',
          }}>
            📷
          </div>
          <button
            onClick={simulateScan}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Quét mã QR mẫu
          </button>

          {scanResult && (
            <div style={{
              marginTop: '20px',
              padding: '12px',
              borderRadius: '8px',
              background: '#14532d',
              color: '#86efac',
              fontSize: '13px',
              fontWeight: 600,
            }}>
              ✓ {scanResult}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
