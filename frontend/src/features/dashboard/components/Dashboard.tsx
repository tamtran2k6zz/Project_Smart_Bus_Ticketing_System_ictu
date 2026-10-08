import { useQuery } from '@tanstack/react-query';
import { Route, BusFront, CalendarDays, ArrowUpRight } from 'lucide-react';
import { useSession } from '@/store/session.store';
import { operationsApi } from '@/features/operations/services/operations.api';
import { reportsApi } from '@/features/reports/services/reports.api';
import { defaultFilter } from '@/features/reports/components/Reports';
import { ReportStats, RevenueChart } from '@/features/reports/components/ReportWidgets';
import { Card, PageTitle, Badge, AsyncState, LinkButton } from '@/components/ui/Ui';
import { Link } from 'react-router-dom';
import { can } from '@/configs/permissions';
import { dateTime } from '@/utils/format';
import { upcomingTrips } from '@/features/booking/utils/journey';
export function Dashboard() {
  const user = useSession(s => s.user)!;
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: operationsApi.catalog });
  const report = useQuery({
    queryKey: ['dashboard-report', user.id],
    queryFn: () => reportsApi.get(user.id, defaultFilter()),
  });
  const trips = catalog.data && upcomingTrips(catalog.data.trips).slice(0, 5);
  return (
    <>
      <PageTitle
        eyebrow="CỔNG ĐIỀU HÀNH SMARTBUS"
        title={'Xin chào, ' + user.name}
        description="Một góc nhìn chung về vận hành và hành trình của hành khách."
        action={<Badge>Ứng dụng demo</Badge>}
      />
      <div className="grid3" style={{ marginBottom: 22 }}>
        {[
          [Route, 'Tuyến đang hoạt động', catalog.data?.routes.filter(r => r.active).length],
          [BusFront, 'Xe trong danh mục', catalog.data?.vehicles.length],
          [CalendarDays, 'Chuyến trong danh mục', catalog.data?.trips.length],
        ].map(([Icon, label, value]) => {
          const I = Icon as typeof Route;
          return (
            <Card key={String(label)}>
              <div className="between">
                <span className="muted">{String(label)}</span>
                <I size={20} color="#15803d" />
              </div>
              <p className="price">{value === undefined ? '—' : String(value)}</p>
              <small className="muted">Dữ liệu cấu hình demo</small>
            </Card>
          );
        })}
      </div>
      <AsyncState query={report}>
        {report.data && (
          <div className="stack">
            <ReportStats report={report.data} />
            <RevenueChart report={report.data} />
          </div>
        )}
      </AsyncState>
      <div className="grid" style={{ marginTop: 22 }}>
        <Card>
          <div className="between">
            <h3>Chuyến sắp khởi hành</h3>
            {can(user, 'operations') && (
              <Link to="/admin/schedules">
                <ArrowUpRight size={18} />
              </Link>
            )}
          </div>
          <AsyncState query={catalog} empty={trips?.length === 0} emptyText="Chưa có lịch chạy">
            {trips?.map(t => (
              <div
                className="between"
                key={t.id}
                style={{ paddingBlock: 13, borderBottom: '1px solid var(--border)' }}
              >
                <div>
                  <strong style={{ fontSize: 12 }}>
                    {catalog.data?.routes.find(r => r.id === t.routeId)?.name}
                  </strong>
                  <p className="muted" style={{ margin: '5px 0 0' }}>
                    {dateTime(t.departure)}
                  </p>
                </div>
                <Badge tone="neutral">{t.available} chỗ</Badge>
              </div>
            ))}
          </AsyncState>
        </Card>
        <Card>
          <h3>Thao tác nhanh</h3>
          <p className="muted">Mở nghiệp vụ phù hợp với quyền tài khoản của bạn.</p>
          <div className="stack">
            {can(user, 'operations') && (
              <LinkButton secondary to="/admin/assignments">
                Phân công xe & nhân sự
              </LinkButton>
            )}
            {can(user, 'reports') && (
              <LinkButton secondary to="/admin/reports">
                Xem báo cáo & xuất file
              </LinkButton>
            )}
            {can(user, 'check-in') && (
              <LinkButton secondary to="/staff/scan">
                Mở màn hình soát vé
              </LinkButton>
            )}
            {can(user, 'support') && (
              <LinkButton secondary to="/admin/support">
                Xử lý phản ánh & yêu cầu vé
              </LinkButton>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
