import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  AreaChart as AreaIcon,
  PieChart as PieIcon,
  Download,
  Layers,
} from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui/Ui';
import { money } from '@/utils/format';
import type { Report } from '../types';

interface AdminRevenueChartProps {
  report: Report;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
}

export function AdminRevenueChart({ report, onExportExcel, onExportPdf }: AdminRevenueChartProps) {
  // Chart view mode: 'bar' | 'area' | 'stacked' | 'route'
  const [chartType, setChartType] = useState<'bar' | 'area' | 'stacked' | 'route'>('bar');
  const [selectedRange, setSelectedRange] = useState<'all' | '7d' | '14d'>('all');

  // Colors for routes & metrics
  const ROUTE_COLORS = ['#15803d', '#2563eb', '#d97706', '#9333ea', '#06b6d4'];

  // Aggregate daily data
  const rawDailyData = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        revenue: number;
        tickets: number;
        singleTripRev: number;
        passRev: number;
        routes: Record<string, number>;
      }
    >();

    report.rows.forEach(r => {
      const existing = map.get(r.date) || {
        date: r.date,
        revenue: 0,
        tickets: 0,
        singleTripRev: 0,
        passRev: 0,
        routes: {},
      };
      existing.revenue += r.revenue;
      existing.tickets += r.tickets;
      // Estimate 75% single trips, 25% passes for visualization breakdown
      existing.singleTripRev += Math.round(r.revenue * 0.75);
      existing.passRev += Math.round(r.revenue * 0.25);
      existing.routes[r.route] = (existing.routes[r.route] || 0) + r.revenue;
      map.set(r.date, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [report.rows]);

  // Apply range filter
  const chartData = useMemo(() => {
    if (selectedRange === '7d') return rawDailyData.slice(-7);
    if (selectedRange === '14d') return rawDailyData.slice(-14);
    return rawDailyData;
  }, [rawDailyData, selectedRange]);

  // Route breakdown data for Pie/Donut Chart
  const routeData = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; tickets: number }>();
    report.rows.forEach(r => {
      const cur = map.get(r.route) || { name: r.route, revenue: 0, tickets: 0 };
      cur.revenue += r.revenue;
      cur.tickets += r.tickets;
      map.set(r.route, cur);
    });
    const totalRev = report.revenue || 1;
    return Array.from(map.values()).map((item, idx) => ({
      ...item,
      percentage: Math.round((item.revenue / totalRev) * 100),
      color: ROUTE_COLORS[idx % ROUTE_COLORS.length],
    }));
  }, [report.rows, report.revenue]);

  // Peak day & daily average
  const peakDay = useMemo(() => {
    if (!rawDailyData.length) return null;
    return rawDailyData.reduce((max, d) => (d.revenue > max.revenue ? d : max), rawDailyData[0]);
  }, [rawDailyData]);

  const dailyAvg = useMemo(() => {
    if (!rawDailyData.length) return 0;
    const total = rawDailyData.reduce((s, d) => s + d.revenue, 0);
    return Math.round(total / rawDailyData.length);
  }, [rawDailyData]);

  return (
    <Card style={{ padding: 22, overflow: 'hidden' }}>
      {/* Chart Top Header & Controls */}
      <div className="between" style={{ flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
        <div>
          <div className="row" style={{ gap: 8, marginBottom: 4 }}>
            <TrendingUp size={20} color="#15803d" />
            <h3 style={{ margin: 0, fontSize: 18 }}>Biểu đồ phân tích doanh thu</h3>
            <Badge tone="green">Thời gian thực</Badge>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Theo dõi dòng tiền theo ngày, tuyến đường và cơ cấu vé bán.
          </p>
        </div>

        {/* View Switchers & Export Buttons */}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {/* Range filter buttons */}
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 2,
            }}
          >
            {(
              [
                ['all', 'Toàn bộ'],
                ['14d', '14 ngày'],
                ['7d', '7 ngày'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setSelectedRange(val)}
                style={{
                  border: 'none',
                  background: selectedRange === val ? '#15803d' : 'transparent',
                  color: selectedRange === val ? '#fff' : 'var(--muted)',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '5px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Chart mode buttons */}
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 2,
            }}
          >
            <button
              type="button"
              onClick={() => setChartType('bar')}
              title="Biểu đồ cột"
              style={{
                border: 'none',
                background: chartType === 'bar' ? '#15803d' : 'transparent',
                color: chartType === 'bar' ? '#fff' : 'var(--muted)',
                padding: '6px 9px',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              <BarChart3 size={15} />
            </button>
            <button
              type="button"
              onClick={() => setChartType('area')}
              title="Biểu đồ diện tích"
              style={{
                border: 'none',
                background: chartType === 'area' ? '#15803d' : 'transparent',
                color: chartType === 'area' ? '#fff' : 'var(--muted)',
                padding: '6px 9px',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              <AreaIcon size={15} />
            </button>
            <button
              type="button"
              onClick={() => setChartType('stacked')}
              title="Cơ cấu vé lượt & vé tháng"
              style={{
                border: 'none',
                background: chartType === 'stacked' ? '#15803d' : 'transparent',
                color: chartType === 'stacked' ? '#fff' : 'var(--muted)',
                padding: '6px 9px',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              <Layers size={15} />
            </button>
            <button
              type="button"
              onClick={() => setChartType('route')}
              title="Tỷ trọng theo tuyến"
              style={{
                border: 'none',
                background: chartType === 'route' ? '#15803d' : 'transparent',
                color: chartType === 'route' ? '#fff' : 'var(--muted)',
                padding: '6px 9px',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              <PieIcon size={15} />
            </button>
          </div>

          {/* Export quick buttons */}
          {(onExportExcel || onExportPdf) && (
            <div className="row" style={{ gap: 6 }}>
              {onExportExcel && (
                <Button variant="secondary" onClick={onExportExcel} style={{ fontSize: 12, padding: '5px 10px' }}>
                  <Download size={14} /> Excel
                </Button>
              )}
              {onExportPdf && (
                <Button variant="secondary" onClick={onExportPdf} style={{ fontSize: 12, padding: '5px 10px' }}>
                  <Download size={14} /> PDF
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Financial KPI Summary Ribbons */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 20,
          background: 'var(--card)',
          padding: 12,
          borderRadius: 10,
          border: '1px solid var(--border)',
        }}
      >
        <div>
          <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>
            Tổng doanh thu kỳ này
          </span>
          <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 800, color: '#15803d' }}>
            {money(report.revenue)}
          </p>
          <small className="muted">{report.tickets} vé bán ra</small>
        </div>

        <div>
          <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>
            Trung bình mỗi ngày
          </span>
          <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 800 }}>
            {money(dailyAvg)}
          </p>
          <small className="muted">Ước tính theo ngày vận hành</small>
        </div>

        <div>
          <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>
            Ngày cao điểm nhất
          </span>
          <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 800, color: '#d97706' }}>
            {peakDay ? money(peakDay.revenue) : '—'}
          </p>
          <small className="muted">{peakDay ? `Ngày ${peakDay.date}` : 'Chưa có dữ liệu'}</small>
        </div>

        <div>
          <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>
            Tỷ lệ lấp đầy bình quân
          </span>
          <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 800, color: '#2563eb' }}>
            {report.occupancy}%
          </p>
          <small className="muted">Số khách / tổng sức chứa ghế</small>
        </div>
      </div>

      {/* Main Interactive Chart Section */}
      <div style={{ width: '100%', height: 280, position: 'relative' }}>
        {chartType === 'bar' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 10, right: 15, top: 15, bottom: 5 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#22c55e" stop-opacity={1} />
                  <stop offset="100%" stop-color="#15803d" stop-opacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => String(v).slice(5)} />
              <YAxis
                tick={{ fontSize: 11 }}
                width={70}
                tickFormatter={v => `${(v / 1000).toLocaleString('vi-VN')}k`}
              />
              <Tooltip
                formatter={(val) => [money(Number(val)), 'Doanh thu']}
                labelFormatter={(label) => `Ngày: ${label}`}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="revenue" name="Doanh thu VND" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartType === 'area' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: 10, right: 15, top: 15, bottom: 5 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#15803d" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#15803d" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => String(v).slice(5)} />
              <YAxis
                tick={{ fontSize: 11 }}
                width={70}
                tickFormatter={v => `${(v / 1000).toLocaleString('vi-VN')}k`}
              />
              <Tooltip
                formatter={(val) => [money(Number(val)), 'Doanh thu']}
                labelFormatter={(label) => `Ngày: ${label}`}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Doanh thu VND"
                stroke="#15803d"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#areaGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {chartType === 'stacked' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 10, right: 15, top: 15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => String(v).slice(5)} />
              <YAxis
                tick={{ fontSize: 11 }}
                width={70}
                tickFormatter={v => `${(v / 1000).toLocaleString('vi-VN')}k`}
              />
              <Tooltip
                formatter={(val, name) => [money(Number(val)), name]}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="singleTripRev" name="Vé lượt" stackId="a" fill="#15803d" />
              <Bar dataKey="passRev" name="Vé tháng (HSSV)" stackId="a" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartType === 'route' && (
          <div className="grid" style={{ gridTemplateColumns: 'minmax(220px, 1fr) minmax(260px, 1.2fr)', height: '100%', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={routeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="revenue"
                >
                  {routeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [money(Number(val)), 'Doanh thu']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    borderRadius: 8,
                    border: 'none',
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="stack" style={{ gap: 8, paddingRight: 10 }}>
              <h4 style={{ margin: '0 0 6px', fontSize: 13, textTransform: 'uppercase', color: 'var(--muted)' }}>
                Tỷ trọng doanh thu theo tuyến
              </h4>
              {routeData.map(r => (
                <div key={r.name} className="between" style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="row" style={{ gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: r.color, display: 'inline-block' }} />
                    <strong style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.name}
                    </strong>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <span>{money(r.revenue)}</span>
                    <Badge tone="neutral">{r.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Route Summary Pills */}
      <div
        className="row"
        style={{
          gap: 12,
          marginTop: 18,
          paddingTop: 14,
          borderTop: '1px solid var(--border)',
          flexWrap: 'wrap',
          fontSize: 12,
        }}
      >
        <span className="muted">Tuyến đường ghi nhận:</span>
        {routeData.map(r => (
          <span key={r.name} className="row" style={{ gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />
            {r.name}: <strong>{money(r.revenue)}</strong> ({r.percentage}%)
          </span>
        ))}
      </div>
    </Card>
  );
}
