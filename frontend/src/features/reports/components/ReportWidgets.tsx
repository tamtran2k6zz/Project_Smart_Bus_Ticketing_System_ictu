import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card } from '@/components/ui/Ui';
import { money } from '@/utils/format';
import type { Report } from '../types';
import { AdminRevenueChart } from './AdminRevenueChart';

export { AdminRevenueChart };

export function ReportStats({ report }: { report: Report }) {
  return (
    <div className="grid3">
      <Card>
        <span className="muted">DOANH THU THUẦN</span>
        <p className="price" style={{ color: '#15803d' }}>{money(report.revenue)}</p>
        <small className="muted">Gồm khoản đang chờ hoàn</small>
      </Card>
      <Card>
        <span className="muted">VÉ ĐANG CÓ HIỆU LỰC</span>
        <p className="price">{report.tickets}</p>
        <small className="muted">Không gồm vé đã hủy</small>
      </Card>
      <Card>
        <span className="muted">TỶ LỆ LẤP ĐẦY</span>
        <p className="price" style={{ color: '#2563eb' }}>{report.occupancy}%</p>
        <small className="muted">Số vé / tổng sức chứa trong kỳ</small>
      </Card>
    </div>
  );
}

export function RevenueChart({
  report,
  onExportExcel,
  onExportPdf,
}: {
  report: Report;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
}) {
  return <AdminRevenueChart report={report} onExportExcel={onExportExcel} onExportPdf={onExportPdf} />;
}

export function OccupancyChart({ report }: { report: Report }) {
  return (
    <Card>
      <h3>Lấp đầy theo tuyến</h3>
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <LineChart data={report.rows} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="routeId" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Tooltip formatter={value => Number(value) + '%'} />
            <Line
              type="monotone"
              dataKey="occupancy"
              name="Lấp đầy"
              stroke="#15803d"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
