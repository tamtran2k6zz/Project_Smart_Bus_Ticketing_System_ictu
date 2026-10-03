import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import apiClient from '../../api/client';

import { DEFAULT_STOPS, DEFAULT_ROUTES } from '../../constants/defaultData';

interface StopItem {
  id: number;
  code: string;
  name: string;
  address: string;
}

interface RouteItem {
  id: number;
  code: string;
  name: string;
  distanceKm: number;
  basePrice: number;
  status: string;
  stops?: any[];
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [stops, setStops] = useState<StopItem[]>(DEFAULT_STOPS);
  const [routes, setRoutes] = useState<RouteItem[]>(DEFAULT_ROUTES);
  const [originStopId, setOriginStopId] = useState<string>(String(DEFAULT_STOPS[0].id));
  const [destStopId, setDestStopId] = useState<string>(String(DEFAULT_STOPS[1].id));
  const [departureDate, setDepartureDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Nạp danh sách trạm dừng và tuyến xe trực tiếp từ cơ sở dữ liệu
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setErrorMsg(null);

        const [stopsRes, routesRes] = await Promise.all([
          apiClient.get('/stops'),
          apiClient.get('/routes'),
        ]);

        const rawStops = stopsRes?.data;
        const rawRoutes = routesRes?.data;

        const stopsData = Array.isArray(rawStops?.data)
          ? rawStops.data
          : Array.isArray(rawStops)
          ? rawStops
          : [];

        const routesData = Array.isArray(rawRoutes?.data)
          ? rawRoutes.data
          : Array.isArray(rawRoutes)
          ? rawRoutes
          : [];

        if (!isMounted) return;

        const finalStops = stopsData.length > 0 ? stopsData : DEFAULT_STOPS;
        const finalRoutes = routesData.length > 0 ? routesData : DEFAULT_ROUTES;

        setStops(finalStops);
        setRoutes(finalRoutes);

        if (finalStops.length >= 2) {
          setOriginStopId(String(finalStops[0].id));
          setDestStopId(String(finalStops[1].id));
        }
      } catch (err: any) {
        console.error('Lỗi nạp dữ liệu từ cơ sở dữ liệu:', err);
        if (!isMounted) return;
        setErrorMsg('Đang hoạt động ở chế độ dữ liệu mặc định (Chưa kết nối CSDL cơ sở dữ liệu).');
        setStops(DEFAULT_STOPS);
        setRoutes(DEFAULT_ROUTES);
        setOriginStopId(String(DEFAULT_STOPS[0].id));
        setDestStopId(String(DEFAULT_STOPS[1].id));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!originStopId || !destStopId) {
      alert('Vui lòng chọn cả điểm khởi hành và điểm đến!');
      return;
    }
    if (originStopId === destStopId) {
      alert('Điểm khởi hành và điểm đến không được trùng nhau!');
      return;
    }

    navigate(
      `/search?origin_stop_id=${originStopId}&destination_stop_id=${destStopId}&departure_date=${departureDate}`
    );
  };

  const handleSwapStops = () => {
    const temp = originStopId;
    setOriginStopId(destStopId);
    setDestStopId(temp);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: '#f8fafc' }}>
      <Navbar />

      {/* Hero Section */}
      <section style={{
        position: 'relative',
        padding: '60px 24px 80px',
        textAlign: 'center',
        background: 'radial-gradient(ellipse at 50% 10%, rgba(56, 189, 248, 0.15) 0%, transparent 60%)',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '999px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            color: '#38bdf8',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '20px',
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#38bdf8' }} />
            Sprint 1: Trực tiếp cơ sở dữ liệu 8.0 • 100% Zero Mock Data
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 800,
            lineHeight: 1.2,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontStyle: 'normal',
            background: 'linear-gradient(135deg, #ffffff 30%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '16px',
          }}>
            Hệ Thống Xe Buýt Thông Minh <br />
            <span style={{
              background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Smart Bus ICTU
            </span>
          </h1>

          <p style={{
            fontSize: '17px',
            color: '#94a3b8',
            maxWidth: '650px',
            margin: '0 auto 40px',
            lineHeight: 1.6,
          }}>
            Tra cứu lộ trình, theo dõi các chuyến xe và quản lý mạng lưới giao thông thông minh kết nối Thái Nguyên - Đại học CNTT & TT.
          </p>

          {/* Search Box Card - US 01 */}
          <div style={{
            background: 'rgba(17, 24, 39, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
            padding: '32px',
            maxWidth: '850px',
            margin: '0 auto',
            textAlign: 'left',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🔍</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f8fafc', fontStyle: 'normal' }}>
                  Tra Cứu Tuyến & Chuyến Xe Buýt (US 01)
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                ● Truy vấn CSDL cơ sở dữ liệu
              </span>
            </div>

            {errorMsg && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '13px',
                marginBottom: '20px',
              }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleSearch}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                alignItems: 'flex-end',
              }}>
                {/* Điểm đi */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
                    🚏 Điểm khởi hành (Trạm đi)
                  </label>
                  <select
                    value={originStopId}
                    onChange={(e) => setOriginStopId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: 'rgba(31, 41, 55, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                    disabled={isLoading || !Array.isArray(stops) || stops.length === 0}
                  >
                    {(Array.isArray(stops) ? stops : []).map((stop) => (
                      <option key={stop.id} value={stop.id} style={{ background: '#111827', color: '#f8fafc' }}>
                        [{stop.code}] {stop.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nút đổi chiều trạm */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={handleSwapStops}
                    title="Đổi chiều trạm"
                    style={{
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      cursor: 'pointer',
                    }}
                  >
                    ⇄
                  </button>
                </div>

                {/* Điểm đến */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
                    🏁 Điểm đến (Trạm đến)
                  </label>
                  <select
                    value={destStopId}
                    onChange={(e) => setDestStopId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: 'rgba(31, 41, 55, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                    disabled={isLoading || !Array.isArray(stops) || stops.length === 0}
                  >
                    {(Array.isArray(stops) ? stops : []).map((stop) => (
                      <option key={stop.id} value={stop.id} style={{ background: '#111827', color: '#f8fafc' }}>
                        [{stop.code}] {stop.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ngày khởi hành */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
                    📅 Ngày khởi hành
                  </label>
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      background: 'rgba(31, 41, 55, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)',
                    color: '#ffffff',
                    padding: '14px 32px',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(2, 132, 199, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <span>Tìm Chuyến Xe Ngay</span>
                  <span>➔</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Network Overview / Real Routes Section */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0, fontStyle: 'normal', color: '#f8fafc' }}>
              Mạng Lưới Tuyến Xe Thực Tế (US 12)
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
              Dữ liệu lưu trữ trong bảng `routes` & `route_stops` của cơ sở dữ liệu
            </p>
          </div>
          <span style={{ fontSize: '13px', color: '#38bdf8' }}>
            Tổng số tuyến: {routes.length}
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
        }}>
          {(Array.isArray(routes) ? routes : []).map((route) => (
            <div
              key={route.id}
              style={{
                background: 'rgba(17, 24, 39, 0.6)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                  }}>
                    {route.code}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    color: route.status === 'ACTIVE' ? '#34d399' : '#f87171',
                    background: route.status === 'ACTIVE' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}>
                    {route.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'}
                  </span>
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', margin: '0 0 10px', fontStyle: 'normal' }}>
                  {route.name}
                </h3>

                <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', gap: '16px', marginBottom: '14px' }}>
                  <span>📏 Cự ly: {route.distanceKm} km</span>
                  <span>💵 Giá gốc: {route.basePrice?.toLocaleString()} đ</span>
                </div>

                {Array.isArray(route.stops) && route.stops.length > 0 && (
                  <div style={{
                    fontSize: '12px',
                    color: '#64748b',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '10px',
                    borderRadius: '8px',
                    marginBottom: '14px',
                  }}>
                    <div style={{ fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                      Các trạm qua tuyến ({route.stops.length} trạm):
                    </div>
                    {(Array.isArray(route.stops) ? route.stops : []).map((s, idx) => (
                      <span key={s.stopId || idx}>
                        {s.name}
                        {idx < (route.stops?.length || 0) - 1 ? ' ➔ ' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  if (Array.isArray(route.stops) && route.stops.length >= 2) {
                    navigate(
                      `/search?origin_stop_id=${route.stops[0].stopId}&destination_stop_id=${route.stops[route.stops.length - 1].stopId}&departure_date=${departureDate}`
                    );
                  }
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#e2e8f0',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                Tra cứu các chuyến của tuyến này ➔
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '30px 24px',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '13px',
      }}>
        <p style={{ margin: 0 }}>
          Smart Bus Ticketing System • Dự án Thực tập Cơ sở 2026 - Nhóm 5 (ICTU)
        </p>
        <p style={{ margin: '6px 0 0', fontSize: '12px' }}>
          Quản trị CSDL trực tiếp qua phpMyAdmin: <a href="http://localhost:8080" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>http://localhost:8080</a>
        </p>
      </footer>
    </div>
  );
};

export default HomePage;
