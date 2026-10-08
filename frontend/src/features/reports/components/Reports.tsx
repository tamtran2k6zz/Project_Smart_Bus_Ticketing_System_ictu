import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useSession } from '@/store/session.store';
import { useAction } from '@/hooks/useAction';
import { reportsApi, type ReportFilter } from '../services/reports.api';
import { exportReport } from '../services/export';
import { ReportStats, RevenueChart, OccupancyChart } from './ReportWidgets';
import { ticketsApi } from '@/features/tickets/services/tickets.api';
import { operationsApi } from '@/features/operations/services/operations.api';
import {
  Card,
  PageTitle,
  Button,
  Field,
  AsyncState,
  ActionMessage,
  Badge,
} from '@/components/ui/Ui';
import { localDay, money } from '@/utils/format';
import { appConfig } from '@/configs/app.config';
export const defaultFilter = (): ReportFilter => ({
  from: localDay(),
  to: localDay(new Date(Date.now() + 7 * 86400000)),
  routeId: '',
});
export function Reports() {
  const user = useSession(s => s.user)!;
  const [filter, setFilter] = useState<ReportFilter>(defaultFilter),
    [draft, setDraft] = useState(filter);
  const query = useQuery({
    queryKey: ['report', user.id, filter],
    queryFn: () => reportsApi.get(user.id, filter),
  });
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: operationsApi.catalog });
  const exportAction = useAction(async (format: 'xlsx' | 'pdf') => {
    if (!query.data) throw new Error('Chưa có báo cáo.');
    await exportReport(query.data, filter, format, appConfig.demo);
  }, 'Đã tạo file theo bộ lọc đang áp dụng.');
  const refund = useAction(
    (id: string) => ticketsApi.refund(id, user.id),
    'Đã xác nhận hoàn tiền demo.'
  );
  return (
    <>
      <PageTitle
        eyebrow="DỮ LIỆU ĐỂ ĐIỀU HÀNH"
        title="Báo cáo & doanh thu"
        description="Theo thời gian khởi hành và tuyến. Doanh thu thuần trừ khoản đã hoàn; khoản chờ hoàn vẫn được thể hiện."
        action={
          <div className="row">
            <Button
              variant="secondary"
              disabled={!query.data || exportAction.isPending}
              onClick={() => exportAction.mutate('xlsx')}
            >
              <Download size={16} />
              Excel
            </Button>
            <Button
              variant="secondary"
              disabled={!query.data || exportAction.isPending}
              onClick={() => exportAction.mutate('pdf')}
            >
              <Download size={16} />
              PDF
            </Button>
          </div>
        }
      />
      <Card>
        <form
          className="formGrid"
          onSubmit={e => {
            e.preventDefault();
            setFilter({ ...draft });
          }}
        >
          <Field label="Từ ngày">
            <input
              type="date"
              required
              value={draft.from}
              onChange={e => setDraft({ ...draft, from: e.target.value })}
            />
          </Field>
          <Field label="Đến ngày">
            <input
              type="date"
              required
              value={draft.to}
              min={draft.from}
              onChange={e => setDraft({ ...draft, to: e.target.value })}
            />
          </Field>
          <Field label="Tuyến xe">
            <select
              value={draft.routeId}
              onChange={e => setDraft({ ...draft, routeId: e.target.value })}
            >
              <option value="">Tất cả tuyến</option>
              {catalog.data?.routes.map(r => (
                <option value={r.id} key={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <div style={{ alignSelf: 'end' }}>
            <Button>Áp dụng bộ lọc</Button>
          </div>
        </form>
        <p className="muted">
          Đang áp dụng: {filter.from} → {filter.to} · {filter.routeId || 'Tất cả tuyến'}{' '}
          {appConfig.demo && '· Dữ liệu demo'}
        </p>
      </Card>
      <ActionMessage action={exportAction} />
      <AsyncState
        query={query}
        empty={query.data?.rows.length === 0}
        emptyText="Không có chuyến trong kỳ báo cáo"
      >
        {query.data && (
          <div className="stack" style={{ marginTop: 22 }}>
            <ReportStats report={query.data} />
            <div className="grid">
              <RevenueChart report={query.data} />
              <OccupancyChart report={query.data} />
            </div>
            <Card>
              <h3>Chi tiết theo ngày / tuyến</h3>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Tuyến</th>
                      <th>Doanh thu VND</th>
                      <th>Vé / sức chứa</th>
                      <th>Lấp đầy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.rows.map(r => (
                      <tr key={r.date + r.routeId}>
                        <td>{r.date}</td>
                        <td>{r.route}</td>
                        <td>{money(r.revenue)}</td>
                        <td>
                          {r.tickets} / {r.capacity}
                        </td>
                        <td>{r.occupancy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card>
              <h3>Trạng thái hoàn tiền</h3>
              <ActionMessage action={refund} />
              {!query.data.refunds.length ? (
                <p className="muted">Chưa có khoản hoàn trong kỳ.</p>
              ) : (
                query.data.refunds.map(r => (
                  <div
                    className="between"
                    key={r.id}
                    style={{ paddingBlock: 15, borderBottom: '1px solid var(--border)' }}
                  >
                    <div>
                      <small className="muted">{r.id}</small>
                      <p>
                        {money(r.total)}{' '}
                        <Badge tone={r.refund === 'pending' ? 'amber' : 'green'}>
                          {r.refund === 'pending' ? 'Chờ hoàn' : 'Đã hoàn demo'}
                        </Badge>
                      </p>
                    </div>
                    {r.refund === 'pending' && (
                      <Button
                        variant="secondary"
                        disabled={refund.isPending}
                        onClick={() => refund.mutate(r.id)}
                      >
                        Xác nhận hoàn demo
                      </Button>
                    )}
                  </div>
                ))
              )}
            </Card>
          </div>
        )}
      </AsyncState>
    </>
  );
}
