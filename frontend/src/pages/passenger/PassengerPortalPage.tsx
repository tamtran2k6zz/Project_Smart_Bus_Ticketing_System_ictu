import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { BusRoute } from '../../types/route';
import { getApiUrl, apiFetch } from '../../api/client';
import { PaymentQrCode } from '../../components/PaymentQrCode';
import { buildPaymentQrPayload } from '../../utils/paymentQr';
import type { BookingResult } from '../../types/booking';
import type { ApiRoute, FeedbackRecord, TripOccupancy } from '../../types/api';
import { getErrorMessage } from '../../utils/errorMessage';

interface SeatInfo {
  id: string;
  seatNumber: string;
  rowPosition: string;
  isPriority: boolean;
  isAvailable: boolean;
  status?: string; // <-- 1. Đã thêm trường này
}

interface TripItem {
  id: string;
  code: string;
  routeName: string;
  plateNumber: string;
  departureTime: string;
  basePrice: number;
}

interface CompletedTrip {
  tripId: string;
  routeCode: string;
  routeName: string;
  departureTime: string;
  arrivalTime: string;
}

interface MyTicketItem {
  ticket_id: string;
  ticket_code: string;
  seat_number: string;
  fare_amount: number;
  ticket_status: string;
  reservation_expires_at?: string;
  trip_id: string;
  departure_time: string;
  arrival_time: string;
  route_code: string;
  route_name: string;
  bus_plate?: string;
  order_id?: string;
  payment_method?: string;
  payment_amount?: number;
  payment_status?: string;
  paid_at?: string;
}

