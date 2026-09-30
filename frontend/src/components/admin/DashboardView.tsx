import React, { useEffect, useState } from 'react';

interface SummaryData {
  overview: {
    totalRevenue: number;
    totalTicketsBooked: number;
    totalUsers: number;
    totalRoutes: number;
    totalBusStops: number;
    totalBuses: number;
    totalTrips: number;
    activeIncidents: number;
    recentFeedbacks: number;
  };
  tripOccupancy: Array<{
    id: string;
    routeCode: string;
    routeName: string;
    busPlate: string;
    departureTime: string;
    bookedSeats: number;
    totalSeats: number;
    occupancyRate: string;
    status: string;
  }>;
}

import { getApiUrl } from '../../api/client';

export const DashboardView: React.FC = () => {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/operations/dashboard/summary'));
      const json = await res.json();
      setData(json.data || json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="liquid-glass" style={{ padding: '48px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
        Đang tổng hợp dữ liệu thời gian thực từ MySQL...
      </div>
    );
  }

  const overview = data?.overview;
  const occupancy = Array.isArray(data?.tripOccupancy) ? data.tripOccupancy : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* 4 Thẻ chỉ số chính - Liquid Glass & Open Sans Italic */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {/* Doanh thu */}
        <div className="liquid-glass" style={{ padding: '24px' }}>
          <div style={{ color: '#34d399', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            💰 Tổng doanh thu (US 19)
          </div>
          <div
            className="metric-number"
            style={{
              fontSize: '36px',
              color: '#ffffff',
              marginTop: '10px',
              textShadow: '0 0 25px rgba(52, 211, 153, 0.4)',
            }}
          >
            {overview?.totalRevenue?.toLocaleString('vi-VN')} đ
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '6px' }}>
            Cập nhật từ bảng payments MySQL
          </div>
        </div>

        {/* Vé đã bán */}
        <div className="liquid-glass" style={{ padding: '24px' }}>
          <div style={{ color: '#38bdf8', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            🎫 Vé đã bán thành công
          </div>
          <div
            className="metric-number"
            style={{
              fontSize: '36px',
              color: '#ffffff',
              marginTop: '10px',
              textShadow: '0 0 25px rgba(56, 189, 248, 0.4)',
            }}
          >
            {overview?.totalTicketsBooked} vé
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '6px' }}>
            Vé điện tử QR hợp lệ
          </div>
        </div>

        {/* Tuyến & Xe */}
        <div className="liquid-glass" style={{ padding: '24px' }}>
          <div style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            🚌 Đội xe & Tuyến đường
          </div>
          <div
            className="metric-number"
            style={{
              fontSize: '36px',
              color: '#ffffff',
              marginTop: '10px',
              textShadow: '0 0 25px rgba(251, 191, 36, 0.35)',
            }}
          >
            {overview?.totalRoutes} Tuyến / {overview?.totalBuses} Xe
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '6px' }}>
            {overview?.totalBusStops} trạm dừng hoạt động
          </div>
        </div>

        {/* Tài khoản */}
        <div className="liquid-glass" style={{ padding: '24px' }}>
          <div style={{ color: '#a78bfa', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            👥 Tổng tài khoản hệ thống
          </div>
          <div
            className="metric-number"
            style={{
              fontSize: '36px',
              color: '#ffffff',
              marginTop: '10px',
              textShadow: '0 0 25px rgba(167, 139, 250, 0.4)',
            }}
          >
            {overview?.totalUsers} người dùng
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '6px' }}>
            Admin, Quản lý, Tài xế & Khách
          </div>
        </div>
      </div>

      {/* Bảng tỷ lệ lấp đầy chỗ từng chuyến xe (US 20) */}
      <div className="liquid-glass" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '24px', margin: 0 }}>Thống kê Tỷ lệ lấp đầy chỗ theo Chuyến xe (US 20)</h3>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
              Dữ liệu tổng hợp theo thời gian thực trực tiếp từ cơ sở dữ liệu MySQL
            </p>
          </div>
          <button
            onClick={fetchSummary}
            className="secondary-button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            🔄 Làm mới
          </button>
        </div>

        <div className="table-wrapper">
          <table className="route-table">
            <thead>
              <tr>
                <th>Mã tuyến</th>
                <th>Tên tuyến</th>
                <th>Biển số xe</th>
                <th>Giờ xuất bến</th>
                <th>Ghế đã đặt</th>
                <th>Tỷ lệ lấp đầy</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(occupancy) ? occupancy : []).map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600, color: '#38bdf8' }}>{t.routeCode}</td>
                  <td>{t.routeName}</td>
                  <td style={{ fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.9)' }}>{t.busPlate}</td>
                  <td>
                    {new Date(t.departureTime).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>
                    {t.bookedSeats} / {t.totalSeats} chỗ
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '80px',
                          height: '6px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '9999px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: t.occupancyRate,
                            height: '100%',
                            background: 'linear-gradient(90deg, #10b981, #34d399)',
                            boxShadow: '0 0 10px rgba(52, 211, 153, 0.5)',
                          }}
                        />
                      </div>
                      <span style={{ fontWeight: 600, color: '#34d399', fontSize: '13px' }}>
                        {t.occupancyRate}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="status-badge active">{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
