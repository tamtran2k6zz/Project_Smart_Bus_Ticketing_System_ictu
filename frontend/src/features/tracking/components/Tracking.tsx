import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Radio, WifiOff } from 'lucide-react';
import { trackingApi } from '../services/tracking.api';
import { bookingApi } from '@/features/booking/services/booking.api';
import { operationsApi } from '@/features/operations/services/operations.api';
import { notificationsApi } from '@/features/notifications/services/notifications.api';
import { MapAdapter } from './MapAdapter';
import {
  PageTitle,
  Card,
  Badge,
  Button,
  Message,
  AsyncState,
  ActionMessage,
  LinkButton,
} from '@/components/ui/Ui';
import { useSession } from '@/store/session.store';
import { useAction } from '@/hooks/useAction';
import { appConfig } from '@/configs/app.config';
import { dateTime } from '@/utils/format';
import type { LocationUpdate } from '../types';
import s from './Tracking.module.css';
export function Tracking() {
  const { tripId = '' } = useParams(),
    user = useSession(s => s.user);
  const [lost, setLost] = useState(false),
    [online, setOnline] = useState(navigator.onLine),
    [last, setLast] = useState<LocationUpdate>();
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  const trip = useQuery({ queryKey: ['trip', tripId], queryFn: () => bookingApi.trip(tripId) });
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: operationsApi.catalog });
  const location = useQuery({
    queryKey: ['location', tripId],
    queryFn: () => trackingApi.location(tripId),
    enabled: !lost && online,
    refetchInterval: 5000,
    retry: false,
  });
  const incidents = useQuery({
    queryKey: ['incidents', tripId],
    queryFn: () => operationsApi.incidents(tripId),
    refetchInterval: 6000,
  });
  useEffect(() => {
    if (!lost && online && location.data) setLast(location.data);
  }, [location.data, lost, online]);
  const route = catalog.data?.routes.find(r => r.id === trip.data?.routeId);
  const stops = useMemo(
    () =>
      route?.stopIds
        .map(id => catalog.data?.stops.find(s => s.id === id))
        .filter((s): s is NonNullable<typeof s> => !!s) || [],
    [route, catalog.data]
  );
  const stale = last && Date.now() - Date.parse(last.updatedAt) > 30000;
  const connected = !lost && online && !location.isError && !!last?.connected && !stale;
  const subscribe = useAction(async () => {
    if (!user) throw new Error('Đăng nhập để bật thông báo.');
    await notificationsApi.subscribe(user.id, tripId);
  }, 'Đã bật thông báo trạm trong ứng dụng.');
  return (
    <div className="container" style={{ paddingBlock: 40 }}>
      <PageTitle
        eyebrow="THEO DÕI HÀNH TRÌNH"
        title={route?.name || 'Vị trí xe & trạm'}
        description={
          appConfig.demo
            ? 'Vị trí và ETA mô phỏng. Nền bản đồ là sơ đồ tuyến.'
            : 'Vị trí và ETA từ dịch vụ nhà xe.'
        }
        action={
          <Badge tone={connected ? 'green' : 'amber'}>
            {connected ? <Radio size={13} /> : <WifiOff size={13} />}{' '}
            {connected ? 'Đang cập nhật' : 'Chưa có tín hiệu'}
          </Badge>
        }
      />
      <AsyncState query={trip}>
        <div
          className="grid"
          style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)' }}
          data-responsive-grid
        >
          <Card>
            <MapAdapter stops={stops} location={last} />
            <div className="between" style={{ marginTop: 18 }}>
              <span className="muted">
                Cập nhật cuối: {last ? dateTime(last.updatedAt) : 'Chưa nhận dữ liệu'}
              </span>
              {appConfig.demo && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setLost(!lost);
                    if (lost) location.refetch();
                  }}
                >
                  {lost ? 'Kết nối lại demo' : 'Mô phỏng mất tín hiệu'}
                </Button>
              )}
            </div>
            {!connected && (
              <Message error>
                Vị trí được giữ tại lần nhận cuối. ETA tạm ngừng khi mất tín hiệu.
              </Message>
            )}
            {location.isError && (
              <Button variant="secondary" onClick={() => location.refetch()}>
                Thử kết nối lại
              </Button>
            )}
          </Card>
          <div className="stack">
            <Card>
              <span className="muted">TRẠM TIẾP THEO</span>
              <h3 className="row">
                <MapPin size={19} />
                {connected ? last?.nextStop : 'Chờ dữ liệu'}
              </h3>
              <p className="price">{connected ? last?.eta + ' phút' : '—'}</p>
              <p className="muted">Thời gian dự kiến, có thể thay đổi theo tình hình tuyến.</p>
              {user ? (
                <Button disabled={subscribe.isPending} onClick={() => subscribe.mutate(undefined)}>
                  Nhận thông báo trạm
                </Button>
              ) : (
                <LinkButton
                  secondary
                  to={'/login?redirect=' + encodeURIComponent('/tracking/' + tripId)}
                >
                  Đăng nhập nhận thông báo
                </LinkButton>
              )}
              <ActionMessage action={subscribe} />
            </Card>
            <Card>
              <h3>Các điểm dừng</h3>
              {stops.map((stop, i) => (
                <div key={stop.id} className={s.stop}>
                  <span className={s.stopNumber}>{i + 1}</span>
                  <div>
                    <strong>{stop.name}</strong>
                    <p className="muted" style={{ margin: 0 }}>
                      {stop.address}
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </AsyncState>
      <h3>Cập nhật trên tuyến</h3>
      <AsyncState
        query={incidents}
        empty={incidents.data?.length === 0}
        emptyText="Chưa có sự cố được báo cáo"
      >
        <div className="stack">
          {incidents.data?.map(i => (
            <Card key={i.id}>
              <Badge tone={i.resolved ? 'green' : 'amber'}>
                {i.resolved ? 'Đã xử lý' : 'Đang xử lý'}
              </Badge>
              <p>{i.message}</p>
              <small className="muted">{dateTime(i.createdAt)}</small>
            </Card>
          ))}
        </div>
      </AsyncState>
    </div>
  );
}
