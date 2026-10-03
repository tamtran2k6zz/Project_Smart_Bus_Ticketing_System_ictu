import React, { useState, useEffect } from 'react';
import { getApiUrl, apiFetch } from '../../api/client';
import { PaymentQrCode } from '../PaymentQrCode';
import type { BookingResult } from '../../types/booking';
import type { TicketVerificationResult, TripOccupancy } from '../../types/api';
import { getErrorMessage } from '../../utils/errorMessage';

interface SeatInfo {
  id: string;
  seatNumber: string;
  rowPosition: string;
  isPriority: boolean;
  isAvailable: boolean;
  status?: string; // Trạng thái ghế từ API: AVAILABLE, LOCKED, BOOKED, CHECKED_IN
}

interface TripItem {
  id: string;
  code: string;
  routeName: string;
  plateNumber: string;
  departureTime: string;
  basePrice: number;
}

interface RouteOption {
  id: string;
  code: string;
  name: string;
  status: string;
  stops: Array<{ stopId: string; name: string; stopOrder: number }>;
  basePrice: number;
}

function toDateTimeLocalValue(date: Date): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export const TicketBookingView: React.FC = () => {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [createTripError, setCreateTripError] = useState<string | null>(null);
  const [createTripMessage, setCreateTripMessage] = useState<string | null>(null);
  const [newTrip, setNewTrip] = useState(() => {
    const departure = new Date(Date.now() + 2 * 60 * 60 * 1000);
    departure.setMinutes(0, 0, 0);
    const arrival = new Date(departure.getTime() + 60 * 60 * 1000);
    return {
      routeId: '',
      busPlate: '',
      departureTime: toDateTimeLocalValue(departure),
      arrivalTime: toDateTimeLocalValue(arrival),
      totalSeats: 40,
      basePrice: 10000,
    };
  });
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [seats, setSeats] = useState<SeatInfo[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string>('');
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Soát vé QR
  const [verifyCode, setVerifyCode] = useState<string>('');
  const [verifyResult, setVerifyResult] = useState<TicketVerificationResult | null>(null);

  // =========================================================
  // HÀM QUY ĐỊNH MÀU SẮC GHẾ (Xanh, Cam, Xám) THEO TASK 2
  // =========================================================
  const getSeatStyles = (seat: SeatInfo, isSelected: boolean) => {
    // 1. Đang chọn (bởi bạn) hoặc Đang bị giữ (bởi người khác) -> MÀU CAM
    if (isSelected || seat.status === 'LOCKED') {
      return {
        border: '1px solid #f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.25)',
        color: '#fdba74',
        boxShadow: '0 0 16px rgba(249, 115, 22, 0.4)',
        cursor: 'pointer'
      };
    }
    
    // 2. Trống (AVAILABLE) -> MÀU XANH
    if (seat.status === 'AVAILABLE' || seat.isAvailable) {
      return {
        border: '1px solid #10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        color: '#34d399',
        boxShadow: 'none',
        cursor: 'pointer'
      };
    }

    // 3. Đã bán (BOOKED, CHECKED_IN) -> MÀU XÁM
    return {
      border: '1px solid rgba(255, 255, 255, 0.2)',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      color: 'rgba(255, 255, 255, 0.3)',
      boxShadow: 'none',
      cursor: 'not-allowed'
    };
  };

  const fetchTrips = async () => {
    const dashRes = await apiFetch(getApiUrl('/api/v1/operations/dashboard/summary'));
    const dashJson = await dashRes.json();
    if (!dashRes.ok) {
      throw new Error(dashJson?.message || 'Không thể tải danh sách chuyến.');
    }
    const rawOccupancy: TripOccupancy[] = Array.isArray(dashJson?.tripOccupancy)
      ? dashJson.tripOccupancy
      : Array.isArray(dashJson?.data?.tripOccupancy)
      ? dashJson.data.tripOccupancy
      : [];

    const tripList = rawOccupancy.map(t => ({
      id: String(t.id),
      code: t.routeCode || '',
      routeName: t.routeName || '',
      plateNumber: t.busPlate || '',
      departureTime: t.departureTime || '',
      basePrice: Number(t.basePrice) || 10000,
    }));
    setTrips(tripList);
    return tripList;
  };

  // Nạp danh sách tuyến và chuyến xe từ cơ sở dữ liệu.
  useEffect(() => {
    let active = true;
    Promise.all([
      fetchTrips(),
      apiFetch(getApiUrl('/api/v1/routes')).then(async response => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body?.message || 'Không thể tải danh sách tuyến.');
        }
        const routeList = Array.isArray(body?.data) ? body.data : [];
        return routeList
          .filter((route: RouteOption) => route.status === 'ACTIVE')
          .map((route: RouteOption) => ({
            ...route,
            stops: Array.isArray(route.stops) ? route.stops : [],
            basePrice: Number(route.basePrice) || 10000,
          }));
      }),
    ])
      .then(([tripList, routeList]) => {
        if (!active) return;
        setRoutes(routeList);
        if (tripList.length > 0) setSelectedTripId(tripList[0].id);
        setNewTrip(current => ({
          ...current,
          routeId: routeList[0]?.id ?? '',
          basePrice: routeList[0]?.basePrice ?? current.basePrice,
        }));
      })
      .catch((err: unknown) => {
        if (active) {
          console.error(err);
          setCreateTripError(getErrorMessage(err, 'Không thể tải dữ liệu chuyến xe.'));
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleCreateTrip = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateTripError(null);
    setCreateTripMessage(null);
    const departure = new Date(newTrip.departureTime);
    const arrival = new Date(newTrip.arrivalTime);
    if (Number.isNaN(departure.getTime()) || departure.getTime() <= Date.now()) {
      setCreateTripError('Giờ xuất bến phải ở trong tương lai.');
      return;
    }
    if (Number.isNaN(arrival.getTime()) || arrival <= departure) {
      setCreateTripError('Giờ đến phải sau giờ xuất bến.');
      return;
    }
    const selectedRoute = routes.find(route => route.id === newTrip.routeId);
    if (!selectedRoute) {
      setCreateTripError('Vui lòng chọn tuyến xe.');
      return;
    }
    if (selectedRoute.stops.length < 2) {
      setCreateTripError(
        `Tuyến ${selectedRoute.code} hiện có ${selectedRoute.stops.length} trạm. Hãy thêm ít nhất hai trạm rồi tạo chuyến để hành khách có thể tìm tuyến.`,
      );
      return;
    }

    setIsCreatingTrip(true);
    try {
      const response = await apiFetch(getApiUrl('/api/v1/trips'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route_id: selectedRoute.id,
          bus_plate: newTrip.busPlate.trim(),
          departure_time: departure.toISOString(),
          arrival_time: arrival.toISOString(),
          total_seats: Number(newTrip.totalSeats),
          base_price: Number(newTrip.basePrice),
          status: 'SCHEDULED',
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.message || 'Không thể tạo chuyến xuất bến.');
      }

      const tripList = await fetchTrips();
      const createdTripId = String(body?.data?.id ?? '');
      if (createdTripId && tripList.some(trip => trip.id === createdTripId)) {
        setSelectedTripId(createdTripId);
      }
      setCreateTripMessage(`Đã tạo chuyến ${selectedRoute.code}; chuyến đã được thêm vào danh sách.`);
      setShowCreateTrip(false);
      setNewTrip(current => ({ ...current, busPlate: '' }));
    } catch (err: unknown) {
      setCreateTripError(getErrorMessage(err, 'Không thể tạo chuyến xuất bến.'));
    } finally {
      setIsCreatingTrip(false);
    }
  };

  // Xóa trắng ghế đang chọn nếu đổi sang chuyến xe khác
  useEffect(() => {
    setSelectedSeat('');
  }, [selectedTripId]);

  // 2. Nạp sơ đồ ghế thực tế từ CSDL & Cập nhật Thời Gian Thực (Polling)
  useEffect(() => {
    if (!selectedTripId) return;

    const fetchSeats = async (showLoading = false) => {
      if (showLoading) setIsLoading(true);
      try {
        const res = await apiFetch(getApiUrl(`/api/v1/ticketing/trips/${selectedTripId}/seats`));
        const json = await res.json();
        const rawSeats = Array.isArray(json?.data?.seats)
          ? json.data.seats
          : Array.isArray(json?.seats)
          ? json.seats
          : [];
        setSeats(rawSeats);
      } catch (err) {
        console.error(err);
      } finally {
        if (showLoading) setIsLoading(false);
      }
    };

    // Lần đầu tải có hiện xoay vòng Loading
    fetchSeats(true);

    // Chạy ngầm (polling): tự động gọi lại API sau mỗi 3 giây để cập nhật trạng thái ghế
    const intervalId = setInterval(() => {
      fetchSeats(false); // Gọi API ngầm, không hiện Loading để tránh giật màn hình
    }, 3000);

    return () => clearInterval(intervalId);
  }, [selectedTripId]);

  // 3. Xử lý đặt vé và lưu vào cơ sở dữ liệu (US 2, 3, 4, 6)
  const handleBookTicket = async () => {
    if (!selectedSeat) {
      alert('Vui lòng chọn vị trí ghế trên sơ đồ!');
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    try {
      const token = localStorage.getItem('smartbus_access_token');
      const userStr = localStorage.getItem('smartbus_user');
      const currentUser = userStr ? JSON.parse(userStr) : null;

      const res = await apiFetch(getApiUrl('/api/v1/ticketing/bookings'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          tripId: selectedTripId,
          userId: currentUser?.id,
          seatNumber: selectedSeat,
          voucherCode: voucherCode.trim() || undefined,
          customerEmail: currentUser?.email || 'khachhang@gmail.com',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Đặt vé thất bại trong cơ sở dữ liệu!');
      }

      setBookingResult(json.data || json);
      setStatusMessage('🎉 Đặt vé và giữ chỗ 10 phút thành công! Mã QR đã được lưu trong cơ sở dữ liệu.');

      // Tải lại sơ đồ ghế ngay lập tức sau khi đặt vé
      const seatsRes = await apiFetch(getApiUrl(`/api/v1/ticketing/trips/${selectedTripId}/seats`));
      const seatsJson = await seatsRes.json();
      const rawSeats = Array.isArray(seatsJson?.data?.seats)
        ? seatsJson.data.seats
        : Array.isArray(seatsJson?.seats)
        ? seatsJson.seats
        : [];
      setSeats(rawSeats);
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Không thể đặt vé.'));
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Soát vé QR (US 15 - Tài xế / Phụ xe)
  const handleVerifyTicket = async () => {
    if (!verifyCode.trim()) {
      alert('Vui lòng nhập mã vé hoặc chuỗi mã QR!');
      return;
    }

    try {
      const res = await apiFetch(getApiUrl('/api/v1/ticketing/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Mã vé không hợp lệ trong CSDL cơ sở dữ liệu!');
      }

      setVerifyResult(json.data || json);
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Không thể soát vé.'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="liquid-glass" style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontSize: '20px', margin: '0 0 6px' }}>Lịch chuyến xuất bến</h3>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
              Tuyến như R10 chỉ xuất hiện trong bộ chọn sau khi tạo chuyến xuất bến tương lai.
            </p>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setCreateTripError(null);
              setCreateTripMessage(null);
              setShowCreateTrip(value => !value);
            }}
          >
            {showCreateTrip ? 'Đóng tạo chuyến' : '+ Tạo chuyến xuất bến'}
          </button>
        </div>

        {createTripError && (
          <div className="form-error" role="alert" style={{ marginTop: '16px' }}>
            {createTripError}
          </div>
        )}
        {createTripMessage && (
          <div role="status" style={{ color: '#34d399', marginTop: '16px' }}>
            {createTripMessage}
          </div>
        )}

        {showCreateTrip && (
          <form
            onSubmit={handleCreateTrip}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginTop: '20px',
            }}
          >
            <label>
              Tuyến xe
              <select
                className="filter-select"
                required
                value={newTrip.routeId}
                onChange={event => {
                  const route = routes.find(item => item.id === event.target.value);
                  setNewTrip(current => ({
                    ...current,
                    routeId: event.target.value,
                    basePrice: route?.basePrice ?? current.basePrice,
                  }));
                }}
                style={{ width: '100%', marginTop: '8px' }}
              >
                <option value="" disabled>Chọn tuyến</option>
                {routes.map(route => (
                  <option key={route.id} value={route.id}>
                    [{route.code}] {route.name} — {route.stops.length} trạm
                  </option>
                ))}
              </select>
            </label>
            <label>
              Biển số xe
              <input
                className="search-input"
                required
                value={newTrip.busPlate}
                onChange={event => setNewTrip(current => ({ ...current, busPlate: event.target.value }))}
                placeholder="Ví dụ: 29A-12345"
                style={{ width: '100%', marginTop: '8px' }}
              />
            </label>
            <label>
              Giờ xuất bến
              <input
                className="search-input"
                type="datetime-local"
                required
                value={newTrip.departureTime}
                onChange={event => setNewTrip(current => ({ ...current, departureTime: event.target.value }))}
                style={{ width: '100%', marginTop: '8px' }}
              />
            </label>
            <label>
              Giờ đến
              <input
                className="search-input"
                type="datetime-local"
                required
                value={newTrip.arrivalTime}
                onChange={event => setNewTrip(current => ({ ...current, arrivalTime: event.target.value }))}
                style={{ width: '100%', marginTop: '8px' }}
              />
            </label>
            <label>
              Số ghế
              <input
                className="search-input"
                type="number"
                min={1}
                max={100}
                required
                value={newTrip.totalSeats}
                onChange={event => setNewTrip(current => ({ ...current, totalSeats: Number(event.target.value) }))}
                style={{ width: '100%', marginTop: '8px' }}
              />
            </label>
            <label>
              Giá vé cơ sở (VND)
              <input
                className="search-input"
                type="number"
                min={0}
                required
                value={newTrip.basePrice}
                onChange={event => setNewTrip(current => ({ ...current, basePrice: Number(event.target.value) }))}
                style={{ width: '100%', marginTop: '8px' }}
              />
            </label>
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="primary-button" disabled={isCreatingTrip}>
                {isCreatingTrip ? 'Đang tạo chuyến...' : 'Lưu chuyến xuất bến'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Phân hệ 1: Đặt vé & Sơ đồ ghế */}
      <div className="liquid-glass" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '26px', margin: '0 0 6px' }}>
          Đặt vé Trực tuyến & Sơ đồ ghế (US 1, 2, 3, 4)
        </h3>
        <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.55)', marginBottom: '24px' }}>
          Mọi giao dịch giữ chỗ 10 phút, tạo mã QR và lưu hóa đơn được đồng bộ trực tiếp vào cơ sở dữ liệu cơ sở dữ liệu.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '8px' }}>
              Chọn chuyến xe xuất bến:
            </label>
            <select
              className="filter-select"
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              style={{ width: '100%', borderRadius: '12px', height: '46px' }}
            >
              {(Array.isArray(trips) ? trips : []).map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.code}] {t.routeName} - Xe: {t.plateNumber} ({new Date(t.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '8px' }}>
              Mã giảm giá Voucher (US 18 - Gợi ý: BUYT5K, ICTU2026):
            </label>
            <input
              type="text"
              className="search-input"
              placeholder="Nhập mã khuyến mãi..."
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              style={{ width: '100%', borderRadius: '12px', height: '46px' }}
            />
          </div>
        </div>

        {/* Sơ đồ ghế xe buýt */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.85)' }}>
              Sơ đồ ghế trên xe (Nhấn vào ghế để chọn chỗ):
            </span>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '14px', height: '14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '4px' }} />
                Ghế trống (Xanh)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '14px', height: '14px', background: 'rgba(249, 115, 22, 0.25)', border: '1px solid #f97316', borderRadius: '4px', boxShadow: '0 0 10px #f97316' }} />
                Đang chọn/Giữ
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '14px', height: '14px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '4px' }} />
                Đã bán (Xám)
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
              gap: '12px',
              padding: '20px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            {(Array.isArray(seats) ? seats : []).map((s) => {
              const isSelected = selectedSeat === s.seatNumber;
              
              // Áp dụng hàm tính màu sắc vào từng ghế
              const seatStyle = getSeatStyles(s, isSelected);

              return (
                <button
                  key={s.id}
                  disabled={s.status !== 'AVAILABLE' && !s.isAvailable && !isSelected}
                  onClick={() => {
                    // Chỉ cho click chọn khi ghế AVAILABLE
                    if (s.status === 'AVAILABLE' || s.isAvailable) {
                      setSelectedSeat(s.seatNumber);
                    }
                  }}
                  style={{
                    padding: '14px 6px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.18s ease',
                    ...seatStyle // Truyền màu vào
                  }}
                >
                  <div style={{ fontSize: '15px' }}>{s.seatNumber}</div>
                  <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>
                    {s.rowPosition === 'WINDOW' ? 'Cửa sổ' : 'Lối đi'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleBookTicket}
            disabled={!selectedSeat || isLoading}
            className="primary-button"
            style={{
              padding: '12px 28px',
              fontSize: '14px',
              cursor: !selectedSeat || isLoading ? 'not-allowed' : 'pointer',
              opacity: !selectedSeat || isLoading ? 0.5 : 1,
            }}
          >
            {isLoading ? 'Đang ghi nhận vào cơ sở dữ liệu...' : `Xác nhận Đặt Ghế ${selectedSeat || ''} & Nhận mã QR →`}
          </button>
          {statusMessage && (
            <span style={{ color: '#34d399', fontSize: '14px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span className="pulse-dot" /> {statusMessage}
            </span>
          )}
        </div>

        {/* Kết quả đặt vé & Mã QR hiển thị */}
        {bookingResult && (() => {
          const tCode = bookingResult.ticket?.ticketCode || bookingResult.ticketCode || '';
          const sNumber = bookingResult.ticket?.seatNumber || bookingResult.seatNumber || selectedSeat || '';
          const payAmount = bookingResult.payment?.amount || bookingResult.ticket?.fareAmount || bookingResult.fareAmount || 0;
          const expRaw = bookingResult.ticket?.reservationExpiresAt || bookingResult.expiresAt;
          const expTime = (expRaw && !isNaN(new Date(expRaw).getTime()))
            ? new Date(expRaw).toLocaleTimeString('vi-VN')
            : '—';
          const qrVal = bookingResult.qrCode || `SMARTBUS-QR-${tCode}`;

          return (
            <div
              className="liquid-glass-strong"
              style={{
                marginTop: '24px',
                padding: '24px',
                borderRadius: '18px',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                boxShadow: '0 0 30px rgba(56, 189, 248, 0.2)',
              }}
            >
              <h4 style={{ color: '#38bdf8', fontSize: '20px', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🎟️ Vé điện tử SmartBus (Lưu trong cơ sở dữ liệu)
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '28px', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '14px', lineHeight: 2, color: 'rgba(255, 255, 255, 0.9)' }}>
                  <p style={{ margin: 0 }}><strong>Mã vé:</strong> <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '15px' }}>{tCode}</span></p>
                  <p style={{ margin: 0 }}><strong>Số ghế:</strong> <span style={{ color: '#34d399', fontWeight: 600 }}>{sNumber}</span></p>
                  <p style={{ margin: 0 }}><strong>Số tiền thanh toán:</strong> {Number(payAmount).toLocaleString('vi-VN')} VNĐ</p>
                  <p style={{ margin: 0 }}><strong>Hạn giữ chỗ:</strong> {expTime}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyCode(tCode);
                      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    }}
                    style={{
                      marginTop: '12px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      color: '#38bdf8',
                      padding: '7px 16px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ⚡ Điền nhanh mã vé vào ô Soát vé bên dưới
                  </button>
                </div>

                <div
                  style={{
                    padding: '16px 20px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    textAlign: 'center',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', fontWeight: 600 }}>
                    MÃ QR SOÁT VÉ (US 4)
                  </div>
                  <div style={{ background: '#ffffff', padding: '10px', borderRadius: '12px', display: 'inline-block', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)' }}>
                    <PaymentQrCode value={qrVal} size={140} alt="Mã QR soát vé" />
                  </div>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      marginTop: '10px',
                      padding: '6px 12px',
                      background: 'rgba(0, 0, 0, 0.5)',
                      color: '#38bdf8',
                      borderRadius: '8px',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                    }}
                  >
                    {qrVal}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Phân hệ 2: Soát vé bằng mã QR (US 15 - Tài xế / Phụ xe) */}
      <div className="liquid-glass" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '26px', margin: '0 0 6px' }}>
          Soát vé bằng mã QR / Mã vé (US 15 - Tài xế & Phụ xe)
        </h3>
        <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.55)', marginBottom: '20px' }}>
          Quét hoặc dán chuỗi mã QR của hành khách để kiểm tra tính hợp lệ trực tiếp trong cơ sở dữ liệu cơ sở dữ liệu.
        </p>

        <div style={{ display: 'flex', gap: '12px', maxWidth: '640px', marginBottom: '20px' }}>
          <input
            type="text"
            className="search-input"
            placeholder="Dán chuỗi mã QR hoặc nhập mã vé (VD: TKT-998822)..."
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            style={{ flex: 1, borderRadius: '9999px', height: '46px' }}
          />
          <button
            onClick={handleVerifyTicket}
            className="primary-button"
            style={{
              padding: '0 24px',
              height: '46px',
            }}
          >
            🔍 Soát vé
          </button>
        </div>

        {verifyResult && (
          <div
            className="liquid-glass"
            style={{
              padding: '20px 24px',
              borderRadius: '16px',
              border: verifyResult.isAlreadyCheckedIn
                ? '1px solid rgba(251, 191, 36, 0.4)'
                : '1px solid rgba(16, 185, 129, 0.4)',
              background: verifyResult.isAlreadyCheckedIn
                ? 'rgba(251, 191, 36, 0.08)'
                : 'rgba(16, 185, 129, 0.08)',
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: '16px',
                color: verifyResult.isAlreadyCheckedIn ? '#fbbf24' : '#34d399',
                marginBottom: '10px',
              }}
            >
              {verifyResult.message}
            </div>
            <div style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.7 }}>
              <p style={{ margin: 0 }}><strong>Hành khách:</strong> {verifyResult.ticket?.user?.fullName || 'Khách vãng lai'}</p>
              <p style={{ margin: 0 }}><strong>Tuyến:</strong> {verifyResult.ticket?.trip?.route?.name}</p>
              <p style={{ margin: 0 }}><strong>Số ghế:</strong> {verifyResult.ticket?.seatNumber}</p>
              <p style={{ margin: 0 }}><strong>Trạng thái vé:</strong> {verifyResult.ticket?.status}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketBookingView;