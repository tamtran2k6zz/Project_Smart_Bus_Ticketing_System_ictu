import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { BusRoute } from '../../types/route';
import { getApiUrl, apiFetch } from '../../api/client';

interface SeatInfo {
  id: string;
  seatNumber: string;
  rowPosition: string;
  isPriority: boolean;
  isAvailable: boolean;
  status?: string;
}

interface TripItem {
  id: string;
  code: string;
  routeName: string;
  plateNumber: string;
  departureTime: string;
  basePrice: number;
}

export const PassengerPortalPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'booking' | 'discount' | 'feedback' | 'routes'>('booking');

  // Đặt vé
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [seats, setSeats] = useState<SeatInfo[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'VNPAY' | 'MOMO'>('VNPAY');
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [isBooking, setIsBooking] = useState<boolean>(false);
  const [bookingMsg, setBookingMsg] = useState<string | null>(null);

  // Hồ sơ ưu đãi HSSV
  const [discountStatus, setDiscountStatus] = useState<string>('APPROVED');
  const [discountMsg, setDiscountMsg] = useState<string | null>(null);

  // Đánh giá
  const [ratingStars, setRatingStars] = useState(5);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  // Tuyến xe
  const [routes, setRoutes] = useState<BusRoute[]>([]);

  // =========================================================
  // TASK 3: State đồng hồ đếm ngược (ĐẶT ĐÚNG VỊ TRÍ Ở ĐÂY)
  // =========================================================
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showWarningPopup, setShowWarningPopup] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const warningShownRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // =========================================================
  // TASK 2: Hàm đổi màu ghế (hàm thuần, KHÔNG chứa hook/state)
  // =========================================================
  const getSeatStyles = (seat: SeatInfo, isSelected: boolean) => {
    if (isSelected || seat.status === 'LOCKED') {
      return {
        border: '1px solid #f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.25)',
        color: '#fdba74',
        boxShadow: '0 0 16px rgba(249, 115, 22, 0.4)',
        cursor: 'pointer',
      };
    }
    if (seat.status === 'AVAILABLE' || seat.isAvailable) {
      return {
        border: '1px solid #10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        color: '#34d399',
        boxShadow: 'none',
        cursor: 'pointer',
      };
    }
    return {
      border: '1px solid rgba(255, 255, 255, 0.2)',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      color: 'rgba(255, 255, 255, 0.3)',
      boxShadow: 'none',
      cursor: 'not-allowed',
    };
  };

  // =========================================================
  // TASK 3: Hàm tiện ích đồng hồ
  // =========================================================
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getTimerColor = (seconds: number): string => {
    if (seconds <= 60) return '#ef4444';
    if (seconds <= 120) return '#f97316';
    return '#34d399';
  };

  // =========================================================
  // TASK 3: useEffect khởi động đồng hồ khi đặt vé xong
  // =========================================================
  useEffect(() => {
    if (!bookingResult) return;

    const expRaw = bookingResult.ticket?.reservationExpiresAt || bookingResult.expiresAt;
    let initialSeconds = 10 * 60;
    if (expRaw && !isNaN(new Date(expRaw).getTime())) {
      const diff = Math.floor((new Date(expRaw).getTime() - Date.now()) / 1000);
      initialSeconds = diff > 0 ? diff : 0;
    }

    setTimeLeft(initialSeconds);
    setIsExpired(initialSeconds <= 0);
    setShowWarningPopup(false);
    warningShownRef.current = false;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(timerRef.current!);
          setIsExpired(true);
          return 0;
        }
        const next = prev - 1;
        if (next <= 120 && !warningShownRef.current) {
          setShowWarningPopup(true);
          warningShownRef.current = true;
        }
        if (next <= 0) {
          clearInterval(timerRef.current!);
          setIsExpired(true);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [bookingResult]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const fetchTrips = useCallback(async () => {
    try {
      const dashRes = await apiFetch(getApiUrl('/api/v1/trips'));
      const dashJson = await dashRes.json();
      dashJson.tripOccupancy = dashJson.data;
      const rawOccupancy = Array.isArray(dashJson?.tripOccupancy)
        ? dashJson.tripOccupancy
        : Array.isArray(dashJson?.data?.tripOccupancy)
        ? dashJson.data.tripOccupancy
        : [];
      const tripList = rawOccupancy.map((t: any) => ({
        id: t.id,
        code: t.routeCode,
        routeName: t.routeName,
        plateNumber: t.busPlate,
        departureTime: t.departureTime,
        basePrice: Number(t.basePrice),
      }));
      setTrips(tripList);
      if (tripList.length > 0) setSelectedTripId(tripList[0].id);
    } catch (e) {
      console.error(e);
      setTrips([]);
    }
  }, []);

  useEffect(() => {
    setSelectedSeat('');
  }, [selectedTripId]);

  useEffect(() => {
    if (!selectedTripId) return;
    const fetchSeats = async () => {
      try {
        const res = await apiFetch(getApiUrl(`/api/v1/ticketing/trips/${selectedTripId}/seats`));
        const json = await res.json();
        const rawSeats = Array.isArray(json?.data?.seats)
          ? json.data.seats
          : Array.isArray(json?.seats)
          ? json.seats
          : [];
        setSeats(rawSeats);
      } catch (e) {
        console.error(e);
      }
    };
    fetchSeats();
    const intervalId = setInterval(() => fetchSeats(), 3000);
    return () => clearInterval(intervalId);
  }, [selectedTripId]);

  const fetchOtherData = useCallback(async () => {
    try {
      const [fbRes, rRes] = await Promise.all([
        apiFetch(getApiUrl('/api/v1/operations/feedbacks')),
        apiFetch(getApiUrl('/api/v1/routes')),
      ]);
      const fbJson = await fbRes.json();
      const rJson = await rRes.json();
      setFeedbacks(Array.isArray(fbJson?.data) ? fbJson.data : Array.isArray(fbJson) ? fbJson : []);
      const rawList = Array.isArray(rJson?.data) ? rJson.data : Array.isArray(rJson) ? rJson : [];
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
    } catch (e) {
      console.error(e);
      setFeedbacks([]);
      setRoutes([]);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
    fetchOtherData();
  }, [fetchTrips, fetchOtherData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('paymentOrder');
    if (!orderId) return;
    const loadPayment = async () => {
      try {
        const token = localStorage.getItem('smartbus_access_token');
        const response = await apiFetch(getApiUrl(`/api/v1/ticketing/payments/${orderId}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Không thể tải trạng thái thanh toán.');
        setBookingResult(result.data);
        setBookingMsg(
          result.data.paymentStatus === 'SUCCESS'
            ? 'Thanh toán thành công, vé đã được xác nhận.'
            : `Trạng thái thanh toán: ${result.data.paymentStatus}.`
        );
      } catch (error) {
        setBookingMsg(error instanceof Error ? error.message : 'Không thể tải trạng thái thanh toán.');
      } finally {
        window.history.replaceState({}, '', window.location.pathname);
      }
    };
    void loadPayment();
  }, []);

  const handleBook = async () => {
    if (!selectedSeat) {
      alert('Vui lòng chọn 1 vị trí ghế trên xe!');
      return;
    }
    setIsBooking(true);
    setBookingMsg(null);
    try {
      const token = localStorage.getItem('smartbus_access_token');
      const res = await apiFetch(getApiUrl('/api/v1/ticketing/bookings'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          tripId: selectedTripId,
          userId: user?.id,
          seatNumber: selectedSeat,
          paymentMethod,
          voucherCode: voucherCode.trim() || undefined,
          customerEmail: user?.email || 'khachhang@gmail.com',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Đặt vé thất bại trong cơ sở dữ liệu!');
      setBookingResult(json.data || json);
      if (json.paymentUrl || json.data?.paymentUrl) {
        window.location.assign(json.paymentUrl || json.data.paymentUrl);
        return;
      }
      setBookingMsg('🎉 Đặt vé thành công!');
      const seatsRes = await apiFetch(getApiUrl(`/api/v1/ticketing/trips/${selectedTripId}/seats`));
      const seatsJson = await seatsRes.json();
      const rawSeats = Array.isArray(seatsJson?.data?.seats)
        ? seatsJson.data.seats
        : Array.isArray(seatsJson?.seats)
        ? seatsJson.seats
        : [];
      setSeats(rawSeats);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancelTicket = async () => {
    const ticketId = bookingResult?.ticket?.id || bookingResult?.ticketId;
    if (!ticketId) return;
    try {
      const response = await apiFetch(getApiUrl(`/api/v1/ticketing/tickets/${ticketId}/cancel`), { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Không thể hủy vé.');
      setBookingMsg(result.message);
      setBookingResult((current: any) => ({
        ...current,
        ticket: { ...current.ticket, status: 'CANCELLED' },
        paymentStatus: current.paymentStatus === 'SUCCESS' ? 'REFUNDED' : current.paymentStatus,
      }));
    } catch (error) {
      setBookingMsg(error instanceof Error ? error.message : 'Không thể hủy vé.');
    }
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackContent.trim()) { alert('Vui lòng nhập nội dung đánh giá!'); return; }
    try {
      const token = localStorage.getItem('smartbus_access_token');
      const res = await apiFetch(getApiUrl('/api/v1/operations/feedbacks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ tripId: trips[0]?.id || 'trip-1', userId: user?.id, ratingStars: Number(ratingStars), criteria: 'ThaiDoVaDungGio', content: feedbackContent.trim() }),
      });
      if (!res.ok) throw new Error('Gửi đánh giá thất bại!');
      setFeedbackMsg('⭐ Cảm ơn bạn! Đánh giá đã được lưu vào hệ thống.');
      setFeedbackContent('');
      await fetchOtherData();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) { alert(err.message); }
  };

  const handleRegisterDiscount = async () => {
    setDiscountStatus('APPROVED');
    setDiscountMsg('✅ Đã xác thực hồ sơ Sinh viên ICTU! Bạn được giảm giá vé 50% trên mọi chuyến xe.');
    setTimeout(() => setDiscountMsg(null), 5000);
  };

  const displayName = user?.fullName || 'Hành khách SmartBus';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="admin-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* =========================================================
          TASK 3: POPUP CẢNH BÁO SẮP HẾT THỜI GIAN GIỮ CHỖ
      ========================================================= */}
      {showWarningPopup && !isExpired && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(6px)' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(20,20,40,0.98), rgba(30,15,15,0.98))', border: '1px solid rgba(249,115,22,0.6)', borderRadius: '24px', padding: '40px 48px', maxWidth: '460px', width: '90%', textAlign: 'center', boxShadow: '0 0 60px rgba(249,115,22,0.4)' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ color: '#f97316', fontSize: '24px', margin: '0 0 12px', fontWeight: 700 }}>Sắp hết thời gian giữ chỗ!</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px', margin: '0 0 20px', lineHeight: 1.6 }}>
              Bạn còn <strong style={{ color: '#f97316' }}>chưa đến 2 phút</strong> để hoàn tất thanh toán. Ghế sẽ bị giải phóng tự động nếu quá hạn.
            </p>
            {timeLeft !== null && (
              <div style={{ fontSize: '52px', fontWeight: 800, fontFamily: 'monospace', color: '#ef4444', marginBottom: '28px', letterSpacing: '4px', textShadow: '0 0 20px rgba(239,68,68,0.8)' }}>
                {formatTime(timeLeft)}
              </div>
            )}
            <button onClick={() => setShowWarningPopup(false)} style={{ padding: '12px 32px', borderRadius: '9999px', background: 'linear-gradient(135deg, #f97316, #ef4444)', border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(249,115,22,0.5)' }}>
              Tôi hiểu, đóng lại →
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="header" style={{ position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="logo-icon">🚌</div>
          <div>
            <h1 style={{ fontSize: '22px', margin: 0 }}>Cổng Dịch Vụ Hành Khách</h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255, 255, 255, 0.55)' }}>
              Đặt vé trực tuyến, chọn ghế, mã QR & Ưu đãi học sinh sinh viên
            </p>
          </div>
        </div>
        <div className="admin-profile" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '9999px', fontSize: '11px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8' }}>
            🎓 Ưu đãi HSSV (Giảm 50%)
          </span>
          <a href="/landing.html" target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '9999px', border: '1px solid rgba(56, 189, 248, 0.3)', background: 'rgba(56, 189, 248, 0.08)', color: '#38bdf8', textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            🌌 Landing Page ↗
          </a>
          <div className="avatar">{initial}</div>
          <div>
            <strong>{displayName}</strong>
            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Hành khách</span>
          </div>
          <button type="button" onClick={handleLogout} style={{ padding: '7px 16px', fontSize: '12px', borderRadius: '9999px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', cursor: 'pointer', fontWeight: 500 }}>
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Navigation Pills */}
      <div style={{ padding: '16px 36px 0', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {(['booking', 'discount', 'feedback', 'routes'] as const).map((tab) => (
          <button key={tab} className={`menu-item ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)} style={{ width: 'auto', padding: '9px 20px', borderRadius: '9999px' }}>
            {tab === 'booking' && '🎫 Đặt vé & Sơ đồ ghế (US 1, 2, 3, 4)'}
            {tab === 'discount' && '🎓 Ưu đãi HSSV (US 17)'}
            {tab === 'feedback' && '💬 Đánh giá chuyến đi (US 24)'}
            {tab === 'routes' && '🚌 Lộ trình & Giá vé'}
          </button>
        ))}
      </div>

      <main className="content" style={{ padding: '24px 36px 48px' }}>

        {/* TAB 1: ĐẶT VÉ */}
        {activeTab === 'booking' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="liquid-glass" style={{ padding: '32px' }}>
              <h2 style={{ fontSize: '28px', margin: '0 0 6px' }}>Đặt Vé Xe Buýt Trực Tuyến & Giữ Chỗ</h2>
              <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '24px' }}>
                Chọn chuyến xe xuất bến, chọn vị trí ngồi và nhận vé điện tử QR lưu trữ trực tiếp trong cơ sở dữ liệu.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '8px' }}>Chọn chuyến xe xuất bến:</label>
                  <select className="filter-select" value={selectedTripId} onChange={(e) => setSelectedTripId(e.target.value)} style={{ width: '100%', borderRadius: '12px', height: '46px' }}>
                    {(Array.isArray(trips) ? trips : []).map((t) => (
                      <option key={t.id} value={t.id}>[{t.code}] {t.routeName} - Xe {t.plateNumber} ({new Date(t.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '8px' }}>Mã khuyến mãi Voucher (Gợi ý: BUYT5K, ICTU2026):</label>
                  <input type="text" className="search-input" placeholder="Nhập mã voucher giảm giá..." value={voucherCode} onChange={(e) => setVoucherCode(e.target.value.toUpperCase())} style={{ width: '100%', borderRadius: '12px', height: '46px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '8px' }}>Cổng thanh toán:</label>
                  <select className="filter-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'VNPAY' | 'MOMO')} style={{ width: '100%', borderRadius: '12px', height: '46px' }}>
                    <option value="VNPAY">VNPay</option>
                    <option value="MOMO">MoMo</option>
                  </select>
                </div>
              </div>

              {/* Sơ đồ ghế */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.85)' }}>Sơ đồ vị trí ghế ngồi:</span>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '14px', height: '14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '4px' }} />Ghế trống (Xanh)
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '14px', height: '14px', background: 'rgba(249, 115, 22, 0.25)', border: '1px solid #f97316', borderRadius: '4px', boxShadow: '0 0 10px #f97316' }} />Đang chọn/Giữ
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '14px', height: '14px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '4px' }} />Đã bán (Xám)
                    </span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '12px', padding: '20px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  {(Array.isArray(seats) ? seats : []).map((s) => {
                    const isSelected = selectedSeat === s.seatNumber;
                    const seatStyle = getSeatStyles(s, isSelected);
                    return (
                      <button key={s.id} disabled={s.status !== 'AVAILABLE' && !s.isAvailable && !isSelected}
                        onClick={() => { if (s.status === 'AVAILABLE' || s.isAvailable) setSelectedSeat(s.seatNumber); }}
                        style={{ padding: '14px 6px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, backdropFilter: 'blur(8px)', transition: 'all 0.18s ease', ...seatStyle }}>
                        <div style={{ fontSize: '15px' }}>{s.seatNumber}</div>
                        <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>{s.rowPosition === 'WINDOW' ? 'Cửa sổ' : 'Lối đi'}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={handleBook} disabled={!selectedSeat || isBooking} className="primary-button" style={{ padding: '12px 28px', fontSize: '14px', cursor: !selectedSeat || isBooking ? 'not-allowed' : 'pointer', opacity: !selectedSeat || isBooking ? 0.5 : 1 }}>
                  {isBooking ? 'Đang ghi nhận cơ sở dữ liệu...' : `Xác nhận Đặt Ghế ${selectedSeat || ''} & Nhận Vé QR →`}
                </button>
                {bookingMsg && (
                  <span style={{ color: '#34d399', fontSize: '14px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span className="pulse-dot" /> {bookingMsg}
                  </span>
                )}
              </div>

              {/* Vé điện tử + ĐỒNG HỒ ĐẾM NGƯỢC */}
              {bookingResult && (() => {
                const tCode = bookingResult.ticket?.ticketCode || bookingResult.ticketCode || 'TKT-ICTU-8888';
                const sNumber = bookingResult.ticket?.seatNumber || bookingResult.seatNumber || selectedSeat || 'A01';
                const payAmount = bookingResult.payment?.amount || bookingResult.ticket?.fareAmount || bookingResult.fareAmount || 10000;
                const qrVal = bookingResult.qrCode || `SMARTBUS-QR-${tCode}`;
                const qrImg = bookingResult.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrVal)}`;
                const ticketStatus = bookingResult.ticket?.status || bookingResult.status;
                const paymentStatus = bookingResult.paymentStatus || bookingResult.payment?.status;
                const isPaid = ticketStatus === 'BOOKED' || paymentStatus === 'SUCCESS';
                return (
                  <div className="liquid-glass-strong" style={{ marginTop: '28px', padding: '24px', borderRadius: '18px', border: isExpired ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(56, 189, 248, 0.4)', boxShadow: isExpired ? '0 0 30px rgba(239,68,68,0.2)' : '0 0 30px rgba(56, 189, 248, 0.2)' }}>

                    {/* Header vé + Đồng hồ */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                      <h3 style={{ color: '#38bdf8', fontSize: '22px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🎟️ Vé Điện Tử SmartBus Của Bạn
                      </h3>

                      {/* ⏱️ ĐỒNG HỒ ĐẾM NGƯỢC TASK 3 */}
                      {timeLeft !== null && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 20px', borderRadius: '16px', background: isExpired ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.3)', border: `1px solid ${isExpired ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`, minWidth: '140px' }}>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', fontWeight: 600 }}>
                            {isExpired ? '❌ Đã hết hạn' : '⏱️ Thời gian giữ chỗ'}
                          </div>
                          {isExpired ? (
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444' }}>Hết giờ!</div>
                          ) : (
                            <>
                              <div style={{ fontSize: '34px', fontWeight: 800, fontFamily: 'monospace', color: getTimerColor(timeLeft), letterSpacing: '3px', textShadow: `0 0 16px ${getTimerColor(timeLeft)}88`, transition: 'color 0.5s ease' }}>
                                {formatTime(timeLeft)}
                              </div>
                              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>
                                {timeLeft <= 60 ? '🔴 Thanh toán ngay!' : timeLeft <= 120 ? '🟠 Sắp hết giờ!' : '🟢 Còn nhiều thời gian'}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Banner hết hạn */}
                    {isExpired && (
                      <div style={{ padding: '12px 18px', marginBottom: '16px', borderRadius: '12px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', fontSize: '13.5px', fontWeight: 500 }}>
                        ❌ Thời gian giữ chỗ đã hết! Ghế có thể đã được người khác đặt. Vui lòng chọn lại ghế.
                      </div>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '28px', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '14px', lineHeight: 2, color: 'rgba(255, 255, 255, 0.9)' }}>
                        <p style={{ margin: 0 }}><strong>Mã vé:</strong> <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '15px' }}>{tCode}</span></p>
                        <p style={{ margin: 0 }}><strong>Số ghế:</strong> <span style={{ color: '#34d399', fontWeight: 600 }}>{sNumber}</span></p>
                        <p style={{ margin: 0 }}><strong>Số tiền:</strong> {Number(payAmount).toLocaleString('vi-VN')} VNĐ</p>
                        <p style={{ margin: 0 }}><strong>Trạng thái:</strong> {paymentStatus || (isPaid ? 'SUCCESS' : 'PENDING')}</p>
                        <div style={{ marginTop: '10px', fontSize: '12.5px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{isPaid ? '✓' : '…'}</span> {isPaid ? 'Vé đã được xác nhận' : 'Vé chỉ được xác nhận sau khi cổng thanh toán báo thành công'}
                        </div>
                      </div>
                      {isPaid && (
                        <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)', textAlign: 'center', backdropFilter: 'blur(10px)', opacity: isExpired ? 0.4 : 1 }}>
                          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', fontWeight: 600 }}>MÃ QR ĐƯA CHO TÀI XẾ SOÁT VÉ</div>
                          <div style={{ background: '#ffffff', padding: '10px', borderRadius: '12px', display: 'inline-block', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                            <img src={qrImg} alt="Mã QR Vé Xe Buýt" style={{ width: '140px', height: '140px', display: 'block' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          </div>
                          <div style={{ fontFamily: 'monospace', fontSize: '12px', marginTop: '10px', padding: '6px 12px', background: 'rgba(0,0,0,0.5)', color: '#38bdf8', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.25)' }}>{qrVal}</div>
                        </div>
                      )}
                      {ticketStatus === 'BOOKED' && (
                        <button type="button" onClick={handleCancelTicket} className="primary-button" style={{ marginTop: '20px', background: '#b91c1c' }}>
                          Hủy vé / yêu cầu hoàn tiền
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 2: ƯU ĐÃI HSSV */}
        {activeTab === 'discount' && (
          <div className="liquid-glass" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '28px', margin: '0 0 6px' }}>Hồ Sơ Vé Ưu Đãi Học Sinh - Sinh Viên (US 17)</h2>
            <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '24px' }}>Chính sách trợ giá vé xe buýt của thành phố dành riêng cho HSSV các trường Đại học & Cao đẳng.</p>
            {discountMsg && (<div style={{ padding: '12px 18px', marginBottom: '20px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34d399', fontSize: '13.5px', fontWeight: 500 }}>{discountMsg}</div>)}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
              <div className="liquid-glass" style={{ padding: '24px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Trạng thái hồ sơ</span>
                <div style={{ fontSize: '22px', fontWeight: 600, color: '#34d399', marginTop: '6px' }}>{discountStatus === 'APPROVED' ? '✓ Đã Phê Duyệt' : 'Chờ xác nhận'}</div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>Được áp dụng mức giá vé trợ giá 100.000đ/tháng hoặc giảm 50% vé lượt.</p>
              </div>
              <div className="liquid-glass" style={{ padding: '24px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Cơ sở đào tạo</span>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#ffffff', marginTop: '6px' }}>Đại học CNTT & Truyền Thông (ICTU)</div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>Đã liên thông thẻ sinh viên điện tử vào hệ thống SmartBus.</p>
              </div>
            </div>
            <button onClick={handleRegisterDiscount} className="primary-button" style={{ padding: '11px 24px', borderRadius: '9999px' }}>🔄 Xác nhận / Gia hạn hồ sơ HSSV (Lưu cơ sở dữ liệu)</button>
          </div>
        )}

        {/* TAB 3: ĐÁNH GIÁ */}
        {activeTab === 'feedback' && (
          <div className="liquid-glass" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '28px', margin: '0 0 6px' }}>Đánh Giá & Phản Ánh Chất Lượng Chuyến Đi (US 24)</h2>
            <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>Ý kiến của bạn giúp nâng cao chất lượng phục vụ của đội ngũ tài xế và nhân viên nhà xe.</p>
            {feedbackMsg && (<div style={{ padding: '12px 18px', marginBottom: '20px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#34d399', fontSize: '13.5px', fontWeight: 500 }}>{feedbackMsg}</div>)}
            <form onSubmit={handleSendFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px', marginBottom: '28px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.75)', marginBottom: '8px' }}>Đánh giá số sao:</label>
                <select className="filter-select" value={ratingStars} onChange={(e) => setRatingStars(Number(e.target.value))} style={{ width: '100%', borderRadius: '12px', height: '44px' }}>
                  <option value="5">⭐⭐⭐⭐⭐ 5 Sao (Rất hài lòng)</option>
                  <option value="4">⭐⭐⭐⭐ 4 Sao (Hài lòng)</option>
                  <option value="3">⭐⭐⭐ 3 Sao (Bình thường)</option>
                  <option value="2">⭐⭐ 2 Sao (Chưa tốt)</option>
                  <option value="1">⭐ 1 Sao (Rất thất vọng)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.75)', marginBottom: '8px' }}>Nội dung nhận xét:</label>
                <textarea rows={3} className="search-input" placeholder="Chia sẻ trải nghiệm của bạn về chuyến xe, thái độ phục vụ..." value={feedbackContent} onChange={(e) => setFeedbackContent(e.target.value)} style={{ width: '100%', borderRadius: '16px', padding: '12px 16px', height: 'auto' }} />
              </div>
              <button type="submit" className="primary-button" style={{ alignSelf: 'flex-start', padding: '11px 26px' }}>Gửi phản ánh (Lưu cơ sở dữ liệu) →</button>
            </form>
            <h3 style={{ fontSize: '18px', margin: '0 0 14px' }}>Các đánh giá gần đây:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(Array.isArray(feedbacks) ? feedbacks : []).map((fb) => (
                <div key={fb.id} className="liquid-glass" style={{ padding: '16px 20px', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#ffffff' }}>{fb.user?.fullName || 'Hành khách'}</span>
                    <span style={{ color: '#fbbf24', fontSize: '16px' }}>{'★'.repeat(fb.ratingStars)}</span>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.75)', marginTop: '6px', fontSize: '13.5px' }}>{fb.content}</div>
                  {fb.responseFromStaff && (
                    <div style={{ marginTop: '10px', padding: '8px 14px', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '8px', color: '#38bdf8', fontSize: '12.5px' }}>
                      <strong>Nhà xe phản hồi:</strong> {fb.responseFromStaff}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: LỘ TRÌNH */}
        {activeTab === 'routes' && (
          <div className="liquid-glass" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '28px', margin: '0 0 6px' }}>Lộ Trình Tuyến & Giá Vé Niêm Yết</h2>
            <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>Tra cứu tuyến xe buýt và các trạm dừng đón trả khách gần bạn nhất.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(Array.isArray(routes) ? routes : []).map((r) => (
                <div key={r.id} className="liquid-glass" style={{ padding: '20px', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div><strong style={{ fontSize: '18px', color: '#38bdf8' }}>[{r.code}]</strong>{' '}<span style={{ fontSize: '16px', fontWeight: 600 }}>{r.name}</span></div>
                    <span className="status-badge active">{r.status}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Lộ trình qua {Array.isArray(r.stations) ? r.stations.length : 0} trạm dừng:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(Array.isArray(r.stations) ? r.stations : []).map((st, i) => (
                      <span key={st.id} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '9999px', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                        {i + 1}. {st.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PassengerPortalPage;