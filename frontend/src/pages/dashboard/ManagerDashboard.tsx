import React from 'react';
import { Navbar } from '../../components/layout/Navbar';

export const ManagerDashboard: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Navbar />
      <main style={{ maxWidth: '1100px', margin: '32px auto', padding: '0 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          Bảng Điều hành & Báo cáo Thống kê
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
          Dành cho Quản lý (MANAGER) - Xem doanh thu và điều chỉnh lịch trình chuyến xe
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
          <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Doanh thu trong ngày</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#2563eb', marginTop: '6px' }}>15.420.000 ₫</div>
            <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>↑ +12.4% so với hôm qua</div>
          </div>
          <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Tỷ lệ lấp đầy chỗ</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>87.5%</div>
            <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>Đạt mục tiêu tối ưu</div>
          </div>
          <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Chuyến xe đang vận hành</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>38 chuyến</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>100% đúng giờ</div>
          </div>
        </div>
      </main>
    </div>
  );
};
