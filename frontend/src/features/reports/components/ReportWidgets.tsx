import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from 'recharts';
import { Card } from '@/components/ui/Ui';
import { money } from '@/utils/format';
import type { Report } from '../types';
export function ReportStats({ report }: { report: Report }) {
  return (
    <div className="grid3">
      <Card>
        <span className="muted">DOANH THU THUẦN</span>
        <p className="price">{money(report.revenue)}</p>
        <small className="muted">Gồm khoản đang chờ hoàn</small>
      </Card>
      <Card>
        <span className="muted">VÉ ĐANG CÓ HIỆU LỰC</span>
        <p className="price">{report.tickets}</p>
        <small className="muted">Không gồm vé đã hủy</small>
      </Card>
      <Card>
        <span className="muted">TỶ LỆ LẤP ĐẦY</span>
        <p className="price">{report.occupancy}%</p>
        <small className="muted">Số vé / tổng sức chứa trong kỳ</small>
      </Card>
    </div>
  );
}
export function RevenueChart({ report }: { report: Report }) {
  const data = Object.values(
    report.rows.reduce<Record<string, { date: string; revenue: number; tickets: number }>>(
      (acc, row) => {
        const current =
          acc[row.date] || (acc[row.date] = { date: row.date, revenue: 0, tickets: 0 });
        current.revenue += row.revenue;
        current.tickets += row.tickets;
        return acc;
      },
      {}
    )
  ).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <Card>
      <h3>Doanh thu theo ngày</h3>
      <p className="muted">
        Số liệu tính từ đặt vé trong dịch vụ. Chi tiết nằm trong bảng báo cáo.
      </p>
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ left: 5, right: 10, top: 15, bottom: 5 }}
            accessibilityLayer
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => String(v).slice(5)} />
            <YAxis tick={{ fontSize: 10 }} width={65} />
            <Tooltip formatter={value => money(Number(value))} />
            <Bar dataKey="revenue" name="Doanh thu" fill="#15803d" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
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
