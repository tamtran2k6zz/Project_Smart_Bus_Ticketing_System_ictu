import { useQuery } from '@tanstack/react-query';
import { Route, BusFront, CalendarDays, ArrowUpRight, Download, Radio, BadgeCheck } from 'lucide-react';
import { useSession } from '@/store/session.store';
import { operationsApi } from '@/features/operations/services/operations.api';
import { reportsApi } from '@/features/reports/services/reports.api';
import { defaultFilter } from '@/features/reports/components/Reports';
import { ReportStats, AdminRevenueChart } from '@/features/reports/components/ReportWidgets';
import { Card, PageTitle, Badge, Button, AsyncState, LinkButton, ActionMessage } from '@/components/ui/Ui';
import { Link } from 'react-router-dom';
import { can } from '@/configs/permissions';
import { dateTime } from '@/utils/format';
import { upcomingTrips } from '@/features/booking/utils/journey';
import { useAction } from '@/hooks/useAction';
import { exportReport } from '@/features/reports/services/export';
import { appConfig } from '@/configs/app.config';

export function Dashboard() {
  const user = useSession(s => s.user)!;
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: operationsApi.catalog });
  const report = useQuery({
    queryKey: ['dashboard-report', user.id],
    queryFn: () => reportsApi.get(user.id, defaultFilter()),
  });

  const exportAction = useAction(async (format: 'xlsx' | 'pdf') => {
    if (!report.data) throw new Error('Chưa có dữ liệu báo cáo để xuất.');
    await exportReport(report.data, defaultFilter(), format, appConfig.demo);
  }, 'Đã xuất file báo cáo doanh thu thành công.');

  const trips = catalog.data && upcomingTrips(catalog.data.trips).slice(0, 5);

  return (
    <>
      <PageTitle
        eyebrow="CỔNG ĐIỀU HÀNH SMARTBUS"
        title={'Xin chào, ' + user.name}
        description="Tổng quan chỉ số hoạt động, biểu đồ doanh thu và điều hành trực quan toàn bộ hệ thống xe buýt."
        action={
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              disabled={!report.data || exportAction.isPending}
              onClick={() => exportAction.mutate('xlsx')}
              style={{ fontSize: 13 }}
            >
              <Download size={15} /> Xuất Excel
            </Button>
            <Button
              variant="secondary"
              disabled={!report.data || exportAction.isPending}
              onClick={() => exportAction.mutate('pdf')}
              style={{ fontSize: 13 }}
            >
              <Download size={15} /> Xuất PDF
            </Button>
            <Badge tone="green">Đang kết nối</Badge>
          </div>
        }
      />

      <ActionMessage action={exportAction} />

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
              <small className="muted">Dữ liệu thời gian thực</small>
            </Card>
          );
        })}
      </div>

      <AsyncState query={report}>
        {report.data && (
          <div className="stack" style={{ gap: 20 }}>
            <ReportStats report={report.data} />
            <AdminRevenueChart
              report={report.data}
              onExportExcel={() => exportAction.mutate('xlsx')}
              onExportPdf={() => exportAction.mutate('pdf')}
            />
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
                  <strong style={{ fontSize: 13 }}>
                    {catalog.data?.routes.find(r => r.id === t.routeId)?.name}
                  </strong>
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                    {dateTime(t.departure)}
                  </p>
                </div>
                <Badge tone="neutral">{t.available} chỗ trống</Badge>
              </div>
            ))}
          </AsyncState>
        </Card>

        <Card>
          <h3>Thao tác điều hành nhanh</h3>
          <p className="muted">Truy cập nhanh các phân hệ nghiệp vụ quản trị.</p>
          <div className="stack" style={{ gap: 10 }}>
            {can(user, 'operations') && (
              <LinkButton secondary to="/admin/fleet">
                <Radio size={16} /> Giám sát toàn bộ xe buýt (Live Map)
              </LinkButton>
            )}
            {can(user, 'eligibility') && (
              <LinkButton secondary to="/admin/eligibility">
                <BadgeCheck size={16} /> Duyệt hồ sơ ưu đãi (Thẻ HSSV)
              </LinkButton>
            )}
            {can(user, 'reports') && (
              <LinkButton secondary to="/admin/reports">
                Báo cáo tài chính & đối soát hoàn tiền
              </LinkButton>
            )}
            {can(user, 'operations') && (
              <LinkButton secondary to="/admin/assignments">
                Phân công xe buýt & nhân sự
              </LinkButton>
            )}
            {can(user, 'check-in') && (
              <LinkButton secondary to="/staff/scan">
                Mở camera quét mã QR soát vé
              </LinkButton>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
