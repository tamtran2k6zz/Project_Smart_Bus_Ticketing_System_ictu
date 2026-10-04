import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTicketDetail } from '../../services/ticketDetails';
import type { TicketDetail } from '../../types/ticket';
import './TicketDetailPage.css';

function formatDateTime(value: string) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'BOOKED':
      return 'Đã xác nhận';

    case 'RESERVED':
      return 'Đang giữ chỗ';

    case 'CANCELLED':
      return 'Đã hủy';

    default:
      return status || 'Không xác định';
  }
}

function TicketDetailPage() {
  const { ticketCode } = useParams<{ ticketCode: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] =
    useState<TicketDetail | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ticketCode) {
      setError('Không tìm thấy mã vé.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadTicket = async () => {
      try {
        setLoading(true);
        setError('');

        const result =
          await getTicketDetail(ticketCode);

        if (!cancelled) {
          setTicket(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Không thể tải chi tiết vé.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTicket();

    return () => {
      cancelled = true;
    };
  }, [ticketCode]);

  if (loading) {
    return (
      <main className="ticket-detail-page">
        <div className="ticket-detail-card">
          <p>Đang tải chi tiết vé...</p>
        </div>
      </main>
    );
  }

  if (error || !ticket) {
    return (
      <main className="ticket-detail-page">
        <div className="ticket-detail-card ticket-detail-error">
          <h2>Không thể tải vé</h2>
          <p>{error || 'Vé không tồn tại.'}</p>

          <button
            type="button"
            className="ticket-back-button"
            onClick={() => navigate(-1)}
          >
            ← Quay lại
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="ticket-detail-page">
      <div className="ticket-detail-container">
        <button
          type="button"
          className="ticket-back-button"
          onClick={() => navigate(-1)}
        >
          ← Quay lại
        </button>

        <section className="ticket-detail-card">
          <div className="ticket-detail-header">
            <div>
              <span className="ticket-detail-eyebrow">
                SMARTBUS E-TICKET
              </span>

              <h1>Chi tiết vé điện tử</h1>

              <p>
                Mã vé:{' '}
                <strong>{ticket.ticket_code}</strong>
              </p>
            </div>

            <span
              className={`ticket-status ticket-status-${ticket.status.toLowerCase()}`}
            >
              {getStatusLabel(ticket.status)}
            </span>
          </div>

          <div className="ticket-detail-content">
            <div className="ticket-info-section">
              <h2>Thông tin chuyến đi</h2>

              <div className="ticket-route-box">
                <div className="ticket-stop">
                  <span>Điểm đi</span>
                  <strong>{ticket.origin_stop || '-'}</strong>
                </div>

                <div className="ticket-route-arrow">
                  →
                </div>

                <div className="ticket-stop">
                  <span>Điểm đến</span>
                  <strong>
                    {ticket.destination_stop || '-'}
                  </strong>
                </div>
              </div>

              <div className="ticket-info-grid">
                <div className="ticket-info-item">
                  <span>Tuyến</span>
                  <strong>
                    {ticket.route_name || '-'}
                  </strong>
                </div>

                <div className="ticket-info-item">
                  <span>Số ghế</span>
                  <strong>{ticket.seat_code || '-'}</strong>
                </div>

                <div className="ticket-info-item">
                  <span>Khởi hành</span>
                  <strong>
                    {formatDateTime(
                      ticket.departure_time,
                    )}
                  </strong>
                </div>

                <div className="ticket-info-item">
                  <span>Dự kiến đến</span>
                  <strong>
                    {formatDateTime(ticket.arrival_time)}
                  </strong>
                </div>

                <div className="ticket-info-item">
                  <span>Xe</span>
                  <strong>
                    {ticket.bus_plate_number || '-'}
                  </strong>
                </div>

                <div className="ticket-info-item">
                  <span>Loại xe</span>
                  <strong>
                    {ticket.bus_type || '-'}
                  </strong>
                </div>
              </div>

              <h2 className="ticket-section-title">
                Thông tin hành khách
              </h2>

              <div className="ticket-info-grid">
                <div className="ticket-info-item">
                  <span>Hành khách</span>
                  <strong>
                    {ticket.passenger_name || '-'}
                  </strong>
                </div>

                <div className="ticket-info-item">
                  <span>Tài xế</span>
                  <strong>
                    {ticket.driver_name || '-'}
                  </strong>
                </div>

                <div className="ticket-info-item">
                  <span>Số điện thoại tài xế</span>
                  <strong>
                    {ticket.driver_phone || '-'}
                  </strong>
                </div>

                <div className="ticket-info-item">
                  <span>Giá vé</span>
                  <strong>
                    {ticket.price.toLocaleString('vi-VN')} đ
                  </strong>
                </div>
              </div>
            </div>

            <aside className="ticket-qr-section">
              <h2>QR vé</h2>

              <div className="ticket-qr-wrapper">
                {ticket.qr_code_base64 ? (
                  <img
                    src={ticket.qr_code_base64}
                    alt={`Mã QR vé ${ticket.ticket_code}`}
                    className="ticket-qr-image"
                  />
                ) : (
                  <div className="ticket-qr-empty">
                    Chưa có mã QR
                  </div>
                )}
              </div>

              <p className="ticket-qr-note">
                Xuất trình mã QR này khi lên xe hoặc
                khi nhân viên kiểm tra vé.
              </p>

              <div className="ticket-code-box">
                {ticket.ticket_code}
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

export default TicketDetailPage;