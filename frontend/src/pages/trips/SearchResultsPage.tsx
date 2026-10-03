import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import apiClient from '../../api/client';
import { getVietnamDateString } from '../../utils/date';
import { getErrorMessage } from '../../utils/errorMessage';

interface TripResult {
  tripId: string;
  routeId: number;
  routeCode: string;
  routeName: string;
  busPlate: string;
  departureTime: string;
  arrivalTime: string;
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  status: string;
  origin: {
    id: number;
    name: string;
    address: string;
    order: number;
  };
  destination: {
    id: number;
    name: string;
    address: string;
    order: number;
  };
  durationMinutes: number;
  fare: number;
}

interface StopItem {
  id: number;
  code: string;
  name: string;
}

import { DEFAULT_STOPS } from '../../constants/defaultData';

export const SearchResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const originStopId = searchParams.get('origin_stop_id') || '';
  const destStopId = searchParams.get('destination_stop_id') || '';
  const departureDate = searchParams.get('departure_date') || getVietnamDateString();

  const [trips, setTrips] = useState<TripResult[]>([]);
  const [stops, setStops] = useState<StopItem[]>(DEFAULT_STOPS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form search state for inline adjustment
  const [formOrigin, setFormOrigin] = useState<string>(originStopId);
  const [formDest, setFormDest] = useState<string>(destStopId);
  const [formDate, setFormDate] = useState<string>(departureDate);

  // Fetch stops for the dropdown
  useEffect(() => {
    let isMounted = true;
    apiClient
      .get('/stops')
      .then((res) => {
        if (!isMounted) return;
        const raw = res?.data;
        const data = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        if (data.length > 0) {
          setStops(data);
        }
      })
      .catch((err) => {
        console.error('Lỗi nạp trạm:', err);
        if (isMounted) {
          setStops(DEFAULT_STOPS);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch trips matching query
  const fetchTrips = useCallback(async () => {
    if (!originStopId || !destStopId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);

      const res = await apiClient.get('/trips/search', {
        params: {
          origin_stop_id: originStopId,
          destination_stop_id: destStopId,
          departure_date: departureDate,
        },
      });

      const raw = res?.data;
      const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
      setTrips(list);
    } catch (err: unknown) {
      console.error('Lỗi tra cứu chuyến xe:', err);
      const msg = getErrorMessage(
        err,
        'Không thể nạp dữ liệu chuyến xe từ cơ sở dữ liệu. Vui lòng kiểm tra lại kết nối!',
      );
      setErrorMsg(msg);
      setTrips([]);
    } finally {
      setIsLoading(false);
    }
  }, [originStopId, destStopId, departureDate]);

  useEffect(() => {
    setFormOrigin(originStopId);
    setFormDest(destStopId);
    setFormDate(departureDate);
    fetchTrips();
  }, [originStopId, destStopId, departureDate, fetchTrips]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formOrigin || !formDest) {
      alert('Vui lòng chọn cả điểm khởi hành và điểm đến!');
      return;
    }
    if (formOrigin === formDest) {
      alert('Điểm khởi hành và điểm đến không được trùng nhau!');
      return;
    }
    navigate(
      `/search?origin_stop_id=${formOrigin}&destination_stop_id=${formDest}&departure_date=${formDate}`
    );
  };

  const handleBooking = (trip: TripResult) => {
    navigate(`/passenger/booking?trip_id=${encodeURIComponent(trip.tripId)}`);
  };

  const originStopName = stops.find((s) => String(s.id) === originStopId)?.name || `Trạm #${originStopId}`;
  const destStopName = stops.find((s) => String(s.id) === destStopId)?.name || `Trạm #${destStopId}`;

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030712', color: '#f8fafc' }}>
      <Navbar />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* Inline Search Bar */}
        <div style={{
          background: 'rgba(17, 24, 39, 0.8)',
          backdropFilter: 'blur(16px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '20px 24px',
          marginBottom: '32px',
        }}>
          <form onSubmit={handleSearchSubmit} style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr)) 120px',
            gap: '14px',
            alignItems: 'flex-end',
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                Điểm đi:
              </label>
              <select
                value={formOrigin}
                onChange={(e) => setFormOrigin(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#1f2937',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
              >
                {(Array.isArray(stops) ? stops : []).map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.code}] {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                Điểm đến:
              </label>
              <select
                value={formDest}
                onChange={(e) => setFormDest(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#1f2937',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
              >
                {(Array.isArray(stops) ? stops : []).map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.code}] {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                Ngày khởi hành:
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  background: '#1f2937',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)',
                color: '#fff',
                padding: '11px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Tìm lại
            </button>
          </form>
        </div>

        {/* Results Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🚍</span>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, fontStyle: 'normal', color: '#f8fafc' }}>
              Kết quả tra cứu chuyến xe (US 01)
            </h1>
          </div>
          <p style={{ color: '#94a3b8', margin: '6px 0 0', fontSize: '14px' }}>
            Lộ trình: <strong style={{ color: '#38bdf8' }}>{originStopName}</strong> ➔ <strong style={{ color: '#818cf8' }}>{destStopName}</strong> • Ngày: <strong>{formatDate(departureDate)}</strong>
          </p>
        </div>

        {/* Loading / Error States */}
        {isLoading && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#94a3b8',
            fontSize: '15px',
          }}>
            <div style={{ fontSize: '30px', marginBottom: '12px' }}>🔄</div>
            Đang truy vấn trực tiếp cơ sở dữ liệu cơ sở dữ liệu thật...
          </div>
        )}

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '16px 20px',
            borderRadius: '12px',
            marginBottom: '24px',
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* No Results */}
        {!isLoading && !errorMsg && trips.length === 0 && (
          <div style={{
            background: 'rgba(17, 24, 39, 0.6)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '48px 24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🚫</div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', margin: '0 0 8px', fontStyle: 'normal' }}>
              Không tìm thấy chuyến xe phù hợp
            </h3>
            <p style={{ color: '#94a3b8', maxWidth: '550px', margin: '0 auto 20px', fontSize: '14px', lineHeight: 1.6 }}>
              Không có chuyến xe nào chạy theo thứ tự từ <strong>{originStopName}</strong> đến <strong>{destStopName}</strong> trong ngày đã chọn.
              <br />
              <em>Quy tắc nghiệp vụ: Hệ thống chỉ hiển thị chuyến khi thứ tự trạm đón nhỏ hơn thứ tự trạm trả (origin_rs.stop_order &lt; dest_rs.stop_order).</em>
            </p>
            <button
              onClick={() => {
                navigate(
                  `/search?origin_stop_id=${destStopId}&destination_stop_id=${originStopId}&departure_date=${departureDate}`
                );
              }}
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⇄ Thử tìm chiều ngược lại
            </button>
          </div>
        )}

        {/* Trips List */}
        {!isLoading && trips.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              Tìm thấy <strong style={{ color: '#38bdf8' }}>{trips.length}</strong> chuyến xe phù hợp:
            </div>

            {(Array.isArray(trips) ? trips : []).map((trip) => (
              <div
                key={trip.tripId}
                style={{
                  background: 'rgba(17, 24, 39, 0.75)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '24px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr)) auto',
                  gap: '20px',
                  alignItems: 'center',
                }}
              >
                {/* Route & Times */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                    }}>
                      {trip.routeCode}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                      {trip.routeName}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '14px' }}>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#38bdf8' }}>
                        {formatTime(trip.departureTime)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{trip.origin.name}</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>~{trip.durationMinutes} phút</span>
                      <div style={{ width: '80px', height: '2px', background: 'rgba(255, 255, 255, 0.2)', position: 'relative' }}>
                        <div style={{
                          position: 'absolute',
                          right: '-4px',
                          top: '-4px',
                          width: '0',
                          height: '0',
                          borderTop: '5px solid transparent',
                          borderBottom: '5px solid transparent',
                          borderLeft: '6px solid #38bdf8',
                        }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#818cf8' }}>
                        {formatTime(trip.arrivalTime)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{trip.destination.name}</div>
                    </div>
                  </div>
                </div>

                {/* Bus info & seats */}
                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '20px' }}>
                  <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
                    🚌 Biển số: <strong style={{ color: '#f8fafc' }}>{trip.busPlate}</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
                    💺 Còn trống: <strong style={{ color: trip.availableSeats > 5 ? '#34d399' : '#f87171' }}>
                      {trip.availableSeats} / {trip.totalSeats} chỗ
                    </strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Thứ tự trạm: {trip.origin.order} ➔ {trip.destination.order}
                  </div>
                </div>

                {/* Price & Booking action */}
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#38bdf8' }}>
                    {trip.fare?.toLocaleString()} <span style={{ fontSize: '14px' }}>VNĐ</span>
                  </div>
                  <button
                    onClick={() => handleBooking(trip)}
                    disabled={trip.availableSeats === 0}
                    style={{
                      background: trip.availableSeats === 0
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 22px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: trip.availableSeats === 0 ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                    }}
                  >
                    {trip.availableSeats === 0
                      ? 'Hết chỗ'
                      : 'Chọn chuyến & ghế'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchResultsPage;
