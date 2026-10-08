import { useState } from 'react';
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
  const hold = useQuery({
    queryKey: ['hold', query.data?.holdId, user.id],
    queryFn: () => bookingApi.hold(query.data!.holdId, user.id),
    enabled: !!query.data,
  });
  const start = useAction(async () => {
    const p = await paymentApi.start(bookingId, user.id, gateway);
    if (p.redirectUrl && !appConfig.demo) {
      const url = new URL(p.redirectUrl);
      if (url.protocol !== 'https:') throw new Error('URL cổng thanh toán không an toàn.');
      window.location.assign(url.href);
    }
  }, 'Giao dịch demo đang chờ xác nhận. Chọn kết quả mô phỏng bên dưới.');
  const confirm = useAction(async (status: Payment['status']) => {
    if (!payment.data) throw new Error('Khởi tạo giao dịch trước.');
    await paymentApi.confirmDemo(payment.data.id, user.id, status);
    navigate('/payment/result?bookingId=' + bookingId);
  });
  const b = query.data,
    canPay =
      b && ['pending', 'failed'].includes(b.status) && !expired && hold.data?.status === 'active';
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
                  {(['MoMo', 'VNPay', 'ZaloPay', 'Card'] as Gateway[]).map(value => (
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
                        disabled={!canPay || payment.data?.status === 'pending'}
                      />
                      <CreditCard size={19} />
                      {value === 'Card' ? 'Thẻ ngân hàng' : value}
                    </label>
                  ))}
                </div>
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
                  <Button
                    disabled={!canPay || start.isPending || payment.data?.status === 'pending'}
                    onClick={() => start.mutate(undefined)}
                  >
                    Khởi tạo {appConfig.demo ? 'giao dịch demo' : 'thanh toán'} · {money(b.total)}
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
                          disabled={confirm.isPending}
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
  const id = params.get('bookingId') || '';
  const query = useQuery({
    queryKey: ['booking', id, user.id],
    queryFn: () => bookingApi.booking(id, user.id),
    refetchInterval: q => (q.state.data?.status === 'pending' ? 3000 : false),
  });
  const b = query.data;
  return (
    <>
      <PageTitle
        eyebrow="KẾT QUẢ TỪ DỊCH VỤ"
        title={b ? statusText[b.status] : 'Đang kiểm tra giao dịch'}
        description="Trang này đọc trạng thái từ dịch vụ; callback URL không quyết định kết quả."
      />
      <AsyncState query={query}>
        {b && (
          <Card>
            <Badge tone={b.status === 'paid' ? 'green' : b.status === 'pending' ? 'amber' : 'red'}>
              {statusText[b.status]}
            </Badge>
            <PriceBreakdown booking={b} totalLabel="Tổng tiền" />
            <p className="muted">Mã đặt vé: {b.id}</p>
            <p className="muted">
              {b.status === 'paid'
                ? 'Vé QR của bạn đã sẵn sàng trong Vé của tôi.'
                : b.status === 'pending'
                  ? 'Giao dịch đang chờ. Demo cần xác nhận tại checkout; hệ thống thật chờ webhook của cổng.'
                  : 'Chưa phát hành QR. Giao dịch thất bại/hủy trong demo không thu tiền.'}
            </p>
            <div className="row">
              <LinkButton to="/account/tickets">Vé của tôi</LinkButton>
              {['pending', 'failed'].includes(b.status) && (
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
