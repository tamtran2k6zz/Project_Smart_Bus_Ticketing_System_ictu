import { useQuery } from '@tanstack/react-query';
import { operationsApi } from '@/features/operations/services/operations.api';
import { bookingApi } from '../services/booking.api';
import { AsyncState } from '@/components/ui/Ui';
import { dateTime } from '@/utils/format';
export function JourneySummary({
  tripId,
  boardingStopId,
  alightingStopId,
}: {
  tripId: string;
  boardingStopId?: string;
  alightingStopId?: string;
}) {
  const trip = useQuery({ queryKey: ['trip', tripId], queryFn: () => bookingApi.trip(tripId) });
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: operationsApi.catalog });
  const route = catalog.data?.routes.find(r => r.id === trip.data?.routeId);
  return (
    <AsyncState query={trip}>
      <AsyncState query={catalog}>
        <section aria-label="Thông tin chuyến đã chọn">
          <h3>{route?.name}</h3>
          <dl className="journeySummary">
            <div>
              <dt>Khởi hành tại đầu tuyến</dt>
              <dd>{trip.data && dateTime(trip.data.departure)}</dd>
            </div>
            <div>
              <dt>Điểm lên xe</dt>
              <dd>
                {catalog.data?.stops.find(s => s.id === boardingStopId)?.name || route?.origin}
              </dd>
            </div>
            <div>
              <dt>Điểm xuống xe</dt>
              <dd>
                {catalog.data?.stops.find(s => s.id === alightingStopId)?.name ||
                  route?.destination}
              </dd>
            </div>
          </dl>
          <p className="muted">
            Giờ đón tại trạm trung gian cần nhà xe xác nhận. Giá demo áp dụng cho cả tuyến.
          </p>
        </section>
      </AsyncState>
    </AsyncState>
  );
}
