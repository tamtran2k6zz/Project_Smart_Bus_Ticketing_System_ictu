import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  const { tripId = '' } = useParams(),
    navigate = useNavigate();
  const user = useSession(s => s.user)!;
  const draft = useBookingDraft();
  const [params] = useSearchParams();
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (draft.tripId !== tripId) {
      draft.set({ tripId, seatIds: [], quantity: 1, holdId: '' });
    }
  }, [tripId, draft]);
  const query = useQuery({ queryKey: ['trip', tripId], queryFn: () => bookingApi.trip(tripId) });
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
  });
  const active = hold.data?.status === 'active' && !expired;
  const journeyChanged = !!(
    active &&
    route &&
    selectedJourney &&
    ((hold.data?.boardingStopId || route.stopIds[0]) !== selectedJourney.boardingStopId ||
      (hold.data?.alightingStopId || route.stopIds[route.stopIds.length - 1]) !==
        selectedJourney.alightingStopId)
  );
  const holdAction = useAction(async () => {
    const h = await bookingApi.createHold(
      tripId,
      user.id,
      query.data?.seatMode ? draft.seatIds : [],
      query.data?.seatMode ? draft.seatIds.length : draft.quantity,
      { from: params.get('from') || '', to: params.get('to') || '' }
    );
    draft.set({ holdId: h.id, quantity: h.quantity });
    setExpired(false);
  }, 'Đã giữ chỗ. Hoàn tất thông tin để tiếp tục.');
  const release = useAction(async () => {
    await bookingApi.release(holdId, user.id);
    draft.set({ holdId: '' });
    setExpired(false);
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name, phone: user.phone, voucher: '' },
  });
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
                          className={
                            (draft.seatIds.includes(seat.id) ? s.selected : '') +
                            ' ' +
                            (seat.mine ? s.mine : '')
                          }
                          onClick={() => {
                            draft.set({
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
                    <p className="muted" style={{ textAlign: 'center' }}>
                      Xanh nhạt: trống · xám: đã giữ/đặt
                      <br />
                      Viền vàng: giữ chỗ của bạn
                    </p>
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
                      onChange={e => draft.set({ quantity: Number(e.target.value) })}
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
              {!active ? (
                <Button
                  disabled={
                    holdAction.isPending || quantity < 1 || Date.parse(trip.departure) <= Date.now()
                  }
                  onClick={() => holdAction.mutate(undefined)}
                >
                  Giữ chỗ 10 phút
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
                  <Field label="Mã ưu đãi" hint="Demo: SMART10 giảm 10%">
                    <input placeholder="Nhập mã nếu có" {...form.register('voucher')} />
                  </Field>
                  <ActionMessage action={book} />
                  <Message error>{hold.error ? String(hold.error.message) : ''}</Message>
                  <Button disabled={!active || journeyChanged || book.isPending}>
                    {book.isPending ? 'Đang tạo đặt vé…' : 'Tiếp tục thanh toán'}
                  </Button>
                  <p className="muted">
                    Bạn xác nhận đã kiểm tra thông tin và chính sách hủy/đổi demo trước khi tiếp
                    tục.
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
