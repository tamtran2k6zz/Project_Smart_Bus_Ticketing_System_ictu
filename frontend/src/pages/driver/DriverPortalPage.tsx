import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { BusRoute } from '../../types/route';
import { getApiUrl, apiFetch } from '../../api/client';

export const DriverPortalPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'verify' | 'incident' | 'routes'>('verify');
  const [dbStatus, setDbStatus] = useState<'connected' | 'error'>('connected');

  // 1. Soát vé QR (US 15)
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedList, setVerifiedList] = useState<any[]>([]);

  // 2. Báo cáo sự cố đường sá (US 11)
  const [incidentType, setIncidentType] = useState('TRAFFIC_JAM');
  const [delayMinutes, setDelayMinutes] = useState(15);
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentMsg, setIncidentMsg] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);

  // 3. Danh sách tuyến xe
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Nạp dữ liệu sự cố từ cơ sở dữ liệu
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await apiFetch(getApiUrl('/api/v1/operations/incidents'));
      const json = await res.json();
      setIncidents(Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []);
      setDbStatus('connected');
    } catch {
      setDbStatus('error');
      setIncidents([]);
    }
  }, []);

  // Nạp danh sách tuyến xe
  const fetchRoutes = useCallback(async () => {
    setIsLoadingRoutes(true);
    try {
      const res = await apiFetch(getApiUrl('/api/v1/routes'));
      const json = await res.json();
      const rawList = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      const mapped: BusRoute[] = rawList.map((r: any) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        status: r.status,
        stations: (Array.isArray(r.stops) ? r.stops : Array.isArray(r.routeStops) ? r.routeStops : []).map((rs: any) => ({
          id: rs.stop?.id || rs.stopId || rs.id || `st-${rs.stopOrder}`,
          name: rs.stop?.name || rs.name || 'Trạm đón trả',
          address: rs.stop?.address || rs.address || '',
          order: rs.stopOrder,
        })),
      }));
      setRoutes(mapped);
    } catch {
      setDbStatus('error');
      setRoutes([]);
    } finally {
      setIsLoadingRoutes(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
    fetchRoutes();
  }, [fetchIncidents, fetchRoutes]);

  // Xử lý soát vé QR vào cơ sở dữ liệu (US 15)
  const handleVerifyTicket = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!verifyCode.trim()) {
      alert('Vui lòng nhập chuỗi mã QR hoặc mã vé (VD: TKT-...)!');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await apiFetch(getApiUrl('/api/v1/ticketing/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Mã vé không tồn tại hoặc đã hết hạn trong CSDL cơ sở dữ liệu!');
      }

      const result = json.data || json;
      setVerifyResult(result);

      if (result.ticket) {
        setVerifiedList((prev) => [
          {
            code: result.ticket.ticketCode,
            passenger: result.ticket.user?.fullName || 'Khách vãng lai',
            seat: result.ticket.seatNumber,
            time: new Date().toLocaleTimeString('vi-VN'),
            status: result.isAlreadyCheckedIn ? 'Đã quét trước đó' : 'Hợp lệ ✓',
          },
          ...prev.slice(0, 4),
        ]);
      }
      setVerifyCode('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  // Báo cáo sự cố vào cơ sở dữ liệu (US 11)
  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentDescription.trim()) {
      alert('Vui lòng nhập mô tả chi tiết sự cố!');
      return;
    }

    setIsSubmittingIncident(true);
    try {
      const token = localStorage.getItem('smartbus_access_token');
      const dashRes = await apiFetch(getApiUrl('/api/v1/trips'));
      const dashJson = await dashRes.json();
      dashJson.tripOccupancy = dashJson.data;
      const firstTripId = dashJson.tripOccupancy?.[0]?.id || 'trip-1';

      const res = await apiFetch(getApiUrl('/api/v1/operations/incidents'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          tripId: firstTripId,
          incidentType,
          description: incidentDescription.trim(),
          delayMinutes: Number(delayMinutes),
          severity: 'MEDIUM',
        }),
      });

      if (!res.ok) throw new Error('Gửi báo cáo sự cố thất bại vào cơ sở dữ liệu!');

      setIncidentMsg('✅ Đã lưu báo cáo sự cố thành công vào cơ sở dữ liệu! Hệ thống tự động thông báo đến hành khách.');
      setIncidentDescription('');
      await fetchIncidents();
      setTimeout(() => setIncidentMsg(null), 4000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingIncident(false);
    }
  };

  const displayName = user?.fullName || 'Tài xế SmartBus';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="admin-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Liquid-Glass */}
      <header className="header" style={{ position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="logo-icon">🚌</div>
          <div>
            <h1 style={{ fontSize: '22px', margin: 0 }}>Cổng Điều Hành Tài Xế</h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255, 255, 255, 0.55)' }}>
              Soát vé QR thời gian thực & Báo cáo sự cố đường sá
            </p>
          </div>
        </div>

        <div className="admin-profile" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 12px',
              borderRadius: '9999px',
              fontSize: '12px',
              background: dbStatus === 'connected' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: dbStatus === 'connected' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              color: dbStatus === 'connected' ? '#34d399' : '#f87171',
            }}
          >
            <span className={dbStatus === 'connected' ? 'pulse-dot' : ''} style={{ width: '7px', height: '7px', borderRadius: '50%', background: dbStatus === 'connected' ? '#10b981' : '#ef4444' }} />
            {dbStatus === 'connected' ? 'cơ sở dữ liệu Online: 3307' : 'Mất kết nối'}
          </span>

          <a
            href="/landing.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              borderRadius: '9999px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              background: 'rgba(56, 189, 248, 0.08)',
              color: '#38bdf8',
              textDecoration: 'none',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            🌌 Landing Page ↗
          </a>

          <div className="avatar">{initial}</div>
          <div>
            <strong>{displayName}</strong>
            <span style={{ color: '#818cf8', fontWeight: 600 }}>Tài xế / Phụ xe</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: '7px 16px',
              fontSize: '12px',
              borderRadius: '9999px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#fca5a5',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Navigation Pills Bar */}
      <div style={{ padding: '16px 36px 0', display: 'flex', gap: '10px' }}>
        <button
          className={`menu-item ${activeTab === 'verify' ? 'active' : ''}`}
          onClick={() => setActiveTab('verify')}
          style={{ width: 'auto', padding: '9px 20px', borderRadius: '9999px' }}
        >
          📱 Soát vé QR (US 15)
        </button>
        <button
          className={`menu-item ${activeTab === 'incident' ? 'active' : ''}`}
          onClick={() => setActiveTab('incident')}
          style={{ width: 'auto', padding: '9px 20px', borderRadius: '9999px' }}
        >
          ⚠️ Báo cáo Sự cố & Trễ chuyến (US 11)
        </button>
        <button
          className={`menu-item ${activeTab === 'routes' ? 'active' : ''}`}
          onClick={() => setActiveTab('routes')}
          style={{ width: 'auto', padding: '9px 20px', borderRadius: '9999px' }}
        >
          🚌 Lộ trình Tuyến xe buýt
        </button>
      </div>

      {/* Main Tab Content */}
      <main className="content" style={{ padding: '24px 36px 48px' }}>
        {/* TAB 1: SOÁT VÉ QR */}
        {activeTab === 'verify' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="liquid-glass" style={{ padding: '32px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '28px', margin: '0 0 6px' }}>Quét & Soát Vé QR Hành Khách (US 15)</h2>
                <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
                  Kiểm tra tính hợp lệ của vé điện tử trực tiếp từ cơ sở dữ liệu cơ sở dữ liệu dưới 1 giây.
                </p>
              </div>

              <form onSubmit={handleVerifyTicket} style={{ display: 'flex', gap: '12px', maxWidth: '680px', marginBottom: '24px' }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Quét mã QR hoặc nhập mã vé (VD: TKT-998822 hoặc chuỗi hex QR)..."
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  style={{ flex: 1, height: '48px', borderRadius: '9999px', fontSize: '14px' }}
                />
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="primary-button"
                  style={{ height: '48px', padding: '0 28px', fontSize: '14px', borderRadius: '9999px' }}
                >
                  {isVerifying ? 'Đang kiểm tra...' : '🔍 Soát vé ngay'}
                </button>
              </form>

              {/* Kết quả kiểm tra */}
              {verifyResult && (
                <div
                  className="liquid-glass-strong"
                  style={{
                    padding: '24px',
                    borderRadius: '18px',
                    border: verifyResult.isAlreadyCheckedIn
                      ? '1px solid rgba(251, 191, 36, 0.4)'
                      : '1px solid rgba(16, 185, 129, 0.4)',
                    background: verifyResult.isAlreadyCheckedIn
                      ? 'rgba(251, 191, 36, 0.08)'
                      : 'rgba(16, 185, 129, 0.08)',
                    marginBottom: '28px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      color: verifyResult.isAlreadyCheckedIn ? '#fbbf24' : '#34d399',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '14px',
                    }}
                  >
                    <span>{verifyResult.isAlreadyCheckedIn ? '⚠️' : '✓'}</span>
                    {verifyResult.message}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '14px', color: 'rgba(255, 255, 255, 0.85)' }}>
                    <div>
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', display: 'block' }}>HÀNH KHÁCH</span>
                      <strong>{verifyResult.ticket?.user?.fullName || 'Khách vãng lai'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', display: 'block' }}>TUYẾN XE</span>
                      <strong>{verifyResult.ticket?.trip?.route?.name || 'Tuyến buýt nội đô'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', display: 'block' }}>VỊ TRÍ GHẾ</span>
                      <strong style={{ color: '#38bdf8' }}>Ghế số: {verifyResult.ticket?.seatNumber}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', display: 'block' }}>TRẠNG THÁI VÉ</span>
                      <span className="status-badge active">{verifyResult.ticket?.status}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Lịch sử quét gần đây */}
              <h3 style={{ fontSize: '18px', margin: '0 0 14px' }}>Nhật ký quét vé vừa thực hiện:</h3>
              {verifiedList.length === 0 ? (
                <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '13.5px' }}>
                  Chưa có vé nào được quét trong phiên làm việc này.
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="route-table">
                    <thead>
                      <tr>
                        <th>Mã vé</th>
                        <th>Hành khách</th>
                        <th>Số ghế</th>
                        <th>Thời gian quét</th>
                        <th>Kết quả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(verifiedList) ? verifiedList : []).map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ color: '#38bdf8', fontWeight: 600 }}>{item.code}</td>
                          <td>{item.passenger}</td>
                          <td>Ghế {item.seat}</td>
                          <td style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{item.time}</td>
                          <td>
                            <span className="status-badge active">{item.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BÁO CÁO SỰ CỐ */}
        {activeTab === 'incident' && (
          <div className="liquid-glass" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '28px', margin: '0 0 6px' }}>Báo Cáo Sự Cố Đường Sá & Trễ Chuyến (US 11)</h2>
            <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '24px' }}>
              Tài xế lập báo cáo ùn tắc giao thông, hư xe hoặc thời tiết xấu để nhà xe cảnh báo thời gian thực đến hành khách.
            </p>

            {incidentMsg && (
              <div
                style={{
                  padding: '12px 18px',
                  marginBottom: '20px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#34d399',
                  fontSize: '13.5px',
                  fontWeight: 500,
                }}
              >
                {incidentMsg}
              </div>
            )}

            <form onSubmit={handleReportIncident} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '28px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '8px' }}>
                  Phân loại sự cố:
                </label>
                <select
                  className="filter-select"
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  style={{ width: '100%', borderRadius: '12px', height: '44px' }}
                >
                  <option value="TRAFFIC_JAM">Ùn tắc / Kẹt xe giờ cao điểm</option>
                  <option value="BREAKDOWN">Sự cố kỹ thuật / Hư hỏng xe</option>
                  <option value="BAD_WEATHER">Thời tiết xấu / Mưa giông, ngập nước</option>
                  <option value="ACCIDENT">Va chạm giao thông trên hành trình</option>
                  <option value="OTHER">Sự cố vận hành khác</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '8px' }}>
                  Thời gian trễ dự kiến (phút):
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  className="search-input"
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(Number(e.target.value))}
                  style={{ width: '100%', borderRadius: '12px', height: '44px' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '8px' }}>
                  Chi tiết tình huống:
                </label>
                <input
                  type="text"
                  className="search-input"
                  placeholder="VD: Cầu vượt ùn tắc kéo dài do có xe hỏng chắn ngang làn đường..."
                  value={incidentDescription}
                  onChange={(e) => setIncidentDescription(e.target.value)}
                  style={{ width: '100%', borderRadius: '12px', height: '44px' }}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmittingIncident}
                  className="primary-button"
                  style={{
                    padding: '11px 26px',
                    borderRadius: '9999px',
                    background: 'rgba(245, 158, 11, 0.25)',
                    borderColor: 'rgba(245, 158, 11, 0.45)',
                    color: '#fbbf24',
                  }}
                >
                  {isSubmittingIncident ? 'Đang gửi...' : '⚠️ Gửi báo cáo sự cố (Lưu cơ sở dữ liệu)'}
                </button>
              </div>
            </form>

            <h3 style={{ fontSize: '18px', margin: '0 0 14px' }}>Các sự cố vừa báo cáo gần đây:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(Array.isArray(incidents) ? incidents : []).map((inc) => (
                <div
                  key={inc.id}
                  className="liquid-glass"
                  style={{
                    padding: '14px 18px',
                    borderRadius: '14px',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    background: 'rgba(245, 158, 11, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fbbf24', fontWeight: 600, fontSize: '14px' }}>
                    <span>[{inc.incidentType}] Tuyến: {inc.trip?.route?.name || 'Tuyến buýt'}</span>
                    <span style={{ color: '#f87171' }}>+{inc.delayMinutes} phút</span>
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.85)', marginTop: '4px', fontSize: '13.5px' }}>
                    {inc.description}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '6px' }}>
                    Báo cáo bởi: {inc.driver?.fullName || 'Tài xế'} • {new Date(inc.reportedAt).toLocaleString('vi-VN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: DANH SÁCH LỘ TRÌNH */}
        {activeTab === 'routes' && (
          <div className="liquid-glass" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '28px', margin: '0 0 6px' }}>Lộ Trình Các Tuyến Xe Buýt</h2>
            <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '20px' }}>
              Danh sách các tuyến xe và thứ tự trạm dừng đón trả khách được lưu trữ trong cơ sở dữ liệu.
            </p>

            {isLoadingRoutes ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'rgba(255, 255, 255, 0.5)' }}>
                Đang nạp dữ liệu lộ trình...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(Array.isArray(routes) ? routes : []).map((r) => (
                  <div key={r.id} className="liquid-glass" style={{ padding: '20px', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <strong style={{ fontSize: '18px', color: '#38bdf8' }}>[{r.code}]</strong>{' '}
                        <span style={{ fontSize: '16px', fontWeight: 600 }}>{r.name}</span>
                      </div>
                      <span className="status-badge active">{r.status}</span>
                    </div>

                    <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                      Lộ trình qua {Array.isArray(r.stations) ? r.stations.length : 0} trạm dừng:
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {(Array.isArray(r.stations) ? r.stations : []).map((st, i) => (
                        <span
                          key={st.id}
                          style={{
                            padding: '4px 10px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.8)',
                          }}
                        >
                          {i + 1}. {st.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default DriverPortalPage;
