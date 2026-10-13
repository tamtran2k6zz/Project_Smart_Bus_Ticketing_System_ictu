import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { request } from '@/services/http';
import { useAction } from '@/hooks/useAction';
import { operationsApi } from '../services/operations.api';
import { Card, Field, Button, ActionMessage, AsyncState } from '@/components/ui/Ui';
import { localDay } from '@/utils/format';
import { appConfig } from '@/configs/app.config';
import { TripReschedule } from './TripReschedule';
interface Schedule {
  id: string;
  name: string;
  config: { from: string; to: string; headway: number };
}
export function SchedulePlanner() {
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: operationsApi.catalog });
  const list = useQuery({
    queryKey: ['schedules'],
    queryFn: () => request<Schedule[]>('/schedules'),
    enabled: !appConfig.demo,
  });
  const [form, setForm] = useState({
    name: 'Lịch ngày thường',
    routeId: '',
    from: localDay(new Date(Date.now() + 86400000)),
    to: localDay(new Date(Date.now() + 86400000)),
    startTime: '06:00',
    endTime: '08:00',
    headway: 30,
    duration: 30,
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    vehicleIds: [] as string[],
  });
  const [result, setResult] = useState('');
  const create = useAction(async () => {
    const r = await request<{ count: number }>('/schedules', 'POST', form);
    setResult('Đã sinh ' + r.count + ' chuyến.');
    await list.refetch();
  }, 'Đã lưu lịch mẫu và tạo chuyến.');
  const remove = useAction(async (id: string) => {
    await request('/schedules/' + id, 'DELETE');
    await list.refetch();
  }, 'Đã hủy các chuyến chưa có vé trong lịch.');
  const update = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));
  if (appConfig.demo)
    return (
      <Card>
        <h3>Lịch theo tần suất</h3>
        <p>Chạy bản demo API cục bộ để sinh lịch có lưu cơ sở dữ liệu và kiểm tra trùng xe.</p>
      </Card>
    );
  return (
    <>
      <TripReschedule />
      <Card>
        <h3>Lịch mẫu & tần suất theo ngày</h3>
        <form
          className="formGrid"
          onSubmit={e => {
            e.preventDefault();
            create.mutate(undefined);
          }}
        >
          <Field label="Tên lịch">
            <input
              required
              minLength={2}
              value={form.name}
              onChange={e => update('name', e.target.value)}
            />
          </Field>
          <Field label="Tuyến">
            <select required value={form.routeId} onChange={e => update('routeId', e.target.value)}>
              <option value="">Chọn tuyến</option>
              {catalog.data?.routes
                .filter(r => r.active)
                .map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Từ ngày">
            <input
              type="date"
              required
              value={form.from}
              onChange={e => update('from', e.target.value)}
            />
          </Field>
          <Field label="Đến ngày">
            <input
              type="date"
              required
              min={form.from}
              value={form.to}
              onChange={e => update('to', e.target.value)}
            />
          </Field>
          <Field label="Bắt đầu">
            <input
              type="time"
              required
              value={form.startTime}
              onChange={e => update('startTime', e.target.value)}
            />
          </Field>
          <Field label="Kết thúc">
            <input
              type="time"
              required
              value={form.endTime}
              onChange={e => update('endTime', e.target.value)}
            />
          </Field>
          <Field label="Giãn cách (phút)">
            <input
              type="number"
              required
              min={5}
              max={1440}
              value={form.headway}
              onChange={e => update('headway', Number(e.target.value))}
            />
          </Field>
          <Field label="Thời lượng chuyến (phút)">
            <input
              type="number"
              required
              min={5}
              max={1440}
              value={form.duration}
              onChange={e => update('duration', Number(e.target.value))}
            />
          </Field>
          <Field label="Ngày trong tuần">
            <div className="row">
              {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d, i) => (
                <label key={d}>
                  <input
                    type="checkbox"
                    checked={form.weekdays.includes(i)}
                    onChange={e =>
                      update(
                        'weekdays',
                        e.target.checked
                          ? [...form.weekdays, i]
                          : form.weekdays.filter(x => x !== i)
                      )
                    }
                  />
                  {d}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Đội xe luân phiên">
            <div className="stack">
              {catalog.data?.vehicles
                .filter(v => v.active)
                .map(v => (
                  <label key={v.id}>
                    <input
                      type="checkbox"
                      checked={form.vehicleIds.includes(v.id)}
                      onChange={e =>
                        update(
                          'vehicleIds',
                          e.target.checked
                            ? [...form.vehicleIds, v.id]
                            : form.vehicleIds.filter(x => x !== v.id)
                        )
                      }
                    />
                    {v.plate}
                  </label>
                ))}
            </div>
          </Field>
          <Button disabled={create.isPending || !form.vehicleIds.length || !form.weekdays.length}>
            Sinh chuyến theo lịch
          </Button>
        </form>
        <ActionMessage action={create} />
        {result && <p role="status">{result}</p>}
        <ActionMessage action={remove} />
        <AsyncState query={list}>
          {list.data?.map(s => (
            <div className="between" key={s.id}>
              <p>
                {s.name} · {s.config.from} → {s.config.to} · {s.config.headway} phút/chuyến
              </p>
              <Button
                variant="secondary"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm('Hủy toàn bộ chuyến chưa có vé trong lịch này?'))
                    remove.mutate(s.id);
                }}
              >
                Hủy lịch
              </Button>
            </div>
          ))}
        </AsyncState>
      </Card>
    </>
  );
}
