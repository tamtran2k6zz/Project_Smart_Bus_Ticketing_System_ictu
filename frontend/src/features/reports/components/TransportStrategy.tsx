import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { request } from '@/services/http';
import { Card, Field, Button, AsyncState, Badge } from '@/components/ui/Ui';
import { localDay, dateTime } from '@/utils/format';
import { appConfig } from '@/configs/app.config';
import type { ReportFilter } from '../services/reports.api';
interface PerTrip {
  tripId: string;
  route: string;
  vehicle: string;
  departure: string;
  capacity: number;
  passengers: number;
  occupancy: number;
}
interface Strategy {
  sampleTrips: number;
  warning: string;
  method: string;
  density: {
    route: string;
    hour: number;
    passengers: number;
    occupancy: number;
    recommendation: string;
  }[];
  stops: { stop: string; hour: number; boarding: boolean; passengers: number }[];
  forecasts: {
    route: string;
    date: string;
    expectedPassengers: number;
    recommendedTrips: number;
    sampleDays: number;
    confidence: string;
    rangeLow: number;
    rangeHigh: number;
  }[];
}
export function TransportStrategy({ filter }: { filter: ReportFilter }) {
  const [forecastDate, setForecastDate] = useState(localDay(new Date(Date.now() + 86400000))),
    [peakFactor, setPeakFactor] = useState(1);
  const [history, setHistory] = useState({
    from: localDay(new Date(Date.now() - 56 * 86400000)),
    to: localDay(new Date(Date.now() - 86400000)),
  });
  const qs = new URLSearchParams({
    from: filter.from,
    to: filter.to,
    routeId: filter.routeId,
    vehicleId: filter.vehicleId || '',
  }).toString();
  const trips = useQuery({
    queryKey: ['per-trip', qs],
    queryFn: () => request<PerTrip[]>('/reports/per-trip?' + qs),
    enabled: !appConfig.demo,
  });
  const strategyQs = new URLSearchParams({
    ...history,
    routeId: filter.routeId,
    forecastDate,
    peakFactor: String(peakFactor),
  }).toString();
  const strategy = useQuery({
    queryKey: ['strategy', strategyQs],
    queryFn: () => request<Strategy>('/reports/strategy?' + strategyQs),
    enabled: !appConfig.demo,
  });
  if (appConfig.demo)
    return (
      <Card>
        <h3>Phân tích vận tải</h3>
        <p>
          Bản demo API cục bộ có dữ liệu lịch sử để xem mật độ theo giờ/trạm và dự báo cao điểm.
        </p>
      </Card>
    );
  return (
    <div className="stack">
      <Card>
        <h3>Tỷ lệ lấp đầy từng chuyến</h3>
        <AsyncState query={trips} empty={trips.data?.length === 0}>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Chuyến</th>
                  <th>Tuyến / xe</th>
                  <th>Hành khách</th>
                  <th>Lấp đầy</th>
                </tr>
              </thead>
              <tbody>
                {trips.data?.map(t => (
                  <tr key={t.tripId}>
                    <td>
                      {dateTime(t.departure)}
                      <small className="muted">{t.tripId}</small>
                    </td>
                    <td>
                      {t.route} · {t.vehicle}
                    </td>
                    <td>
                      {t.passengers}/{t.capacity}
                    </td>
                    <td>{t.occupancy}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AsyncState>
      </Card>
      <Card>
        <h3>Phân tích & dự báo nhu cầu</h3>
        <p className="muted">Dữ liệu lịch sử riêng; hệ số cao điểm là giả định của điều hành.</p>
        <div className="formGrid">
          <Field label="Lịch sử từ">
            <input
              type="date"
              value={history.from}
              onChange={e => setHistory({ ...history, from: e.target.value })}
            />
          </Field>
          <Field label="Lịch sử đến">
            <input
              type="date"
              min={history.from}
              value={history.to}
              onChange={e => setHistory({ ...history, to: e.target.value })}
            />
          </Field>
          <Field label="Ngày dự báo">
            <input
              type="date"
              value={forecastDate}
              onChange={e => setForecastDate(e.target.value)}
            />
          </Field>
          <Field label="Hệ số cao điểm">
            <input
              type="number"
              min={1}
              max={3}
              step={0.1}
              value={peakFactor}
              onChange={e => setPeakFactor(Number(e.target.value))}
            />
          </Field>
          <Button variant="secondary" onClick={() => strategy.refetch()}>
            Tính lại dự báo
          </Button>
        </div>
        <AsyncState query={strategy}>
          {strategy.data && (
            <>
              <p>{strategy.data.warning}</p>
              <p className="muted">
                {strategy.data.method} · {strategy.data.sampleTrips} chuyến lịch sử
              </p>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tuyến / giờ</th>
                      <th>Hành khách</th>
                      <th>Lấp đầy</th>
                      <th>Đề xuất</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategy.data.density.map((d, i) => (
                      <tr key={i}>
                        <td>
                          {d.route} · {d.hour}h
                        </td>
                        <td>{d.passengers}</td>
                        <td>{d.occupancy}%</td>
                        <td>{d.recommendation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h4>Mật độ tại trạm</h4>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Trạm / giờ</th>
                      <th>Lên / xuống</th>
                      <th>Hành khách</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategy.data.stops.map((s, i) => (
                      <tr key={i}>
                        <td>
                          {s.stop} · {s.hour}h
                        </td>
                        <td>{s.boarding ? 'Lên' : 'Xuống'}</td>
                        <td>{s.passengers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h4>Dự báo ngày {forecastDate}</h4>
              {!strategy.data.forecasts.length ? (
                <p>Chưa có dữ liệu để dự báo.</p>
              ) : (
                strategy.data.forecasts.map((f, i) => (
                  <div key={i}>
                    <strong>{f.route}</strong>
                    <p>
                      {f.expectedPassengers} khách dự kiến ({f.rangeLow}–{f.rangeHigh}); đề xuất{' '}
                      {f.recommendedTrips} chuyến để hướng tới mức lấp đầy 80%.
                    </p>
                    <Badge tone="amber">
                      Độ tin cậy {f.confidence === 'medium' ? 'trung bình' : 'thấp'} ·{' '}
                      {f.sampleDays} ngày mẫu
                    </Badge>
                  </div>
                ))
              )}
            </>
          )}
        </AsyncState>
      </Card>
    </div>
  );
}
