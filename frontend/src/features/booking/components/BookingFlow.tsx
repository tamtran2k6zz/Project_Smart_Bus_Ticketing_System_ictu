import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Armchair } from 'lucide-react';
import { bookingApi } from '../services/booking.api';
import { operationsApi } from '@/features/operations/services/operations.api';
import { journeyStops } from '../utils/journey';
import { JourneySummary } from './JourneySummary';
import { useSession } from '@/store/session.store';
import { useBookingDraft } from '@/store/booking.store';
import { useAction } from '@/hooks/useAction';
import { appConfig } from '@/configs/app.config';
import {
  Card,
  Button,
  Field,
  Message,
  ActionMessage,
  AsyncState,
  PageTitle,
  Badge,
} from '@/components/ui/Ui';
import { money, remainingSeconds } from '@/utils/format';
import type { Hold } from '../types';
import type { User } from '@/features/auth/types';
import { ApiError } from '@/services/http';
import s from './Booking.module.css';
const schema = z.object({
  name: z.string().trim().min(2, 'Nhập họ tên'),
  phone: z.string().regex(/^(0|\+84)\d{9}$/, 'Số điện thoại không hợp lệ'),
  voucher: z.string(),
});
export function HoldTimer({
  hold,
  receivedAt,
  onExpire,
}: {
  hold: Hold;
  receivedAt: number;
  onExpire?: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const offset = Date.parse(hold.serverTime) - receivedAt;
  const seconds = remainingSeconds(hold.expiresAt, offset, now);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (seconds === 0) onExpire?.();
  }, [seconds, onExpire]);
  return (
    <div className={s.hold}>
      <div>
        <strong style={{ fontSize: 13 }}>
          {seconds ? 'Chỗ đang được giữ cho bạn' : 'Giữ chỗ đã hết hạn'}
        </strong>
        <p style={{ fontSize: 11, margin: '6px 0 0' }}>
          Thời hạn từ dịch vụ · tải lại không kéo dài giữ chỗ
        </p>
      </div>
      <strong>
        {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
      </strong>
    </div>
  );
}
export function BookingFlow() {
  const user = useSession(s => s.user);
  // Reset form/action state as well as the draft when an account changes in place.
  return user ? <PassengerBookingFlow key={user.id} user={user} /> : null;
}
function PassengerBookingFlow({ user }: { user: User }) {
  const { tripId = '' } = useParams(),
    navigate = useNavigate();
  const draft = useBookingDraft(user.id);
  const setDraft = draft.set;
  const client = useQueryClient();
  const [params] = useSearchParams();
  const [expired, setExpired] = useState(false);
  const [bookingNotice, setBookingNotice] = useState('');
  useEffect(() => {
    if (draft.tripId !== tripId) {
      setDraft({ tripId, seatIds: [], quantity: 1, holdId: '' });
    }
  }, [tripId, draft.tripId, setDraft, user.id]);
  const query = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => bookingApi.trip(tripId),
    refetchInterval: 5000,
  });
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: operationsApi.catalog });
  const route = catalog.data?.routes.find(r => r.id === query.data?.routeId);
  const selectedJourney =
    route &&
    journeyStops(
      route,
      catalog.data?.stops || [],
      params.get('from') || '',
      params.get('to') || ''
    );
  const seats = useQuery({
    queryKey: ['seats', tripId, user.id],
    queryFn: () => bookingApi.seats(tripId, user.id),
    refetchInterval: 5000,
  });
  const holdId = draft.tripId === tripId ? draft.holdId : '';
  const hold = useQuery({
    queryKey: ['hold', holdId, user.id],
    queryFn: () => bookingApi.hold(holdId, user.id),
    enabled: !!holdId,
    refetchInterval: 5000,
    retry: false,
  });
  const missingHold = hold.error instanceof ApiError && [404, 410].includes(hold.error.status || 0);
  const active = hold.data?.status === 'active' && !expired && !missingHold;
  useEffect(() => {
    if (!holdId || !missingHold) return;
    setDraft({ holdId: '', seatIds: [], quantity: 1 });
    setExpired(false);
    setBookingNotice('Lượt giữ chỗ cũ không còn khả dụng. Vui lòng chọn ghế và đặt chỗ lại.');
    void client.invalidateQueries({ queryKey: ['seats', tripId, user.id] });
    void client.invalidateQueries({ queryKey: ['trip', tripId] });
  }, [holdId, missingHold, setDraft, user.id, tripId, client]);
  useEffect(() => {
    if (active || (holdId && hold.isFetching) || !seats.data || draft.tripId !== tripId) return;
    const selectable = new Set(
      seats.data
        .filter(seat => seat.status === 'available' || (seat.status === 'held' && seat.mine))
        .map(seat => seat.id)
    );
    const selected = draft.seatIds.filter(id => selectable.has(id));
    if (selected.length === draft.seatIds.length) return;
    setDraft({ seatIds: selected });
    setBookingNotice('Một số ghế vừa được khách khác giữ hoặc đặt. Vui lòng chọn ghế còn trống.');
  }, [
    active,
    holdId,
    hold.isFetching,
    seats.data,
    draft.tripId,
    draft.seatIds,
    tripId,
    user.id,
    setDraft,
  ]);
  const journeyChanged = !!(
    active &&
    route &&
    selectedJourney &&
    ((hold.data?.boardingStopId || route.stopIds[0]) !== selectedJourney.boardingStopId ||
      (hold.data?.alightingStopId || route.stopIds[route.stopIds.length - 1]) !==
        selectedJourney.alightingStopId)
  );
  const holdAction = useAction(async () => {
    let h: Hold;
    try {
      h = await bookingApi.createHold(
        tripId,
        user.id,
        query.data?.seatMode ? draft.seatIds : [],
        query.data?.seatMode ? draft.seatIds.length : draft.quantity,
        { from: params.get('from') || '', to: params.get('to') || '' }
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        await Promise.all([seats.refetch(), query.refetch()]);
      }
      throw error;
    }
    setDraft({ tripId: h.tripId, holdId: h.id, seatIds: h.seatIds, quantity: h.quantity });
    setExpired(false);
    setBookingNotice('');
    await seats.refetch();
  }, 'Đã giữ chỗ. Hoàn tất thông tin để tiếp tục.');
  const release = useAction(async () => {
    await bookingApi.release(holdId, user.id);
    setDraft({ holdId: '' });
    setExpired(false);
    await seats.refetch();
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name, phone: user.phone, voucher: '' },
  });
  // Xem trước voucher khi đang gõ (chờ 300ms sau lần gõ cuối) để thấy ngay số tiền giảm.
  const voucherInput = form.watch('voucher').trim().toUpperCase();
  const [voucherCode, setVoucherCode] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setVoucherCode(voucherInput), 300);
    return () => clearTimeout(timer);
  }, [voucherInput]);
  const preview = useQuery({
    queryKey: ['voucher-preview', holdId, user.id, voucherCode, hold.data?.quantity],
    queryFn: () => bookingApi.previewVoucher(holdId, user.id, voucherCode),
    enabled: active && !!voucherCode,
    retry: false,
  });
  const vouchers = useQuery({
    queryKey: ['active-vouchers'],
    queryFn: () => bookingApi.activeVouchers(user.id),
    enabled: active,
  });
  const voucherChecking =
    active && !!voucherInput && (voucherInput !== voucherCode || preview.isFetching);
  const voucherError =
    active && !!voucherCode && !voucherChecking && preview.isError
      ? preview.error.message
      : undefined;
  const voucherResult = active && voucherCode && !voucherChecking ? preview.data : undefined;
  const book = useAction(async (v: z.infer<typeof schema>) => {
    if (journeyChanged) throw new Error('Hành trình đã thay đổi. Giải phóng giữ chỗ và chọn lại.');
    const b = await bookingApi.createBooking(holdId, user.id, v.name, v.phone, v.voucher);
    navigate('/checkout/' + b.id);
  });
  const trip = query.data;
  const quantity = trip?.seatMode ? draft.seatIds.length : draft.quantity;
  return (
    <>
      <PageTitle
        eyebrow="ĐẶT VÉ · BƯỚC 1 / 2"
        title="Chọn chỗ cho hành trình"
        description="Tồn chỗ và giá được xác nhận bởi dịch vụ khi bạn giữ chỗ."
      />
      <AsyncState query={query}>
        {!appConfig.demo && !user.emailVerified && (
          <Card>
            <p>Email chưa xác minh. Vui lòng xác minh trước khi giữ chỗ và đặt vé.</p>
            <Link to="/verify-email">Xác minh email</Link>
          </Card>
        )}
        {trip && (
          <div className="grid">
            <Card>
              <div className="between">
                <h3 style={{ margin: 0 }}>
                  {trip.seatMode ? 'Chọn ghế của bạn' : 'Chọn số lượng vé'}
                </h3>
                <Badge>{trip.available} chỗ trống</Badge>
              </div>
              {trip.seatMode ? (
                <AsyncState query={seats}>
                  <div className={s.seatBus}>
                    <p className="muted" style={{ textAlign: 'center' }}>
                      PHÍA TRƯỚC XE
                    </p>
                    <div className={s.seatGrid}>
                      {seats.data?.map(seat => (
                        <button
                          key={seat.id}
                          aria-label={'Ghế ' + seat.id}
                          aria-pressed={draft.seatIds.includes(seat.id)}
                          disabled={
                            !!active ||
                            seat.status === 'booked' ||
                            (seat.status === 'held' && !seat.mine)
                          }
                          data-seat-state={
                            active && hold.data?.seatIds.includes(seat.id)
                              ? 'mine'
                              : seat.status === 'available'
                                ? draft.seatIds.includes(seat.id)
                                  ? 'selected'
                                  : 'available'
                                : seat.status === 'held' && seat.mine
                                  ? 'mine'
                                  : 'occupied'
                          }
                          title={
                            active && hold.data?.seatIds.includes(seat.id)
                              ? 'Đang giữ cho bạn'
                              : seat.status !== 'available'
                                ? seat.status === 'held' && seat.mine
                                  ? 'Đang giữ cho bạn'
                                  : 'Khách khác đã giữ / đã đặt'
                                : draft.seatIds.includes(seat.id)
                                  ? 'Đang chọn, chưa giữ chỗ'
                                  : 'Còn trống'
                          }
                          onClick={() => {
                            setDraft({
                              seatIds: draft.seatIds.includes(seat.id)
                                ? draft.seatIds.filter(id => id !== seat.id)
                                : [...draft.seatIds, seat.id].slice(0, 6),
                            });
                          }}
                        >
                          {seat.id}
                        </button>
                      ))}
                    </div>
                    <ul className={s.seatLegend} aria-label="Chú giải trạng thái ghế">
                      <li>
                        <span data-seat-state="available" />
                        Trống
                      </li>
                      <li>
                        <span data-seat-state="selected" />
                        Đang chọn (chưa giữ)
                      </li>
                      <li>
                        <span data-seat-state="mine" />
                        Đang giữ cho bạn
                      </li>
                      <li>
                        <span data-seat-state="occupied" />
                        Khách khác đã giữ / đã đặt
                      </li>
                    </ul>
                    {active && (
                      <p className="muted">
                        Muốn đổi ghế, chọn “Thay đổi lựa chọn” để hủy giữ chỗ hiện tại.
                      </p>
                    )}
                  </div>
                </AsyncState>
              ) : (
                <>
                  <p className="muted">
                    Tuyến nội đô không gắn ghế. Vé đảm bảo số chỗ theo sức chứa dịch vụ, không chỉ
                    định vị trí ngồi.
                  </p>
                  <Field label="Số vé (tối đa 6)">
                    <select
                      value={draft.quantity}
                      disabled={!!active}
                      onChange={e => setDraft({ quantity: Number(e.target.value) })}
                    >
                      {[1, 2, 3, 4, 5, 6].map(n => (
                        <option key={n} value={n}>
                          {n} vé
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
              <div className="between" style={{ marginTop: 20 }}>
                <span className="row muted">
                  <Armchair size={17} />
                  {quantity} vé đã chọn
                </span>
                <strong className="price">
                  {money((hold.data?.price || trip.price) * quantity)}
                </strong>
              </div>
              <ActionMessage action={holdAction} />
              <ActionMessage action={release} />
              {bookingNotice && <Message>{bookingNotice}</Message>}
              {!active ? (
                <Button
                  disabled={
                    holdAction.isPending ||
                    quantity < 1 ||
                    Date.parse(trip.departure) <= Date.now() ||
                    (!appConfig.demo && !user.emailVerified)
                  }
                  onClick={() => holdAction.mutate(undefined)}
                >
                  ĐẶT CHỖ
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  disabled={release.isPending}
                  onClick={() => release.mutate(undefined)}
                >
                  Thay đổi lựa chọn
                </Button>
              )}
            </Card>
            <div className="stack">
              <Card>
                <JourneySummary
                  tripId={tripId}
                  boardingStopId={
                    active ? hold.data?.boardingStopId : selectedJourney?.boardingStopId
                  }
                  alightingStopId={
                    active ? hold.data?.alightingStopId : selectedJourney?.alightingStopId
                  }
                />
              </Card>
              {journeyChanged && (
                <Message error>
                  Hành trình tìm kiếm khác với lượt giữ chỗ đang có. Chọn “Thay đổi lựa chọn” để
                  giải phóng rồi giữ lại đúng hành trình.
                </Message>
              )}
              {hold.data && (
                <HoldTimer
                  hold={hold.data}
                  receivedAt={hold.dataUpdatedAt}
                  onExpire={() => {
                    if (!expired) setExpired(true);
                  }}
                />
              )}
              {expired || hold.data?.status === 'expired' ? (
                <Message error>Giữ chỗ đã hết hạn. Hãy giữ lại chỗ trước khi tiếp tục.</Message>
              ) : null}
              <Card>
                <h3>Thông tin hành khách</h3>
                <form className="stack" onSubmit={form.handleSubmit(v => book.mutate(v))}>
                  <Field label="Họ tên" error={form.formState.errors.name?.message}>
                    <input autoComplete="name" {...form.register('name')} />
                  </Field>
                  <Field label="Số điện thoại" error={form.formState.errors.phone?.message}>
                    <input autoComplete="tel" {...form.register('phone')} />
                  </Field>
                  <Field
                    label="Mã ưu đãi"
                    hint={
                      appConfig.demo
                        ? 'Demo: SMART10 giảm 10%'
                        : 'Nhập mã do nhà xe cung cấp nếu có.'
                    }
                    error={voucherError}
                  >
                    <div className="stack" style={{ gap: 8 }}>
                      {vouchers.data && vouchers.data.length > 0 && (
                        <select
                          className="filter-select"
                          onChange={e => form.setValue('voucher', e.target.value)}
                          value={
                            vouchers.data.some(v => v.code === voucherInput) ? voucherInput : ''
                          }
                          style={{ width: '100%' }}
                        >
                          <option value="">-- Chọn voucher có sẵn trong hệ thống --</option>
                          {vouchers.data.map(v => (
                            <option key={v.id} value={v.code}>
                              🎟️ {v.code} (-{v.percent}%){' '}
                              {v.description ? `- ${v.description}` : ''}
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        placeholder="Hoặc nhập mã thủ công"
                        autoComplete="off"
                        style={{ textTransform: 'uppercase' }}
                        {...form.register('voucher')}
                      />
                    </div>
                  </Field>
                  {voucherInput && !active && (
                    <p className="muted" style={{ margin: 0 }}>
                      Giữ chỗ trước để kiểm tra mã và xem số tiền được giảm.
                    </p>
                  )}
                  {voucherChecking && (
                    <p className="muted" role="status" style={{ margin: 0 }}>
                      Đang kiểm tra mã…
                    </p>
                  )}
                  {voucherResult && (
                    <div className="stack" role="status" style={{ gap: 6 }}>
                      <div className="between">
                        <span className="muted">Tạm tính</span>
                        <span>{money(voucherResult.subtotal)}</span>
                      </div>
                      <div className="between">
                        <span>
                          Ưu đãi {voucherResult.code} (−{voucherResult.percent}%)
                        </span>
                        <strong>− {money(voucherResult.discount)}</strong>
                      </div>
                      <div className="between">
                        <strong>Tổng thanh toán</strong>
                        <strong className="price">{money(voucherResult.total)}</strong>
                      </div>
                    </div>
                  )}
                  <ActionMessage action={book} />
                  <Message error>
                    {hold.error && !missingHold ? String(hold.error.message) : ''}
                  </Message>
                  <Button
                    disabled={
                      !active ||
                      journeyChanged ||
                      book.isPending ||
                      voucherChecking ||
                      !!voucherError
                    }
                  >
                    {book.isPending ? 'Đang tạo đặt vé…' : 'Tiếp tục thanh toán'}
                  </Button>
                  <p className="muted">
                    Bạn xác nhận đã kiểm tra thông tin và chính sách hủy/đổi trước khi tiếp tục.
                  </p>
                </form>
              </Card>
            </div>
          </div>
        )}
      </AsyncState>
    </>
  );
}
