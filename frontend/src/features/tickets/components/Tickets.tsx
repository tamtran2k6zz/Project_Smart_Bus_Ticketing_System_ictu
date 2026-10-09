import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { QrCode, Download, MapPin } from 'lucide-react';
import { useSession } from '@/store/session.store';
import { ticketsApi } from '../services/tickets.api';
import { bookingApi } from '@/features/booking/services/booking.api';
import { PriceBreakdown } from '@/features/booking/components/PriceBreakdown';
import { receiptPriceLines } from '@/features/booking/utils/price';
import { operationsApi } from '@/features/operations/services/operations.api';
import { paymentApi } from '@/features/payments/services/payment.api';
import { createPdf, download } from '@/features/reports/services/export';
import {
  Card,
  PageTitle,
  Badge,
  AsyncState,
  LinkButton,
  Button,
  Field,
  Modal,
  ActionMessage,
  Message,
} from '@/components/ui/Ui';
import { money, dateTime } from '@/utils/format';
import { useAction } from '@/hooks/useAction';
import { appConfig } from '@/configs/app.config';
import { useNow } from '@/hooks/useNow';
import { ticketState } from '../utils/status';
export function TicketQr({ token }: { token: string }) {
  const [src, setSrc] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(token, { width: 240, margin: 2, errorCorrectionLevel: 'M' })
      .then(value => {
        if (alive) setSrc(value);
      })
      .catch(() => {
        if (alive) setError('Không tạo được QR. Dùng token nhập mã thủ công.');
      });
    return () => {
      alive = false;
    };
  }, [token]);
  return (
    <div style={{ textAlign: 'center' }}>
      {src ? (
        <img src={src} width={240} height={240} alt="Mã QR vé điện tử" />
      ) : (
        <Message error={!!error}>{error || 'Đang tạo QR…'}</Message>
      )}
    </div>
  );
}
const statusText = {
  valid: 'Vé hợp lệ',
  used: 'Đã lên xe',
  canceled: 'Đã hủy',
  expired: 'Vé đã hết hạn',
};
export function TicketList() {
  const now = useNow();
  const user = useSession(s => s.user)!;
  const query = useQuery({
    queryKey: ['tickets', user.id],
    queryFn: () => ticketsApi.list(user.id),
  });
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: operationsApi.catalog });
  return (
    <>
      <PageTitle
        eyebrow="HÀNH TRÌNH CỦA BẠN"
        title="Vé của tôi"
        description="Vé điện tử, thông tin chuyến và yêu cầu hủy/đổi."
        action={<LinkButton to="/trips">Đặt chuyến mới</LinkButton>}
      />
      <AsyncState
        query={query}
        empty={query.data?.length === 0}
        emptyText="Bạn chưa có vé. Tìm một chuyến để bắt đầu."
      >
        <div className="stack">
          {query.data?.map(ticket => {
            const trip = catalog.data?.trips.find(t => t.id === ticket.tripId),
              route = catalog.data?.routes.find(r => r.id === trip?.routeId);
            return (
              <Card key={ticket.id}>
                <div className="between">
                  <div>
                    <Badge tone={ticketState(ticket, now) === 'valid' ? 'green' : 'neutral'}>
                      {statusText[ticketState(ticket, now)]}
                    </Badge>
                    {ticket.request && (
                      <Badge tone="amber">
                        Đang chờ {ticket.request === 'cancel' ? 'hủy' : 'đổi'}
                      </Badge>
                    )}
                    <h3>{route?.name}</h3>
                    <p className="muted">{trip && dateTime(trip.departure)}</p>
                    <small className="muted">Mã vé: {ticket.id}</small>
                  </div>
                  <LinkButton to={'/account/tickets/' + ticket.id} secondary>
                    <QrCode size={18} />
                    Xem vé
                  </LinkButton>
                </div>
              </Card>
            );
          })}
        </div>
      </AsyncState>
      <BookingHistory />
    </>
  );
}
function BookingHistory() {
  const user = useSession(s => s.user)!;
  const query = useQuery({
    queryKey: ['booking-history', user.id],
    queryFn: () => bookingApi.history(user.id),
  });
  return (
    <div style={{ marginTop: 28 }}>
      <h3>Lịch sử đặt vé & giao dịch</h3>
      <AsyncState query={query} empty={query.data?.length === 0} emptyText="Chưa có giao dịch">
        <Card>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Ngày tạo</th>
                  <th>Số vé</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.map(b => (
                  <tr key={b.id}>
                    <td>{dateTime(b.createdAt)}</td>
                    <td>{b.quantity}</td>
                    <td>{money(b.total)}</td>
                    <td>
                      <Badge
                        tone={
                          b.status === 'paid'
                            ? 'green'
                            : b.status === 'pending'
                              ? 'amber'
                              : 'neutral'
                        }
                      >
                        {
                          {
                            pending: 'Chờ thanh toán',
                            paid: 'Đã thanh toán',
                            failed: 'Thất bại',
                            canceled: 'Đã hủy',
                            expired: 'Hết hạn',
                          }[b.status]
                        }
                      </Badge>
                      <br />
                      <small>
                        {b.refund === 'pending'
                          ? 'Chờ hoàn tiền'
                          : b.refund === 'refunded'
                            ? 'Đã hoàn tiền demo'
                            : ''}
                      </small>
                    </td>
                    <td>
                      <Link to={'/payment/result?bookingId=' + b.id}>Xem giao dịch</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </AsyncState>
    </div>
  );
}
export function TicketDetail() {
  const now = useNow();
  const { ticketId = '' } = useParams(),
    user = useSession(s => s.user)!;
  const query = useQuery({
    queryKey: ['ticket', ticketId, user.id],
    queryFn: () => ticketsApi.detail(ticketId, user.id),
    refetchInterval: 8000,
  });
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: operationsApi.catalog });
  const booking = useQuery({
    queryKey: ['booking', query.data?.bookingId, user.id],
    queryFn: () => bookingApi.booking(query.data!.bookingId, user.id),
    enabled: !!query.data,
  });
  const [modal, setModal] = useState<'cancel' | 'exchange' | ''>(''),
    [target, setTarget] = useState('');
  const action = useAction(async () => {
    await ticketsApi.request(
      ticketId,
      user.id,
      modal as 'cancel' | 'exchange',
      target || undefined
    );
    setModal('');
  }, 'Đã gửi yêu cầu, vui lòng chờ điều hành xử lý.');
  const invoice = useAction(async () => {
    const b = booking.data!;
    await paymentApi.invoice(b.id, user.id);
    if (appConfig.demo) {
      const blob = await createPdf('SmartBus · Biên nhận DEMO', [
        'KHÔNG PHẢI HÓA ĐƠN ĐIỆN TỬ HỢP LỆ',
        'Mã đặt vé: ' + b.id,
        'Khách hàng: ' + b.name,
        'Số vé: ' + b.quantity,
        ...receiptPriceLines(b),
        'Ngày: ' + dateTime(b.createdAt),
      ]);
      download(blob, 'smartbus-demo-receipt.pdf');
    } else {
      const result = await paymentApi.realInvoice(b.id);
      window.open(result.url, '_blank', 'noopener,noreferrer');
    }
  }, 'Đã yêu cầu chứng từ.');
  const ticket = query.data,
    trip = catalog.data?.trips.find(t => t.id === ticket?.tripId),
    route = catalog.data?.routes.find(r => r.id === trip?.routeId),
    b = booking.data;
  const eligible =
    ticket?.status === 'valid' &&
    !ticket.request &&
    trip &&
    Date.parse(trip.departure) > Date.now() + 1800000;
  // Giải thích vì sao không hiện nút hủy/đổi (trường hợp đang chờ xử lý đã có thông báo riêng).
  const requestBlockedReason =
    !ticket || !trip || eligible || ticket.request
      ? ''
      : ticketState(ticket, now) !== 'valid'
        ? `Không thể yêu cầu hủy/đổi: ${statusText[ticketState(ticket, now)].toLowerCase()}.`
        : 'Đã quá hạn gửi yêu cầu hủy/đổi: cần gửi trước giờ khởi hành ít nhất 30 phút.';
  return (
    <>
      <PageTitle
        eyebrow="VÉ ĐIỆN TỬ"
        title={route?.name || 'Chi tiết vé'}
        description="Trình QR hoặc token cho nhân viên khi lên xe."
      />
      <AsyncState query={query}>
        {ticket && (
          <div className="grid">
            <Card>
              <div className="between">
                <Badge tone={ticketState(ticket, now) === 'valid' ? 'green' : 'neutral'}>
                  {statusText[ticketState(ticket, now)]}
                </Badge>
                {appConfig.demo && <Badge>QR Demo</Badge>}
              </div>
              {ticketState(ticket, now) === 'valid' ? (
                <TicketQr token={ticket.token} />
              ) : (
                <Message error>QR không khả dụng: {statusText[ticketState(ticket, now)]}.</Message>
              )}
              {ticketState(ticket, now) === 'valid' && (
                <Field label="Token vé — dùng nhập mã thủ công">
                  <input value={ticket.token} readOnly onFocus={e => e.target.select()} />
                </Field>
              )}
              <p className="muted" style={{ textAlign: 'center' }}>
                Hết hạn: {dateTime(ticket.expiresAt)}
              </p>
            </Card>
            <Card>
              <h3>Thông tin hành trình</h3>
              <p className="row">
                <MapPin size={17} />
                {catalog.data?.stops.find(s => s.id === b?.boardingStopId)?.name ||
                  route?.origin} →{' '}
                {catalog.data?.stops.find(s => s.id === b?.alightingStopId)?.name ||
                  route?.destination}
              </p>
              <p>{trip && dateTime(trip.departure)}</p>
              <AsyncState query={booking}>
                {b && (
                  <>
                    <hr className="divider" />
                    <p>
                      <strong>{b.name}</strong> · {b.phone}
                    </p>
                    <p className="muted">
                      {b.quantity} vé ·{' '}
                      {b.seatIds.length ? 'Ghế ' + b.seatIds.join(', ') : 'Không gắn ghế'}
                    </p>
                    <PriceBreakdown booking={b} totalLabel="Tổng thanh toán" />
                    <p className="muted">
                      Hoàn tiền:{' '}
                      {b.refund === 'none'
                        ? 'Chưa có yêu cầu'
                        : b.refund === 'pending'
                          ? 'Đang chờ xử lý'
                          : 'Đã hoàn tiền demo'}
                    </p>
                  </>
                )}
              </AsyncState>
              <ActionMessage action={action} />
              <ActionMessage action={invoice} />
              {ticket.request && (
                <Message>
                  Đang chờ điều hành xử lý yêu cầu {ticket.request === 'cancel' ? 'hủy' : 'đổi'}.
                </Message>
              )}
              <div className="stack">
                <LinkButton secondary to={'/tracking/' + ticket.tripId}>
                  Theo dõi chuyến
                </LinkButton>
                {b?.status === 'paid' && (
                  <Button
                    variant="secondary"
                    disabled={invoice.isPending}
                    onClick={() => invoice.mutate(undefined)}
                  >
                    <Download size={16} />
                    Yêu cầu & tải chứng từ{appConfig.demo ? ' demo' : ''}
                  </Button>
                )}
                {eligible && (
                  <div className="row">
                    <Button variant="secondary" onClick={() => setModal('exchange')}>
                      Yêu cầu đổi chuyến
                    </Button>
                    <Button variant="danger" onClick={() => setModal('cancel')}>
                      Yêu cầu hủy vé
                    </Button>
                  </div>
                )}
                {requestBlockedReason && <p className="muted">{requestBlockedReason}</p>}
              </div>
            </Card>
          </div>
        )}
      </AsyncState>
      <Modal
        open={!!modal}
        onClose={() => setModal('')}
        title={modal === 'cancel' ? 'Yêu cầu hủy vé' : 'Yêu cầu đổi chuyến'}
      >
        <p className="muted">
          Chính sách demo: gửi trước khởi hành 30 phút. Hủy được duyệt sẽ trả chỗ về chuyến và tạo
          khoản hoàn chờ xử lý. Đổi được duyệt giữ nguyên giá, chọn chỗ trống trên chuyến cùng tuyến
          và loại vé.
        </p>
        {modal === 'cancel' && b && (
          <div className="stack" style={{ gap: 8, margin: '16px 0' }}>
            <PriceBreakdown booking={b} totalLabel="Số tiền đã thanh toán" />
            <hr className="divider" />
            <div className="between">
              <span className="muted">Phí hủy</span>
              <span>Điều hành xác nhận khi duyệt</span>
            </div>
            <div className="between">
              <strong>Số tiền hoàn dự kiến</strong>
              <span>{money(b.total)} − phí hủy</span>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              Số tiền hoàn chính xác sẽ được thông báo khi yêu cầu hủy được duyệt.
            </p>
          </div>
        )}
        {modal === 'exchange' && (
          <Field label="Chuyến muốn đổi">
            <select value={target} onChange={e => setTarget(e.target.value)}>
              <option value="">Chọn chuyến</option>
              {catalog.data?.trips
                .filter(
                  t =>
                    t.id !== trip?.id &&
                    t.routeId === trip?.routeId &&
                    t.seatMode === trip?.seatMode &&
                    Date.parse(t.departure) > Date.now() &&
                    t.available >= (b?.quantity || 1)
                )
                .map(t => (
                  <option value={t.id} key={t.id}>
                    {dateTime(t.departure)} · {t.available} chỗ
                  </option>
                ))}
            </select>
          </Field>
        )}
        <ActionMessage action={action} />
        <div className="row" style={{ marginTop: 20 }}>
          <Button
            disabled={action.isPending || (modal === 'exchange' && !target)}
            onClick={() => action.mutate(undefined)}
          >
            Gửi yêu cầu
          </Button>
          <Button variant="secondary" onClick={() => setModal('')}>
            Đóng
          </Button>
        </div>
      </Modal>
    </>
  );
}