const ReservationCountdown: React.FC<{ expiresAt: string; onExpired: () => void }> = ({ expiresAt, onExpired }) => {
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      const secs = Math.max(0, Math.floor(diff / 1000));
      setTimeLeft(secs);
      if (secs <= 0) {
        clearInterval(timer);
        onExpired();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, onExpired]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isUrgent = timeLeft < 60;

  return (
    <span style={{ color: isUrgent ? '#f87171' : '#fbbf24', fontWeight: 700, fontFamily: 'monospace', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      ⏱️ {timeLeft > 0 ? `Hết hạn sau: ${formatted}` : 'ĐÃ HẾT HẠN (10 PHÚT)'}
    </span>
  );
};

export const PassengerPortalPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const requestedTripId = searchParams.get('trip_id');

  const [activeTab, setActiveTab] = useState<'booking' | 'my-tickets' | 'discount' | 'feedback' | 'routes'>('booking');

  // Đặt vé
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [seats, setSeats] = useState<SeatInfo[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string>('');
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [myTickets, setMyTickets] = useState<MyTicketItem[]>([]);
  const [isBooking, setIsBooking] = useState<boolean>(false);
  const [bookingMsg, setBookingMsg] = useState<string | null>(null);

  const fetchMyTickets = useCallback(async () => {
    try {
      const token = localStorage.getItem('smartbus_access_token');
      const res = await apiFetch(getApiUrl('/api/v1/ticketing/my-tickets'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json?.data)) {
        setMyTickets(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchMyTickets();
  }, [fetchMyTickets]);

  useEffect(() => {
    const saved = localStorage.getItem('smartbus_last_booking');
    if (saved) {
      try {
        setBookingResult(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    if (bookingResult) {
      localStorage.setItem('smartbus_last_booking', JSON.stringify(bookingResult));
    }
  }, [bookingResult]);

  // Hồ sơ ưu đãi HSSV
  const [discountStatus, setDiscountStatus] = useState<string>('APPROVED');
  const [discountMsg, setDiscountMsg] = useState<string | null>(null);

  // Đánh giá
  const [ratingStars, setRatingStars] = useState(5);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [completedTrips, setCompletedTrips] = useState<CompletedTrip[]>([]);
  const [selectedFeedbackTripId, setSelectedFeedbackTripId] = useState('');

  // Tuyến xe
  const [routes, setRoutes] = useState<BusRoute[]>([]);

  // =========================================================
  // 2. HÀM ĐỔI MÀU CHO GHẾ HÀNH KHÁCH
  // =========================================================
  const getSeatStyles = (seat: SeatInfo, isSelected: boolean) => {
    if (isSelected || seat.status === 'LOCKED') {
      return {
        border: '1px solid #f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.25)',
        color: '#fdba74',
        boxShadow: '0 0 16px rgba(249, 115, 22, 0.4)',
        cursor: 'pointer'
      };
    }
    
    if (seat.status === 'AVAILABLE' || seat.isAvailable) {
      return {
        border: '1px solid #10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        color: '#34d399',
        boxShadow: 'none',
        cursor: 'pointer'
      };
    }

    return {
      border: '1px solid rgba(255, 255, 255, 0.2)',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      color: 'rgba(255, 255, 255, 0.3)',
      boxShadow: 'none',
      cursor: 'not-allowed'
    };
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Nạp chuyến xe từ cơ sở dữ liệu (chỉ lấy chuyến xuất phát trong tương lai)
  const fetchTrips = useCallback(async () => {
    try {
      const dashRes = await apiFetch(getApiUrl('/api/v1/trips?bookable=true'));
      const dashJson = await dashRes.json();
      const rawOccupancy: TripOccupancy[] = Array.isArray(dashJson?.data)
        ? dashJson.data
        : Array.isArray(dashJson?.tripOccupancy)
        ? dashJson.tripOccupancy
        : Array.isArray(dashJson?.data?.tripOccupancy)
        ? dashJson.data.tripOccupancy
        : [];

      const now = Date.now();
      const tripList: TripItem[] = rawOccupancy
        .map(t => ({
          id: String(t.id),
          code: t.routeCode || '',
          routeName: t.routeName || '',
          plateNumber: t.busPlate || '',
          departureTime: t.departureTime || '',
          basePrice: Number(t.basePrice),
        }))
        .filter(t => new Date(t.departureTime).getTime() > now);

      setTrips(tripList);
      if (tripList.length > 0) {
        setSelectedTripId(
          requestedTripId && tripList.some((trip: TripItem) => trip.id === requestedTripId)
            ? requestedTripId
            : tripList[0].id
        );
      } else {
        setSelectedTripId('');
      }
    } catch (e) {
      console.error(e);
      setTrips([]);
      setSelectedTripId('');
    }
  }, [requestedTripId]);

  // Xóa trắng ghế đang chọn nếu hành khách đổi chuyến xe
  useEffect(() => {
    setSelectedSeat('');
  }, [selectedTripId]);

  // =========================================================
  // 3. Nạp sơ đồ ghế & Thời gian thực (Polling mỗi 3 giây)
  // =========================================================
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

    fetchSeats(); // Gọi lần đầu tiên

    const intervalId = setInterval(() => {
      fetchSeats(); // Gọi tự động mỗi 3 giây
    }, 3000);

    return () => clearInterval(intervalId);
  }, [selectedTripId]);

  // Nạp phản ánh & lộ trình
  const fetchOtherData = useCallback(async () => {
    try {
      const [fbRes, rRes, completedTripsRes] = await Promise.all([
        apiFetch(getApiUrl('/api/v1/operations/feedbacks')),
        apiFetch(getApiUrl('/api/v1/routes')),
        apiFetch(getApiUrl('/api/v1/ticketing/completed-trips')),
      ]);
      const fbJson = await fbRes.json();
      const rJson = await rRes.json();
      const completedTripsJson = await completedTripsRes.json();
      if (!fbRes.ok || !rRes.ok || !completedTripsRes.ok) {
        throw new Error(
          completedTripsJson?.message || 'Không thể tải dữ liệu đánh giá chuyến đi.',
        );
      }
      setFeedbacks(Array.isArray(fbJson?.data) ? fbJson.data : Array.isArray(fbJson) ? fbJson : []);
      const eligibleTrips: CompletedTrip[] = Array.isArray(completedTripsJson?.data)
        ? completedTripsJson.data
        : [];
      setCompletedTrips(eligibleTrips);
      setSelectedFeedbackTripId(current =>
        eligibleTrips.some(trip => trip.tripId === current)
          ? current
          : eligibleTrips[0]?.tripId ?? '',
      );

      const rawList: ApiRoute[] = Array.isArray(rJson?.data) ? rJson.data : Array.isArray(rJson) ? rJson : [];
      const mapped: BusRoute[] = rawList.map(r => ({
        id: String(r.id),
        code: r.code,
        name: r.name,
        status: r.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        stations: (Array.isArray(r.stops) ? r.stops : Array.isArray(r.routeStops) ? r.routeStops : []).map(rs => ({
          id: String(rs.stop?.id || rs.stopId || rs.id || `st-${rs.stopOrder ?? 0}`),
          name: rs.stop?.name || rs.name || 'Trạm đón trả',
          address: rs.stop?.address || rs.address || '',
          order: rs.stopOrder ?? 0,
        })),
      }));
      setRoutes(mapped);
    } catch (e) {
      console.error(e);
      setFeedbacks([]);
      setRoutes([]);
      setCompletedTrips([]);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
    fetchOtherData();
  }, [fetchTrips, fetchOtherData]);

  // Cổng VNPay/MoMo redirect về đây kèm ?paymentOrder= → chuyển sang màn hình kết quả giao dịch.
  const paymentOrderId = searchParams.get('paymentOrder');
  useEffect(() => {
    if (paymentOrderId) {
      navigate(`/payment/result?orderId=${encodeURIComponent(paymentOrderId)}`, { replace: true });
    }
  }, [paymentOrderId, navigate]);

  // Màn hình kết quả giao dịch truyền viewOrderId (nút "Xem vé") hoặc openTab (nút "Đánh giá chuyến đi").
  const navState = location.state as { viewOrderId?: string; openTab?: 'feedback' } | null;
  const viewOrderId = navState?.viewOrderId;
  useEffect(() => {
    if (navState?.openTab === 'feedback') {
      setActiveTab('feedback');
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
  }, [navState?.openTab, navigate, location.pathname, location.search]);

  useEffect(() => {
    if (!viewOrderId) return;
    navigate(location.pathname + location.search, { replace: true, state: null });
    const loadTicket = async () => {
      try {
        const response = await apiFetch(getApiUrl(`/api/v1/ticketing/payments/${encodeURIComponent(viewOrderId)}`));
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Không thể tải vé.');
        const data = result.data;
        setBookingResult({
          ...data,
          payment: { orderId: data.orderId, amount: data.amount, method: data.paymentMethod, status: data.paymentStatus },
        });
      } catch (error) {
        setBookingMsg(getErrorMessage(error, 'Không thể tải vé.'));
      }
    };
    void loadTicket();
  }, [viewOrderId, navigate, location.pathname, location.search]);

  const handleBook = async () => {
    const trip = trips.find((t) => t.id === selectedTripId);
    if (!selectedSeat || !trip) {
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
          paymentMethod: 'QR',
          voucherCode: voucherCode.trim() || undefined,
          customerEmail: user?.email || 'khachhang@gmail.com',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Đặt vé thất bại trong cơ sở dữ liệu!');
      }

      setBookingResult(json.data || json);
      if (json.paymentUrl || json.data?.paymentUrl) {
        window.location.assign(json.paymentUrl || json.data.paymentUrl);
        return;
      }
      setBookingMsg('Đã lưu giao dịch và tạo mã QR. Thanh toán chưa được xác nhận.');

      // Tải lại dữ liệu ghế ngay lập tức
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
      setIsBooking(false);
    }
  };

  const handleCancelTicket = async () => {
    const ticketId = bookingResult?.ticket?.id || bookingResult?.ticketId;
    if (!ticketId) return;
    try {
      const response = await apiFetch(getApiUrl(`/api/v1/ticketing/tickets/${ticketId}/cancel`), {
        method: 'POST',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Không thể hủy vé.');
      setBookingMsg(result.message);
      setBookingResult(current =>
        current
          ? {
              ...current,
              ticket: { ...current.ticket, status: 'CANCELLED' },
              paymentStatus:
                current.paymentStatus === 'SUCCESS' ? 'REFUNDED' : current.paymentStatus,
            }
          : current,
      );
    } catch (error) {
      setBookingMsg(error instanceof Error ? error.message : 'Không thể hủy vé.');
    }
  };

  const handleDemoTripComplete = async () => {
    const ticketId = bookingResult?.ticket?.id || bookingResult?.ticketId;
    if (!ticketId) {
      setBookingMsg('Không tìm thấy mã vé để hoàn tất chuyến demo.');
      return;
    }

    setIsBooking(true);
    setBookingMsg(null);
    try {
      const response = await apiFetch(
        getApiUrl(`/api/v1/ticketing/bookings/${ticketId}/demo-complete`),
        { method: 'POST' },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || 'Không thể hoàn tất chuyến demo.');
      }

      // order_id của giao dịch trùng tickets.id nên ticketId dùng được khi phản hồi đặt vé thiếu orderId.
      const orderId = bookingResult?.payment?.orderId || bookingResult?.orderId || ticketId;
      navigate(`/payment/result?orderId=${encodeURIComponent(orderId)}`);
    } catch (error) {
      setBookingMsg(getErrorMessage(error, 'Không thể hoàn tất chuyến demo.'));
    } finally {
      setIsBooking(false);
    }
  };

  // Gửi đánh giá phản ánh
  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackContent.trim()) {
      alert('Vui lòng nhập nội dung đánh giá!');
      return;
    }

    try {
      const token = localStorage.getItem('smartbus_access_token');
      if (!completedTrips.some(trip => trip.tripId === selectedFeedbackTripId)) {
        throw new Error('Chỉ có thể đánh giá chuyến đã hoàn thành mà bạn có vé hợp lệ.');
      }

      const res = await apiFetch(getApiUrl('/api/v1/operations/feedbacks'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          tripId: selectedFeedbackTripId,
          userId: user?.id,
          ratingStars: Number(ratingStars),
          criteria: 'ThaiDoVaDungGio',
          content: feedbackContent.trim(),
        }),
      });

      if (!res.ok) throw new Error('Gửi đánh giá thất bại!');

      setFeedbackMsg('⭐ Cảm ơn bạn! Đánh giá đã được lưu vào hệ thống.');
      setFeedbackContent('');
      await fetchOtherData();
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Không thể gửi đánh giá.'));
    }
  };

  // Đăng ký ưu đãi HSSV
  const handleRegisterDiscount = async () => {
    setDiscountStatus('APPROVED');
    setDiscountMsg('✅ Đã xác thực hồ sơ Sinh viên ICTU! Bạn được giảm giá vé 50% trên mọi chuyến xe.');
    setTimeout(() => setDiscountMsg(null), 5000);
  };

  const displayName = user?.fullName || 'Hành khách SmartBus';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="admin-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Liquid-Glass */}
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
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '11px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
            }}
          >
            🎓 Ưu đãi HSSV (Giảm 50%)
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
            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Hành khách</span>
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
      <div style={{ padding: '16px 36px 0', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className={`menu-item ${activeTab === 'booking' ? 'active' : ''}`}
            onClick={() => setActiveTab('booking')}
            style={{ width: 'auto', padding: '9px 20px', borderRadius: '9999px' }}
          >
            🎫 Đặt vé & Sơ đồ ghế (US 1, 2, 3, 4)
          </button>
          <button
            className={`menu-item ${activeTab === 'my-tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-tickets')}
            style={{ width: 'auto', padding: '9px 20px', borderRadius: '9999px' }}
          >
            🎟️ Vé Của Tôi & Lịch sử
          </button>
          <button
            className={`menu-item ${activeTab === 'discount' ? 'active' : ''}`}
            onClick={() => setActiveTab('discount')}
            style={{ width: 'auto', padding: '9px 20px', borderRadius: '9999px' }}
          >
            🎓 Ưu đãi HSSV (US 17)
          </button>
          <button
            className={`menu-item ${activeTab === 'routes' ? 'active' : ''}`}
            onClick={() => setActiveTab('routes')}
            style={{ width: 'auto', padding: '9px 20px', borderRadius: '9999px' }}
          >
            🚌 Lộ trình & Giá vé
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('booking')}
            style={{
              padding: '8px 16px',
              fontSize: '12.5px',
              borderRadius: '9999px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ← Đặt vé tiếp / Quay lại
          </button>
          <a
            href="/landing.html"
            style={{
              padding: '8px 16px',
              fontSize: '12.5px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            🏠 Về Trang Chủ
          </a>
        </div>
      </div>

      {/* Main Tab Content */}
      <main className="content" style={{ padding: '24px 36px 48px' }}>
        {/* TAB 1: ĐẶT VÉ TRỰC TUYẾN */}
        {activeTab === 'booking' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="liquid-glass" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '28px', margin: '0 0 6px' }}>Đặt Vé Xe Buýt Trực Tuyến & Giữ Chỗ</h2>
                  <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.6)' }}>
                    Chọn chuyến xe xuất bến, chọn vị trí ngồi và nhận vé điện tử QR lưu trữ trực tiếp trong cơ sở dữ liệu.
                  </p>
                </div>
                {bookingResult && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('my-tickets')}
                    className="primary-button"
                    style={{ padding: '10px 20px', fontSize: '13px', background: '#0284c7' }}
                  >
                    🎫 Xem lại vé đã đặt →
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '8px' }}>
                    Chọn chuyến xe xuất bến:
                  </label>
                  {trips.length === 0 ? (
                    <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '13px', height: '46px', display: 'flex', alignItems: 'center' }}>
                      ⚠️ Hiện không có chuyến xe nào xuất phát trong tương lai để đặt vé.
                    </div>
                  ) : (
                    <select
                      className="filter-select"
                      value={selectedTripId}
                      onChange={(e) => setSelectedTripId(e.target.value)}
                      style={{ width: '100%', borderRadius: '12px', height: '46px' }}
                    >
                      {trips.map((t) => (
                        <option key={t.id} value={t.id}>
                          [{t.code}] {t.routeName} - Xe {t.plateNumber} ({new Date(t.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(t.departureTime).toLocaleDateString('vi-VN')})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '8px' }}>
                    Mã khuyến mãi Voucher (Gợi ý: BUYT5K, ICTU2026):
                  </label>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Nhập mã voucher giảm giá..."
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    style={{ width: '100%', borderRadius: '12px', height: '46px' }}
                  />
                </div>
                <div style={{ alignSelf: 'end', padding: '12px 16px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.08)', color: '#bae6fd', fontSize: '13px' }}>
                  Thanh toán QR tạm thời — mã chứa thông tin chuyến và số tiền, chưa xác nhận giao dịch.
                </div>
              </div>

              {/* Sơ đồ ghế */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.85)' }}>
                    Sơ đồ vị trí ghế ngồi:
                  </span>
                  {/* 4. CẬP NHẬT CHÚ THÍCH */}
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
                    // 5. GỌI HÀM LẤY MÀU SẮC
                    const seatStyle = getSeatStyles(s, isSelected);

                    return (
                      <button
                        key={s.id}
                        disabled={s.status !== 'AVAILABLE' && !s.isAvailable && !isSelected}
                        onClick={() => {
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
                          ...seatStyle // Áp dụng màu Xanh/Cam/Xám
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
                  onClick={handleBook}
                  disabled={!selectedSeat}
                  className="primary-button"
                  style={{
                    padding: '12px 28px',
                    fontSize: '14px',
                    cursor: !selectedSeat ? 'not-allowed' : 'pointer',
                    opacity: !selectedSeat ? 0.5 : 1,
                  }}
                >
                  {`Tiếp tục thanh toán ghế ${selectedSeat || ''} →`}
                </button>
                {bookingMsg && (
                  <span style={{ color: '#34d399', fontSize: '14px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span className="pulse-dot" /> {bookingMsg}
                  </span>
                )}
              </div>

              {/* Vé điện tử vừa đặt */}
              {bookingResult && (() => {
                const tCode = bookingResult.ticket?.ticketCode || bookingResult.ticketCode || '';
                const sNumber = bookingResult.ticket?.seatNumber || bookingResult.seatNumber || selectedSeat || '';
                const payAmount = Number(bookingResult.payment?.amount ?? bookingResult.ticket?.fareAmount ?? bookingResult.fareAmount ?? 0);
                const expRaw = bookingResult.ticket?.reservationExpiresAt || bookingResult.expiresAt;
                const expTime = (expRaw && !isNaN(new Date(expRaw).getTime()))
                  ? new Date(expRaw).toLocaleTimeString('vi-VN')
                  : null;
                const ticketStatus = bookingResult.ticket?.status || bookingResult.status;
                const paymentStatus = bookingResult.paymentStatus || bookingResult.payment?.status;
                const paymentMethod = bookingResult.paymentMethod || bookingResult.payment?.method;
                const isPaid = ticketStatus === 'BOOKED' || paymentStatus === 'SUCCESS';
                const selectedTrip = trips.find(trip => trip.id === String(bookingResult.ticket?.tripId || selectedTripId));
                const paymentQrValue = paymentMethod === 'QR' && tCode && selectedTrip
                  ? buildPaymentQrPayload({
                      orderId: bookingResult.payment?.orderId || bookingResult.orderId || bookingResult.ticket?.id || '',
                      ticketCode: tCode,
                      tripId: String(bookingResult.ticket?.tripId || selectedTrip.id),
                      routeCode: selectedTrip.code,
                      routeName: selectedTrip.routeName,
                      departureTime: selectedTrip.departureTime,
                      seatNumber: sNumber,
                      amount: payAmount,
                      expiresAt: expRaw || null,
                    })
                  : '';
                const ticketQrValue = tCode
                  ? bookingResult.qrCode || `SMARTBUS-QR-${tCode}`
                  : '';

                return (
                  <div
                    className="liquid-glass-strong"
                    style={{
                      marginTop: '28px',
                      padding: '24px',
                      borderRadius: '18px',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      boxShadow: '0 0 30px rgba(56, 189, 248, 0.2)',
                    }}
                  >
                    <h3 style={{ color: '#38bdf8', fontSize: '22px', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🎟️ Vé Điện Tử SmartBus Của Bạn (Lưu trong cơ sở dữ liệu)
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '28px', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '14px', lineHeight: 2, color: 'rgba(255, 255, 255, 0.9)' }}>
                        <p style={{ margin: 0 }}><strong>Mã vé:</strong> <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '15px' }}>{tCode}</span></p>
                        <p style={{ margin: 0 }}><strong>Số ghế:</strong> <span style={{ color: '#34d399', fontWeight: 600 }}>{sNumber}</span></p>
                        <p style={{ margin: 0 }}><strong>Số tiền:</strong> {Number(payAmount).toLocaleString('vi-VN')} VNĐ</p>
                        <p style={{ margin: 0 }}><strong>Trạng thái thanh toán:</strong> {paymentStatus || (isPaid ? 'SUCCESS' : 'PENDING')}</p>
                        {expRaw && !isPaid && (
                          <div style={{ margin: '4px 0' }}>
                            <strong>Giữ chỗ đến:</strong> {expTime} ({<ReservationCountdown expiresAt={expRaw} onExpired={() => {
                              alert('⚠️ Thời gian giữ chỗ 10 phút đã hết hạn. Ghế đã được tự động giải phóng về trạng thái trống.');
                              setBookingResult(null);
                            }} />})
                          </div>
                        )}
                        <div style={{ marginTop: '10px', fontSize: '12.5px', color: isPaid ? '#34d399' : '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{isPaid ? '✓' : '…'}</span> {isPaid ? 'Vé đã được xác nhận' : 'Mã QR chỉ lưu thông tin giao dịch; chưa ghi nhận đã thanh toán'}
                        </div>
                      </div>

                      {!isPaid && paymentQrValue && <div
                        style={{
                          padding: '16px 20px',
                          background: '#ffffff',
                          color: '#0f172a',
                          borderRadius: '16px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '12px', marginBottom: '8px', fontWeight: 700 }}>
                          QR THÔNG TIN GIAO DỊCH (CHƯA PHẢI QR CHUYỂN KHOẢN)
                        </div>
                        <PaymentQrCode value={paymentQrValue} size={220} alt="QR thông tin giao dịch SmartBus" showDownload={true} downloadFileName={`smartbus-booking-${tCode}.png`} />
                        <div style={{ maxWidth: '240px', marginTop: '8px', fontSize: '11px', lineHeight: 1.4 }}>
                          Quét mã để xem mã vé, chuyến xe, ghế và số tiền. Mã này không chuyển tiền và không tự xác nhận thanh toán.
                        </div>
                      </div>}
                      {!isPaid && paymentMethod === 'QR' && (
                        <div style={{ flexBasis: '100%' }}>
                          <button
                            type="button"
                            className="primary-button"
                            onClick={handleDemoTripComplete}
                            disabled={isBooking}
                          >
                            {isBooking ? 'Đang cập nhật dữ liệu...' : 'Hoàn thành chuyến đi (demo) → Xem kết quả giao dịch'}
                          </button>
                          <p style={{ color: '#fbbf24', fontSize: '12px', margin: '8px 0 0' }}>
                            Thao tác demo cập nhật thanh toán/vé/chuyến lên dữ liệu chung nhưng không chuyển tiền thật.
                          </p>
                        </div>
                      )}
                      {isPaid && <div
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
                          MÃ QR ĐƯA CHO TÀI XẾ SOÁT VÉ
                        </div>
                        <div style={{ background: '#ffffff', padding: '10px', borderRadius: '12px', display: 'inline-block', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)' }}>
                          <PaymentQrCode value={ticketQrValue} size={140} alt="Mã QR vé xe buýt" showDownload={true} downloadFileName={`smartbus-ticket-${tCode}.png`} />
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
                          {ticketQrValue}
                        </div>
                      </div>}
                      <div style={{ flexBasis: '100%', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                        <div style={{ fontSize: '13px', color: '#34d399', background: 'rgba(52, 211, 153, 0.1)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                          ✓ Đã tự động gửi hóa đơn điện tử và ảnh QR vé qua email tới: <strong>{user?.email || 'khachhang@gmail.com'}</strong>
                        </div>
                        {ticketStatus && ['BOOKED', 'RESERVED'].includes(ticketStatus) && (
                          <button type="button" onClick={handleCancelTicket} className="primary-button" style={{ background: '#b91c1c' }}>
                            Hủy vé / yêu cầu hoàn tiền
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'booking' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* ... booking content ... */}
          </div>
        )}

        {/* TAB: VÉ CỦA TÔI & LỊCH SỬ ĐẶT VÉ */}
        {activeTab === 'my-tickets' && (
          <div className="liquid-glass" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '28px', margin: '0 0 6px' }}>Vé Của Tôi & Lịch Sử Đặt Vé</h2>
                <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Quản lý tất cả vé điện tử đã đặt và mã QR soát vé trong cơ sở dữ liệu.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => { fetchMyTickets(); setActiveTab('booking'); }}
                  className="primary-button"
                  style={{ padding: '10px 20px', fontSize: '13px' }}
                >
                  ← Đặt vé chuyến mới
                </button>
                <a
                  href="/landing.html"
                  style={{
                    padding: '10px 20px',
                    fontSize: '13px',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: '#ffffff',
                    textDecoration: 'none',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  🏠 Về Trang Chủ
                </a>
              </div>
            </div>

            {myTickets.length === 0 && !bookingResult ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '42px', marginBottom: '16px' }}>🎟️</div>
                <h3 style={{ fontSize: '20px', color: '#ffffff', margin: '0 0 8px' }}>Bạn chưa có lịch sử vé nào trong hệ thống</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '24px' }}>
                  Hãy chọn chuyến xe và tiến hành đặt vé trực tuyến ngay để nhận mã QR và vé điện tử.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('booking')}
                  className="primary-button"
                  style={{ padding: '12px 28px' }}
                >
                  Đến trang đặt vé ngay →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {myTickets.map((t) => {
                  const isPaid = t.ticket_status === 'BOOKED' || t.payment_status === 'SUCCESS';
                  const qrVal = `SMARTBUS-QR-${t.ticket_code}`;
                  return (
                    <div
                      key={t.ticket_id}
                      className="liquid-glass-strong"
                      style={{
                        padding: '24px',
                        borderRadius: '18px',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        boxShadow: '0 0 30px rgba(56, 189, 248, 0.2)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <h3 style={{ color: '#38bdf8', fontSize: '20px', margin: 0 }}>
                          [{t.route_code}] {t.route_name}
                        </h3>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: isPaid ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                          color: isPaid ? '#34d399' : '#fbbf24',
                          border: `1px solid ${isPaid ? 'rgba(52, 211, 153, 0.4)' : 'rgba(251, 191, 36, 0.4)'}`,
                        }}>
                          {t.ticket_status} ({t.payment_status || 'PENDING'})
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '28px', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: '14px', lineHeight: 2, color: 'rgba(255, 255, 255, 0.9)' }}>
                          <p style={{ margin: 0 }}><strong>Mã vé:</strong> <span style={{ color: '#38bdf8', fontWeight: 700 }}>{t.ticket_code}</span></p>
                          <p style={{ margin: 0 }}><strong>Số ghế:</strong> <span style={{ color: '#34d399', fontWeight: 600 }}>{t.seat_number}</span></p>
                          <p style={{ margin: 0 }}><strong>Biển số xe:</strong> {t.bus_plate || 'Xe buýt tuyến'}</p>
                          <p style={{ margin: 0 }}><strong>Khởi hành:</strong> {new Date(t.departure_time).toLocaleString('vi-VN')}</p>
                          <p style={{ margin: 0 }}><strong>Số tiền:</strong> {Number(t.fare_amount || t.payment_amount || 0).toLocaleString('vi-VN')} VNĐ</p>
                        </div>

                        <div style={{ background: '#ffffff', padding: '12px', borderRadius: '14px', display: 'inline-block', textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                          <PaymentQrCode value={qrVal} size={140} alt="Mã QR vé xe buýt" showDownload={true} downloadFileName={`smartbus-ticket-${t.ticket_code}.png`} />
                          <div style={{ fontSize: '11px', color: '#0f172a', fontWeight: 600, marginTop: '6px', fontFamily: 'monospace' }}>{t.ticket_code}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ƯU ĐÃI HSSV */}
        {activeTab === 'discount' && (
          <div className="liquid-glass" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '28px', margin: '0 0 6px' }}>Hồ Sơ Vé Ưu Đãi Học Sinh - Sinh Viên (US 17)</h2>
            <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '24px' }}>
              Chính sách trợ giá vé xe buýt của thành phố dành riêng cho HSSV các trường Đại học & Cao đẳng.
            </p>

            {discountMsg && (
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
                {discountMsg}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
              <div className="liquid-glass" style={{ padding: '24px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase' }}>Trạng thái hồ sơ</span>
                <div style={{ fontSize: '22px', fontWeight: 600, color: '#34d399', marginTop: '6px' }}>
                  {discountStatus === 'APPROVED' ? '✓ Đã Phê Duyệt' : 'Chờ xác nhận'}
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>
                  Được áp dụng mức giá vé trợ giá 100.000đ/tháng hoặc giảm 50% vé lượt.
                </p>
              </div>

              <div className="liquid-glass" style={{ padding: '24px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase' }}>Cơ sở đào tạo</span>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#ffffff', marginTop: '6px' }}>
                  Đại học CNTT & Truyền Thông (ICTU)
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>
                  Đã liên thông thẻ sinh viên điện tử vào hệ thống SmartBus.
                </p>
              </div>
            </div>

            <button
              onClick={handleRegisterDiscount}
              className="primary-button"
              style={{ padding: '11px 24px', borderRadius: '9999px' }}
            >
              🔄 Xác nhận / Gia hạn hồ sơ HSSV (Lưu cơ sở dữ liệu)
            </button>
          </div>
        )}

        {/* TAB 3: ĐÁNH GIÁ CHUYẾN ĐI */}
        {activeTab === 'feedback' && (
          <div className="liquid-glass" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '28px', margin: '0 0 6px' }}>Đánh Giá & Phản Ánh Chất Lượng Chuyến Đi (US 24)</h2>
            <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '24px' }}>
              Ý kiến của bạn giúp nâng cao chất lượng phục vụ của đội ngũ tài xế và nhân viên nhà xe.
            </p>

            {feedbackMsg && (
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
                {feedbackMsg}
              </div>
            )}

            {completedTrips.length === 0 && (
              <div
                role="status"
                style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: 'rgba(251, 191, 36, 0.1)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  color: '#fbbf24',
                  marginBottom: '24px',
                }}
              >
                Bạn chỉ có thể đánh giá sau khi chuyến đã đến điểm cuối và vé của bạn được xác nhận. Nút thanh toán demo không xác nhận giao dịch thật.
              </div>
            )}

            {completedTrips.length > 0 && (
            <form onSubmit={handleSendFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px', marginBottom: '28px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '8px' }}>
                  Chuyến đã hoàn thành:
                </label>
                <select
                  className="filter-select"
                  required
                  value={selectedFeedbackTripId}
                  onChange={event => setSelectedFeedbackTripId(event.target.value)}
                  style={{ width: '100%', borderRadius: '12px', height: '44px' }}
                >
                  {completedTrips.map(trip => (
                    <option key={trip.tripId} value={trip.tripId}>
                      [{trip.routeCode}] {trip.routeName} — {new Date(trip.arrivalTime).toLocaleString('vi-VN')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '8px' }}>
                  Đánh giá số sao:
                </label>
                <select
                  className="filter-select"
                  value={ratingStars}
                  onChange={(e) => setRatingStars(Number(e.target.value))}
                  style={{ width: '100%', borderRadius: '12px', height: '44px' }}
                >
                  <option value="5">⭐⭐⭐⭐⭐ 5 Sao (Rất hài lòng)</option>
                  <option value="4">⭐⭐⭐⭐ 4 Sao (Hài lòng)</option>
                  <option value="3">⭐⭐⭐ 3 Sao (Bình thường)</option>
                  <option value="2">⭐⭐ 2 Sao (Chưa tốt)</option>
                  <option value="1">⭐ 1 Sao (Rất thất vọng)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '8px' }}>
                  Nội dung nhận xét:
                </label>
                <textarea
                  rows={3}
                  className="search-input"
                  placeholder="Chia sẻ trải nghiệm của bạn về chuyến xe, thái độ phục vụ..."
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  style={{ width: '100%', borderRadius: '16px', padding: '12px 16px', height: 'auto' }}
                />
              </div>

              <button
                type="submit"
                className="primary-button"
                style={{ alignSelf: 'flex-start', padding: '11px 26px' }}
              >
                Gửi phản ánh (Lưu cơ sở dữ liệu) →
              </button>
            </form>
            )}

            <h3 style={{ fontSize: '18px', margin: '0 0 14px' }}>Các đánh giá gần đây:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(Array.isArray(feedbacks) ? feedbacks : []).map((fb) => (
                <div
                  key={fb.id}
                  className="liquid-glass"
                  style={{ padding: '16px 20px', borderRadius: '16px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#ffffff' }}>{fb.user?.fullName || 'Hành khách'}</span>
                    <span style={{ color: '#fbbf24', fontSize: '16px' }}>{'★'.repeat(fb.ratingStars)}</span>
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.75)', marginTop: '6px', fontSize: '13.5px' }}>
                    {fb.content}
                  </div>
                  {fb.responseFromStaff && (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '8px 14px',
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: '8px',
                        color: '#38bdf8',
                        fontSize: '12.5px',
                      }}
                    >
                      <strong>Nhà xe phản hồi:</strong> {fb.responseFromStaff}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: LỘ TRÌNH & GIÁ VÉ */}
        {activeTab === 'routes' && (
          <div className="liquid-glass" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '28px', margin: '0 0 6px' }}>Lộ Trình Tuyến & Giá Vé Niêm Yết</h2>
            <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '20px' }}>
              Tra cứu tuyến xe buýt và các trạm dừng đón trả khách gần bạn nhất.
            </p>

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
          </div>
        )}
      </main>
    </div>
  );
};

export default PassengerPortalPage;