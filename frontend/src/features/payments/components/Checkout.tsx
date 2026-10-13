import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, ShieldCheck } from 'lucide-react';
import { useSession } from '@/store/session.store';
import { useAction } from '@/hooks/useAction';
import { bookingApi } from '@/features/booking/services/booking.api';
import { paymentApi } from '../services/payment.api';
import { HoldTimer } from '@/features/booking/components/BookingFlow';
import { JourneySummary } from '@/features/booking/components/JourneySummary';
import { PriceBreakdown } from '@/features/booking/components/PriceBreakdown';
import {
  Card,
  Button,
  Message,
  ActionMessage,
  AsyncState,
  Badge,
  PageTitle,
  LinkButton,
} from '@/components/ui/Ui';
import { money } from '@/utils/format';
import { appConfig } from '@/configs/app.config';
import type { Gateway, Payment } from '../types';
export function Checkout() {
  const { bookingId = '' } = useParams(),
    navigate = useNavigate(),
    user = useSession(s => s.user)!;
  const [gateway, setGateway] = useState<Gateway>('MoMo'),
    [expired, setExpired] = useState(false);
  const query = useQuery({
    queryKey: ['booking', bookingId, user.id],
    queryFn: () => bookingApi.booking(bookingId, user.id),
    refetchInterval: 4000,
  });
  const payment = useQuery({
    queryKey: ['payment', bookingId, user.id],
    queryFn: () => paymentApi.latest(bookingId, user.id),
    refetchInterval: 4000,
  });
  const savedGateway = payment.data?.gateway;
  useEffect(() => {
    if (savedGateway) setGateway(savedGateway);
  }, [payment.data?.id, savedGateway]);
  const hold = useQuery({
    queryKey: ['hold', query.data?.holdId, user.id],
    queryFn: () => bookingApi.hold(query.data!.holdId, user.id),
    enabled: !!query.data,
  });
  const start = useAction(
    async () => {
      const p = await paymentApi.start(bookingId, user.id, gateway);
      if (p.status !== 'pending') {
        navigate('/payment/result?bookingId=' + bookingId);
        return;
      }
      if (!appConfig.demo && !p.redirectUrl)
        throw new Error('Chưa có liên kết thanh toán. Hãy thử lại hoặc chọn phương thức khác.');
      if (p.redirectUrl && !appConfig.demo) {
        const url = new URL(p.redirectUrl);
        if (
          url.protocol !== 'https:' &&
          !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
        )
          throw new Error('URL cổng thanh toán không an toàn.');
        window.location.assign(url.href);
      }
    },
    appConfig.demo
      ? 'Giao dịch demo đang chờ xác nhận. Chọn kết quả mô phỏng bên dưới.'
      : 'Đã khởi tạo thanh toán. Vui lòng hoàn tất tại cổng thanh toán.'
  );
  const confirm = useAction(async (status: Payment['status']) => {
    if (!payment.data) throw new Error('Khởi tạo giao dịch trước.');
    await paymentApi.confirmDemo(payment.data.id, user.id, status);
    navigate('/payment/result?bookingId=' + bookingId);
  });
  const b = query.data,
    canPay =
      b && ['pending', 'failed'].includes(b.status) && !expired && hold.data?.status === 'active',
    busy = start.isPending || confirm.isPending || payment.isPending || payment.isError,
    sameGateway =
      savedGateway === gateway ||
      (!appConfig.demo && savedGateway === 'VNPay' && gateway === 'Card');
  return (
    <>
      <PageTitle
        eyebrow="ĐẶT VÉ · BƯỚC 2 / 2"
        title="Kiểm tra & thanh toán"
        description="QR được phát hành sau khi dịch vụ xác nhận thanh toán."
      />
      <AsyncState query={query}>
        {b && (
          <div className="grid">
            <div className="stack">
              {hold.data && b.status !== 'paid' && (
                <HoldTimer
                  hold={hold.data}
                  receivedAt={hold.dataUpdatedAt}
                  onExpire={() => setExpired(true)}
                />
              )}
              <Card>
                <h3>Chọn phương thức</h3>
                <div className="grid">
                  {(appConfig.demo
                    ? (['MoMo', 'VNPay', 'ZaloPay', 'Card'] as Gateway[])
                    : (['MoMo', 'VNPay', 'ZaloPay', 'Card'] as Gateway[])
                  ).map(value => (
                    <label
                      key={value}
                      className="row"
                      style={{
                        padding: 16,
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        fontSize: 13,
                      }}
                    >
                      <input
                        type="radio"
                        name="gateway"
                        checked={gateway === value}
                        onChange={() => setGateway(value)}
                        disabled={!canPay || busy}
                      />
                      <CreditCard size={19} />
                      {value === 'Card' ? 'Thẻ ngân hàng' : value}
                    </label>
                  ))}
                </div>
                {payment.data?.status === 'pending' && canPay && (
                  <p className="muted">
                    Giao dịch {savedGateway} đang chờ thanh toán. Bạn có thể tiếp tục hoặc chọn
                    phương thức khác trong thời gian giữ chỗ.
                  </p>
                )}
                <ActionMessage action={start} />
                <ActionMessage action={confirm} />
                <Message error>
                  {payment.isError ? 'Không đọc được trạng thái giao dịch. Vui lòng tải lại.' : ''}
                </Message>
                <Message error>
                  {expired || b.status === 'expired'
                    ? 'Giữ chỗ hết hạn. Không thể thanh toán, hãy đặt lại.'
                    : ''}
                </Message>
                {b.status === 'paid' ? (
                  <LinkButton to={'/payment/result?bookingId=' + b.id}>Xem kết quả</LinkButton>
                ) : (
                  <Button disabled={!canPay || busy} onClick={() => start.mutate(undefined)}>
                    {payment.data?.status === 'pending'
                      ? sameGateway
                        ? 'Tiếp tục thanh toán'
                        : 'Đổi phương thức & thanh toán'
                      : 'Khởi tạo ' + (appConfig.demo ? 'giao dịch demo' : 'thanh toán')}
                    {' · '}
                    {money(b.total)}
                  </Button>
                )}
                {appConfig.demo && payment.data?.status === 'pending' && canPay && (
                  <>
                    <hr className="divider" />
                    <Badge tone="amber">BỘ MÔ PHỎNG DEMO · KHÔNG THU TIỀN</Badge>
                    <p className="muted">
                      Kết quả này đi qua dịch vụ demo. Tham số trên URL không thay đổi giao dịch.
                    </p>
                    <div className="row">
                      {(
                        [
                          ['paid', 'Mô phỏng thành công'],
                          ['failed', 'Mô phỏng thất bại'],
                          ['canceled', 'Hủy giao dịch'],
                          ['pending', 'Giữ trạng thái chờ'],
                        ] as const
                      ).map(([status, label]) => (
                        <Button
                          key={status}
                          variant={status === 'paid' ? 'primary' : 'secondary'}
                          disabled={busy}
                          onClick={() => confirm.mutate(status)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            </div>
            <Card>
              <Badge tone="neutral">TÓM TẮT ĐẶT VÉ</Badge>
              <JourneySummary
                tripId={b.tripId}
                boardingStopId={b.boardingStopId}
                alightingStopId={b.alightingStopId}
              />
              <hr className="divider" />
              <h3>{b.name}</h3>
              <p className="muted">
                {b.phone}
                <br />
                {b.quantity} vé ·{' '}
                {b.seatIds.length ? 'Ghế ' + b.seatIds.join(', ') : 'Không gắn ghế'}
              </p>
              <hr className="divider" />
              <PriceBreakdown booking={b} />
              <p className="muted row">
                <ShieldCheck size={17} />
                Không lưu thông tin thẻ tại frontend
              </p>
              <LinkButton secondary to={'/trips/' + b.tripId}>
                Quay lại chuyến
              </LinkButton>
            </Card>
          </div>
        )}
      </AsyncState>
    </>
  );
}
const statusText = {
  pending: 'Đang chờ xác nhận',
  paid: 'Thanh toán đã được xác nhận',
  failed: 'Thanh toán chưa thành công',
  canceled: 'Giao dịch đã hủy',
  expired: 'Đặt vé đã hết hạn',
};
export function PaymentResult() {
  const [params] = useSearchParams(),
    user = useSession(s => s.user)!;
  const id = params.get('bookingId') || params.get('paymentOrder') || params.get('orderId') || '';
  const query = useQuery({
    queryKey: ['booking', id, user.id],
    queryFn: () => bookingApi.booking(id, user.id),
    refetchInterval: q =>
      q.state.data?.status === 'pending' ||
      (!appConfig.demo &&
        q.state.data?.status === 'paid' &&
        ['pending', 'processing'].includes(q.state.data.ticketEmailStatus || 'pending'))
        ? 5000
        : false,
  });
  const b = query.data;
  const unverifiedReturn =
    !appConfig.demo &&
    !!b &&
    ['pending', 'expired'].includes(b.status) &&
    ['failed', 'unverified'].includes(params.get('paymentResult') || '');
  return (
    <>
      <PageTitle
        eyebrow="KẾT QUẢ TỪ DỊCH VỤ"
        title={
          unverifiedReturn
            ? 'Cần kiểm tra kết quả thanh toán'
            : b
              ? statusText[b.status]
              : 'Đang kiểm tra giao dịch'
        }
        description="Kiểm tra kết quả thanh toán và vé của bạn."
      />
      <AsyncState query={query}>
        {b && (
          <Card>
            <Badge tone={b.status === 'paid' ? 'green' : b.status === 'pending' ? 'amber' : 'red'}>
              {statusText[b.status]}
            </Badge>
            <PriceBreakdown booking={b} totalLabel="Tổng tiền" />
            <p className="muted">Mã đặt vé: {b.id}</p>
            {unverifiedReturn && (
              <Message error>
                Chưa xác minh được kết quả từ cổng thanh toán. Nếu ngân hàng đã trừ tiền, đừng thanh
                toán lại; hãy liên hệ nhà xe kèm mã đặt vé để đối soát. Vé chỉ được cấp sau khi có
                xác nhận hợp lệ.
              </Message>
            )}
            {!appConfig.demo && b.status === 'paid' && (
              <p>
                {b.ticketEmailStatus === 'sent'
                  ? `Vé và QR đã được gửi tới ${user.email}. Kiểm tra hộp thư và thư rác.`
                  : b.ticketEmailStatus === 'failed'
                    ? 'Chưa gửi được email vé sau các lần thử lại. Vé vẫn có trong tài khoản; vui lòng liên hệ nhà xe.'
                    : 'Vé và QR đang chờ gửi tới email đã xác minh. Bạn vẫn có thể xem vé trong tài khoản.'}
              </p>
            )}
            <p className="muted">
              {b.status === 'paid'
                ? 'Vé QR của bạn đã sẵn sàng trong Vé của tôi.'
                : unverifiedReturn
                  ? 'Bạn có thể kiểm tra lại trạng thái bên dưới. Mã đặt vé giúp nhà xe tra cứu giao dịch.'
                  : b.status === 'pending'
                    ? appConfig.demo
                      ? 'Giao dịch đang chờ xác nhận demo tại checkout.'
                      : 'Giao dịch đang chờ cổng thanh toán xác nhận. Vé sẽ được cấp khi thanh toán thành công.'
                    : 'Chưa phát hành QR. Kiểm tra trạng thái giao dịch hoặc liên hệ nhà xe để được hỗ trợ.'}
            </p>
            <div className="row">
              <LinkButton to="/account/tickets">Vé của tôi</LinkButton>
              {b.status !== 'paid' && (
                <Button
                  variant="secondary"
                  disabled={query.isFetching}
                  onClick={() => query.refetch()}
                >
                  Kiểm tra lại trạng thái
                </Button>
              )}
              {!unverifiedReturn && ['pending', 'failed'].includes(b.status) && (
                <LinkButton secondary to={'/checkout/' + b.id}>
                  Trở lại thanh toán
                </LinkButton>
              )}
              <LinkButton secondary to="/trips">
                Tìm chuyến khác
              </LinkButton>
            </div>
          </Card>
        )}
      </AsyncState>
    </>
  );
}
