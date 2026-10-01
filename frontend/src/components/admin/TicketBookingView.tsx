import React, { useState, useEffect } from 'react';
import { getApiUrl, apiFetch } from '../../api/client';

interface SeatInfo {
  id: string;
  seatNumber: string;
  rowPosition: string;
  isPriority: boolean;
  isAvailable: boolean;
}

interface TripItem {
  id: string;
  code: string;
  routeName: string;
  plateNumber: string;
  departureTime: string;
  basePrice: number;
}

export const TicketBookingView: React.FC = () => {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [seats, setSeats] = useState<SeatInfo[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string>('');
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Soát vé QR
  const [verifyCode, setVerifyCode] = useState<string>('');
  const [verifyResult, setVerifyResult] = useState<any>(null);

  // 1. Nạp danh sách chuyến xe từ cơ sở dữ liệu
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const dashRes = await apiFetch(getApiUrl('/api/v1/operations/dashboard/summary'));
        const dashJson = await dashRes.json();
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
          basePrice: 10000,
        }));

        setTrips(tripList);
        if (tripList.length > 0) {
          setSelectedTripId(tripList[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchTrips();
  }, []);

  // 2. Nạp sơ đồ ghế thực tế từ cơ sở dữ liệu cho chuyến đã chọn
  useEffect(() => {
    if (!selectedTripId) return;

    const fetchSeats = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch(getApiUrl(`/api/v1/ticketing/trips/${selectedTripId}/seats`));
        const json = await res.json();
        const rawSeats = Array.isArray(json?.data?.seats)
          ? json.data.seats
          : Array.isArray(json?.seats)
          ? json.seats
          : [];
        setSeats(rawSeats);
        setSelectedSeat('');
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSeats();
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

      // Tải lại sơ đồ ghế
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
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
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
                Ghế trống
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '14px', height: '14px', background: '#38bdf8', borderRadius: '4px', boxShadow: '0 0 10px #38bdf8' }} />
                Đang chọn ({selectedSeat || 'Chưa chọn'})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '14px', height: '14px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '4px' }} />
                Đã đặt
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
              return (
                <button
                  key={s.id}
                  disabled={!s.isAvailable}
                  onClick={() => setSelectedSeat(s.seatNumber)}
                  style={{
                    padding: '14px 6px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: s.isAvailable ? 'pointer' : 'not-allowed',
                    border: isSelected
                      ? '1px solid #38bdf8'
                      : s.isAvailable
                      ? '1px solid rgba(16, 185, 129, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    backgroundColor: isSelected
                      ? 'rgba(56, 189, 248, 0.25)'
                      : s.isAvailable
                      ? 'rgba(16, 185, 129, 0.08)'
                      : 'rgba(255, 255, 255, 0.02)',
                    color: isSelected ? '#ffffff' : s.isAvailable ? '#34d399' : 'rgba(255, 255, 255, 0.25)',
                    boxShadow: isSelected
                      ? '0 0 16px rgba(56, 189, 248, 0.4)'
                      : s.isAvailable
                      ? '0 0 8px rgba(16, 185, 129, 0.15)'
                      : 'none',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.18s ease',
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
          const tCode = bookingResult.ticket?.ticketCode || bookingResult.ticketCode || 'TKT-ICTU-8888';
          const sNumber = bookingResult.ticket?.seatNumber || bookingResult.seatNumber || selectedSeat || 'A01';
          const payAmount = bookingResult.payment?.amount || bookingResult.ticket?.fareAmount || bookingResult.fareAmount || 10000;
          const expRaw = bookingResult.ticket?.reservationExpiresAt || bookingResult.expiresAt;
          const expTime = (expRaw && !isNaN(new Date(expRaw).getTime()))
            ? new Date(expRaw).toLocaleTimeString('vi-VN')
            : new Date(Date.now() + 10 * 60000).toLocaleTimeString('vi-VN');
          const qrVal = bookingResult.qrCode || `SMARTBUS-QR-${tCode}`;
          const qrImg = bookingResult.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrVal)}`;

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
                    <img
                      src={qrImg}
                      alt="Mã QR Soát Vé"
                      style={{
                        width: '140px',
                        height: '140px',
                        display: 'block',
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
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
