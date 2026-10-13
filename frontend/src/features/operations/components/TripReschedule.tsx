import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { request } from '@/services/http';
import { operationsApi } from '../services/operations.api';
import { useAction } from '@/hooks/useAction';
import { Card, Field, Button, ActionMessage } from '@/components/ui/Ui';
import { dateTime } from '@/utils/format';
import { appConfig } from '@/configs/app.config';

export function TripReschedule() {
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: operationsApi.catalog });
  const [tripId, setTripId] = useState(''),
    [departure, setDeparture] = useState(''),
    [arrival, setArrival] = useState('');
  const action = useAction(async () => {
    await request('/trips/' + tripId + '/reschedule', 'POST', {
      departure: new Date(departure).toISOString(),
      arrival: new Date(arrival).toISOString(),
    });
    await catalog.refetch();
  }, 'Đã đổi giờ và gửi thông báo cho hành khách.');
  if (appConfig.demo) return null;
  return (
    <Card>
      <h3>Đổi giờ chuyến & thông báo</h3>
      <p className="muted">
        Giữ nguyên tuyến, xe và ghế đã đặt. Giờ mới được kiểm tra trùng xe và tổ lái.
      </p>
      <form
        className="formGrid"
        onSubmit={e => {
          e.preventDefault();
          action.mutate(undefined);
        }}
      >
        <Field label="Chuyến cần đổi giờ">
          <select required value={tripId} onChange={e => setTripId(e.target.value)}>
            <option value="">Chọn chuyến</option>
            {catalog.data?.trips
              .filter(t => Date.parse(t.departure) > Date.now() && t.status === 'scheduled')
              .map(t => (
                <option key={t.id} value={t.id}>
                  {dateTime(t.departure)} ·{' '}
                  {catalog.data?.routes.find(r => r.id === t.routeId)?.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Khởi hành mới">
          <input
            required
            type="datetime-local"
            value={departure}
            onChange={e => setDeparture(e.target.value)}
          />
        </Field>
        <Field label="Đến nơi mới">
          <input
            required
            type="datetime-local"
            value={arrival}
            onChange={e => setArrival(e.target.value)}
          />
        </Field>
        <Button disabled={action.isPending}>Đổi giờ & gửi thông báo</Button>
      </form>
      <ActionMessage action={action} />
    </Card>
  );
}
