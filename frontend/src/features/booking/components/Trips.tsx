import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, MapPin, Armchair, Route as RouteIcon } from 'lucide-react';
import { bookingApi } from '../services/booking.api';
import { operationsApi } from '@/features/operations/services/operations.api';
import { SearchForm } from './SearchForm';
import { Card, Badge, PageTitle, AsyncState, LinkButton } from '@/components/ui/Ui';
import { money, dateTime, localDay } from '@/utils/format';
import type { Trip } from '../types';
import type { Route } from '@/features/operations/types';
import s from './Booking.module.css';
export function TripCard({
  trip,
  route,
  journey = '',
}: {
  trip: Trip;
  route?: Route;
  journey?: string;
}) {
  const departed = Date.parse(trip.departure) <= Date.now();
  return (
    <Card>
      <article className={s.trip}>
        <span className={s.routeNum}>{route?.code || 'BUS'}</span>
        <div>
          <div className="row" style={{ marginBottom: 10 }}>
            <Badge>{trip.seatMode ? 'Đặt ghế' : 'Vé không gắn ghế'}</Badge>
            {departed && <Badge tone="neutral">Đã khởi hành</Badge>}
          </div>
          <h3>{route?.name}</h3>
          <div className="row muted">
            <span className="row">
              <Clock size={14} />
              {dateTime(trip.departure)} · {trip.duration} phút
            </span>
            <span className="row">
              <Armchair size={14} />
              {trip.available} chỗ trống
            </span>
          </div>
        </div>
        <div className={s.tripAside}>
          <span className="price">
            {money(trip.price)}
            <small className="muted"> / vé</small>
          </span>
          <LinkButton to={'/trips/' + trip.id + journey} secondary>
            Xem chuyến
          </LinkButton>
        </div>
      </article>
    </Card>
  );
}
export function TripSearch() {
  const [params] = useSearchParams();
  const filters = { ...Object.fromEntries(params), date: params.get('date') || localDay() };
  const journey =
    '?' + new URLSearchParams({ from: params.get('from') || '', to: params.get('to') || '' });
  const query = useQuery({
    queryKey: ['trips', filters],
    queryFn: () => bookingApi.search(filters),
  });
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: operationsApi.catalog });
  return (
    <div className="container" style={{ paddingBlock: 40 }}>
      <PageTitle
        eyebrow="HÀNH TRÌNH CỦA BẠN"
        title="Tìm chuyến xe phù hợp"
        description="Chọn hành trình và khung giờ. Giá và số chỗ được xác nhận lại khi giữ chỗ."
      />
      <Card>
        <SearchForm key={params.toString()} initial={filters} />
      </Card>
      <div className="between" style={{ margin: '25px 0 18px' }}>
        <strong style={{ fontSize: 13 }}>{query.data?.length || 0} chuyến được tìm thấy</strong>
        <Badge tone="neutral">Giá VND · Giờ Việt Nam</Badge>
      </div>
      <AsyncState
        query={query}
        empty={query.data?.length === 0}
        emptyText="Chưa có chuyến phù hợp. Thử ngày hoặc điểm khác."
      >
        <div className="stack">
          {query.data?.map(trip => (
            <TripCard
              key={trip.id}
              trip={trip}
              journey={journey}
              route={catalog.data?.routes.find(r => r.id === trip.routeId)}
            />
          ))}
        </div>
      </AsyncState>
    </div>
  );
}
export function TripDetail() {
  const { tripId = '' } = useParams();
  const [params] = useSearchParams();
  const journey =
    '?' + new URLSearchParams({ from: params.get('from') || '', to: params.get('to') || '' });
  const query = useQuery({ queryKey: ['trip', tripId], queryFn: () => bookingApi.trip(tripId) });
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: operationsApi.catalog });
  const trip = query.data;
  const route = catalog.data?.routes.find(r => r.id === trip?.routeId);
  const vehicle = catalog.data?.vehicles.find(v => v.id === trip?.vehicleId);
  return (
    <div className="container" style={{ paddingBlock: 40 }}>
      <PageTitle
        eyebrow="CHI TIẾT CHUYẾN"
        title={route?.name || 'Thông tin hành trình'}
        description="Kiểm tra điểm lên xe và điều kiện đặt vé trước khi tiếp tục."
      />
      <AsyncState query={query}>
        {trip && (
          <div className="grid">
            <Card>
              <div className="row">
                <Badge>Tuyến {route?.code}</Badge>
                <Badge tone="neutral">{trip.seatMode ? 'Có sơ đồ ghế' : 'Không gắn ghế'}</Badge>
              </div>
              <h2>{dateTime(trip.departure)}</h2>
              <p className="row">
                <Clock size={18} />
                {trip.duration} phút · {trip.available} chỗ còn lại
              </p>
              <p className="row">
                <RouteIcon size={18} />
                {vehicle?.name} · {vehicle?.plate}
              </p>
              <hr className="divider" />
              <h3>Điểm dừng trên tuyến</h3>
              <p className="muted">
                Lên xe: {params.get('from') || route?.origin}
                <br />
                Xuống xe: {params.get('to') || route?.destination}
                <br />
                Giờ hiển thị là giờ khởi hành tại đầu tuyến. Giờ đón ở trạm trung gian cần nhà xe
                xác nhận. Giá demo áp dụng cho cả tuyến.
              </p>
              <div className="stack">
                {route?.stopIds.map(id => {
                  const stop = catalog.data?.stops.find(s => s.id === id);
                  return (
                    <div className="row" key={id}>
                      <MapPin size={17} color="#15803d" />
                      <div>
                        <strong style={{ fontSize: 13 }}>{stop?.name}</strong>
                        <p className="muted" style={{ margin: 0 }}>
                          {stop?.address}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card>
              <span className="muted">GIÁ VÉ MỖI HÀNH KHÁCH</span>
              <p className="price">{money(trip.price)}</p>
              <p className="muted">
                Giữ chỗ trong 10 phút kể từ thời điểm dịch vụ xác nhận. QR chỉ được phát hành sau
                xác nhận thanh toán.
              </p>
              <p className="muted">
                Chính sách demo: yêu cầu hủy/đổi trước khởi hành 30 phút. Đổi sang chuyến cùng
                tuyến, cùng loại vé và còn chỗ.
              </p>
              <div className="stack">
                {Date.parse(trip.departure) > Date.now() && trip.available > 0 ? (
                  <LinkButton to={'/booking/' + trip.id + journey}>Đặt vé chuyến này</LinkButton>
                ) : (
                  <Badge tone="amber">Chuyến đã khởi hành hoặc hết chỗ</Badge>
                )}
                <LinkButton secondary to={'/tracking/' + trip.id}>
                  Theo dõi chuyến
                </LinkButton>
                <Link to="/trips">Chọn chuyến khác</Link>
              </div>
            </Card>
          </div>
        )}
      </AsyncState>
    </div>
  );
}
