import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  Search,
  Bus,
  Gauge,
  MapPin,
  Clock,
  Phone,
  AlertTriangle,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import { trackingApi } from '../services/tracking.api';
import { operationsApi } from '@/features/operations/services/operations.api';
import { FleetMapAdapter } from './FleetMapAdapter';
import type { FleetBusStatus } from '../types';
import { PageTitle, Card, Badge, Button, AsyncState, Modal } from '@/components/ui/Ui';
import { dateTime } from '@/utils/format';

export function FleetMonitoring() {
  const [search, setSearch] = useState('');
  const [routeFilter, setRouteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBus, setSelectedBus] = useState<FleetBusStatus | null>(null);
  const [inspectingBus, setInspectingBus] = useState<FleetBusStatus | null>(null);

  // Auto-polling fleet data every 4 seconds for live dispatch effect
  const fleetQuery = useQuery({
    queryKey: ['fleet-live'],
    queryFn: trackingApi.fleet,
    refetchInterval: 4000,
  });

  const catalogQuery = useQuery({
    queryKey: ['catalog'],
    queryFn: operationsApi.catalog,
  });

  const buses = fleetQuery.data || [];
  const stops = catalogQuery.data?.stops || [];
  const routes = catalogQuery.data?.routes || [];

  // Filtered buses list
  const filteredBuses = useMemo(() => {
    return buses.filter(bus => {
      if (routeFilter !== 'all' && bus.routeId !== routeFilter) return false;
      if (statusFilter !== 'all' && bus.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchPlate = bus.plate.toLowerCase().includes(q);
        const matchDriver = bus.driverName?.toLowerCase().includes(q);
        const matchRoute = bus.routeName?.toLowerCase().includes(q);
        if (!matchPlate && !matchDriver && !matchRoute) return false;
      }
      return true;
    });
  }, [buses, routeFilter, statusFilter, search]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: buses.length,
      running: buses.filter(b => b.status === 'running').length,
      stopped: buses.filter(b => b.status === 'stopped').length,
      incident: buses.filter(b => b.status === 'incident').length,
      standby: buses.filter(b => b.status === 'standby').length,
      totalPassengers: buses.reduce((sum, b) => sum + b.passengerCount, 0),
    };
  }, [buses]);

  // Export fleet status to Excel
  const handleExportExcel = async () => {
    if (!buses.length) return;
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SmartBus Dispatch';

    const sheet = workbook.addWorksheet('Giam sat doi xe');
    sheet.addRow(['BÁO CÁO GIÁM SÁT TOÀN BỘ ĐỘI XE BUÝT THỜI GIAN THỰC']);
    sheet.addRow(['Thời điểm xuất:', new Date().toLocaleString('vi-VN')]);
    sheet.addRow([
      'Tổng số xe:',
      stats.total,
      'Đang chạy:',
      stats.running,
      'Dừng trạm:',
      stats.stopped,
      'Sự cố:',
      stats.incident,
    ]);
    sheet.addRow([]);
    sheet.addRow([
      'Biển số xe',
      'Tên phương tiện',
      'Tuyến hoạt động',
      'Tài xế phụ trách',
      'Số điện thoại',
      'Trạng thái',
      'Tốc độ (km/h)',
      'Trạm tiếp theo',
      'ETA (phút)',
      'Hành khách / Sức chứa',
      'Lấp đầy %',
      'Nhiệt độ xe',
      'Cảnh báo sự cố',
    ]);

    buses.forEach(b => {
      sheet.addRow([
        b.plate,
        b.name,
        b.routeName,
        b.driverName,
        b.driverPhone,
        b.status === 'running'
          ? 'Đang lăn bánh'
          : b.status === 'stopped'
            ? 'Dừng tại trạm'
            : b.status === 'incident'
              ? 'Sự cố / Kẹt xe'
              : 'Tạm dừng',
        b.speed,
        b.nextStop,
        b.etaMinutes,
        `${b.passengerCount}/${b.capacity}`,
        `${b.occupancyPercent}%`,
        `${b.tempCelsius}°C`,
        b.incidentAlert || 'Bình thường',
      ]);
    });

    sheet.columns.forEach((col, i) => {
      col.width = i === 2 ? 30 : i === 0 ? 16 : 18;
    });
    sheet.getRow(5).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartbus-fleet-monitoring-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Export fleet status to PDF
  const handleExportPdf = async () => {
    if (!buses.length) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('SmartBus · Báo cáo giám sát toàn bộ xe buýt', 14, 20);
    doc.setFontSize(10);
    doc.text(`Thời gian: ${new Date().toLocaleString('vi-VN')} | Tổng số xe: ${stats.total}`, 14, 28);
    doc.text(`Đang chạy: ${stats.running} | Dừng trạm: ${stats.stopped} | Cảnh báo sự cố: ${stats.incident}`, 14, 34);

    let y = 44;
    buses.forEach((b, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(
        `${idx + 1}. [${b.plate}] ${b.name} - Tuyến: ${b.routeName} | TX: ${b.driverName} | Tốc độ: ${b.speed} km/h | Trạm: ${b.nextStop} (ETA ${b.etaMinutes}p) | Khách: ${b.passengerCount}/${b.capacity} (${b.occupancyPercent}%)`,
        14,
        y
      );
      y += 8;
    });

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartbus-fleet-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const statusTone = (status: FleetBusStatus['status']) => {
    switch (status) {
      case 'running':
        return 'green';
      case 'stopped':
        return 'neutral';
      case 'incident':
        return 'red';
      default:
        return 'amber';
    }
  };

  const statusText = (status: FleetBusStatus['status']) => {
    switch (status) {
      case 'running':
        return 'Đang lăn bánh';
      case 'stopped':
        return 'Dừng tại trạm';
      case 'incident':
        return 'Cảnh báo sự cố';
      case 'standby':
        return 'Chờ xuất bến';
      default:
        return 'Ngoại tuyến';
    }
  };

  return (
    <>
      <PageTitle
        eyebrow="ĐIỀU HÀNH & GIÁM SÁT TRỰC TUYẾN"
        title="Giám sát toàn bộ xe buýt (Fleet Monitoring)"
        description="Bản đồ định vị GPS trực tiếp toàn bộ đội xe buýt, thông số vận hành và tình trạng giao thông trên tuyến."
        action={
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Badge tone="green">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#22c55e',
                  display: 'inline-block',
                  marginRight: 6,
                  boxShadow: '0 0 8px #22c55e',
                }}
              />
              Live GPS (4s)
            </Badge>

            <Button variant="secondary" onClick={handleExportExcel} style={{ fontSize: 13 }}>
              <Download size={14} /> Xuất Excel
            </Button>
            <Button variant="secondary" onClick={handleExportPdf} style={{ fontSize: 13 }}>
              <Download size={14} /> Xuất PDF
            </Button>
            <Button variant="secondary" onClick={() => fleetQuery.refetch()} style={{ fontSize: 13 }}>
              <RefreshCw size={14} /> Làm mới
            </Button>
          </div>
        }
      />

      {/* KPI Status Ribbon */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <Card style={{ padding: '14px 18px' }}>
          <span className="muted" style={{ fontSize: 12 }}>TỔNG ĐỘI XE</span>
          <p className="price" style={{ margin: '4px 0 2px' }}>{stats.total}</p>
          <small className="muted">{stats.totalPassengers} khách trên các xe</small>
        </Card>

        <Card style={{ padding: '14px 18px', borderLeft: '4px solid #22c55e' }}>
          <div className="between">
            <span className="muted" style={{ fontSize: 12 }}>ĐANG LĂN BÁNH</span>
            <Badge tone="green">{stats.running}</Badge>
          </div>
          <p className="price" style={{ margin: '4px 0 2px', color: '#15803d' }}>{stats.running}</p>
          <small className="muted">Tốc độ trung bình ~35 km/h</small>
        </Card>

        <Card style={{ padding: '14px 18px', borderLeft: '4px solid #3b82f6' }}>
          <div className="between">
            <span className="muted" style={{ fontSize: 12 }}>DỪNG ĐÓN TRẢ TRẠM</span>
            <Badge tone="neutral">{stats.stopped}</Badge>
          </div>
          <p className="price" style={{ margin: '4px 0 2px', color: '#2563eb' }}>{stats.stopped}</p>
          <small className="muted">Đang cập bến hoặc trả khách</small>
        </Card>

        <Card style={{ padding: '14px 18px', borderLeft: '4px solid #ef4444' }}>
          <div className="between">
            <span className="muted" style={{ fontSize: 12 }}>CẢNH BÁO SỰ CỐ</span>
            <Badge tone="red">{stats.incident}</Badge>
          </div>
          <p className="price" style={{ margin: '4px 0 2px', color: '#b91c1c' }}>{stats.incident}</p>
          <small className="muted">Ùn tắc / Cần hỗ trợ điều phối</small>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card style={{ padding: 16, marginBottom: 20 }}>
        <div
          className="grid"
          style={{ gridTemplateColumns: 'minmax(220px, 1.8fr) minmax(160px, 1fr) minmax(160px, 1fr)', gap: 14 }}
          data-responsive-grid
        >
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)', pointerEvents: 'none' }}>
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Tìm theo biển số (20B-...), tài xế, tuyến..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36, width: '100%' }}
            />
          </div>

          <div>
            <select
              value={routeFilter}
              onChange={e => setRouteFilter(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="all">Tất cả tuyến đường ({routes.length})</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>
                  Tuyến {r.code} - {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="all">Tất cả trạng thái vận hành</option>
              <option value="running">Đang lăn bánh</option>
              <option value="stopped">Dừng tại trạm</option>
              <option value="incident">Cảnh báo sự cố / Kẹt xe</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Split Layout: Interactive Map on Left, Fleet Bus Cards on Right */}
      <AsyncState query={fleetQuery}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
            gap: 20,
            alignItems: 'start',
          }}
          data-responsive-grid
        >
          {/* Left Column: Interactive Multi-Bus Fleet Map */}
          <div className="stack" style={{ gap: 14 }}>
            <Card style={{ padding: 14 }}>
              <div className="between" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div className="row" style={{ gap: 8 }}>
                  <Bus size={18} color="#15803d" />
                  <strong style={{ fontSize: 14 }}>Bản đồ vị trí đội xe trực tiếp</strong>
                </div>
                <div className="row" style={{ gap: 12, fontSize: 11, color: 'var(--muted)' }}>
                  <span className="row" style={{ gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} /> Lăn bánh
                  </span>
                  <span className="row" style={{ gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} /> Dừng trạm
                  </span>
                  <span className="row" style={{ gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /> Sự cố
                  </span>
                </div>
              </div>

              <FleetMapAdapter
                stops={stops}
                routes={routes}
                buses={filteredBuses}
                selectedBusId={selectedBus?.vehicleId}
                onSelectBus={bus => {
                  setSelectedBus(bus);
                  setInspectingBus(bus);
                }}
              />

              <div className="between" style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
                <span>Nhấp vào xe trên bản đồ để xem chi tiết khoang xe & thông số.</span>
                <span>Cập nhật lúc: {dateTime(new Date().toISOString())}</span>
              </div>
            </Card>
          </div>

          {/* Right Column: Fleet List Cards */}
          <div className="stack" style={{ gap: 14, maxHeight: 680, overflowY: 'auto', paddingRight: 4 }}>
            <div className="between">
              <h3 style={{ margin: 0, fontSize: 16 }}>
                Danh sách phương tiện ({filteredBuses.length})
              </h3>
              <small className="muted">Hiển thị {filteredBuses.length} / {buses.length} xe</small>
            </div>

            {filteredBuses.length === 0 ? (
              <Card>
                <p className="muted" style={{ textAlign: 'center', margin: 20 }}>
                  Không tìm thấy xe buýt nào phù hợp bộ lọc.
                </p>
              </Card>
            ) : (
              filteredBuses.map(bus => {
                const isSelected = selectedBus?.vehicleId === bus.vehicleId;

                return (
                  <Card
                    key={bus.vehicleId}
                    style={{
                      border: isSelected ? '2px solid #15803d' : '1px solid var(--border)',
                      boxShadow: isSelected ? '0 4px 15px rgba(21, 128, 61, 0.15)' : undefined,
                      padding: 16,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div className="between" style={{ alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div className="row" style={{ gap: 8 }}>
                          <span
                            style={{
                              background: '#0f172a',
                              color: '#fff',
                              fontWeight: 800,
                              fontSize: 12,
                              padding: '2px 8px',
                              borderRadius: 4,
                              letterSpacing: 0.5,
                            }}
                          >
                            {bus.plate}
                          </span>
                          <strong style={{ fontSize: 14 }}>{bus.name}</strong>
                        </div>
                        <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                          {bus.routeName}
                        </p>
                      </div>

                      <Badge tone={statusTone(bus.status)}>
                        {statusText(bus.status)}
                      </Badge>
                    </div>

                    {/* Incident banner if any */}
                    {bus.incidentAlert && (
                      <div
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: 6,
                          padding: '6px 10px',
                          color: '#b91c1c',
                          fontSize: 12,
                          margin: '8px 0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <AlertTriangle size={14} />
                        <span>{bus.incidentAlert}</span>
                      </div>
                    )}

                    {/* Operational Metrics Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 8,
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        margin: '10px 0',
                        fontSize: 12,
                      }}
                    >
                      <div className="row" style={{ gap: 6 }}>
                        <Gauge size={14} color="#15803d" />
                        <span>Tốc độ: <strong>{bus.speed} km/h</strong></span>
                      </div>

                      <div className="row" style={{ gap: 6 }}>
                        <Clock size={14} color="#15803d" />
                        <span>ETA trạm: <strong>{bus.etaMinutes} phút</strong></span>
                      </div>

                      <div className="row" style={{ gap: 6, gridColumn: 'span 2' }}>
                        <MapPin size={14} color="#15803d" />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Trạm tới: <strong>{bus.nextStop}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Passenger Occupancy Bar */}
                    <div style={{ marginBottom: 12 }}>
                      <div className="between" style={{ fontSize: 11, marginBottom: 4 }}>
                        <span className="muted">
                          Hành khách: <strong>{bus.passengerCount} / {bus.capacity}</strong>
                        </span>
                        <strong style={{ color: bus.occupancyPercent > 80 ? '#d97706' : '#15803d' }}>
                          {bus.occupancyPercent}% lấp đầy
                        </strong>
                      </div>
                      <div
                        style={{
                          height: 6,
                          background: 'var(--border)',
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${bus.occupancyPercent}%`,
                            background:
                              bus.occupancyPercent > 80
                                ? '#d97706'
                                : bus.occupancyPercent > 50
                                  ? '#15803d'
                                  : '#3b82f6',
                            borderRadius: 3,
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="row" style={{ gap: 8 }}>
                      <Button
                        variant={isSelected ? 'primary' : 'secondary'}
                        onClick={() => setSelectedBus(bus)}
                        style={{ fontSize: 12, padding: '5px 12px', flex: 1 }}
                      >
                        <MapPin size={13} /> {isSelected ? 'Đang định vị' : 'Định vị bản đồ'}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setInspectingBus(bus)}
                        style={{ fontSize: 12, padding: '5px 12px' }}
                      >
                        <Maximize2 size={13} /> Chi tiết xe
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </AsyncState>

      {/* Modal: Thông tin chi tiết xe buýt & điều phối */}
      <Modal
        open={!!inspectingBus}
        onClose={() => setInspectingBus(null)}
        title={`Chi tiết vận hành · Xe buýt ${inspectingBus?.plate || ''}`}
      >
        {inspectingBus && (
          <div className="stack" style={{ gap: 16 }}>
            {/* Header info card */}
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div className="between" style={{ marginBottom: 10 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{inspectingBus.name}</h3>
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                    Biển số: <strong>{inspectingBus.plate}</strong> · Tuyến: <strong>{inspectingBus.routeName}</strong>
                  </p>
                </div>
                <Badge tone={statusTone(inspectingBus.status)}>
                  {statusText(inspectingBus.status)}
                </Badge>
              </div>

              {/* Grid of live sensor data */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 12,
                  marginTop: 14,
                  fontSize: 13,
                }}
              >
                <div style={{ background: 'var(--background)', padding: 10, borderRadius: 8 }}>
                  <span className="muted" style={{ fontSize: 11 }}>TỐC ĐỘ HIỆN TẠI</span>
                  <p style={{ margin: '4px 0 0', fontWeight: 800, fontSize: 16, color: '#15803d' }}>
                    {inspectingBus.speed} km/h
                  </p>
                </div>

                <div style={{ background: 'var(--background)', padding: 10, borderRadius: 8 }}>
                  <span className="muted" style={{ fontSize: 11 }}>HÀNH KHÁCH / GHẾ</span>
                  <p style={{ margin: '4px 0 0', fontWeight: 800, fontSize: 16 }}>
                    {inspectingBus.passengerCount} / {inspectingBus.capacity}
                  </p>
                </div>

                <div style={{ background: 'var(--background)', padding: 10, borderRadius: 8 }}>
                  <span className="muted" style={{ fontSize: 11 }}>NHIỆT ĐỘ KHOANG</span>
                  <p style={{ margin: '4px 0 0', fontWeight: 800, fontSize: 16, color: '#0284c7' }}>
                    {inspectingBus.tempCelsius}°C (Điều hòa BẬT)
                  </p>
                </div>

                <div style={{ background: 'var(--background)', padding: 10, borderRadius: 8 }}>
                  <span className="muted" style={{ fontSize: 11 }}>NHIÊN LIỆU / PIN</span>
                  <p style={{ margin: '4px 0 0', fontWeight: 800, fontSize: 16, color: '#16a34a' }}>
                    {inspectingBus.fuelOrBattery}%
                  </p>
                </div>
              </div>
            </div>

            {/* Driver & Contact Information */}
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 16,
              }}
            >
              <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>Thông tin nhân sự điều khiển:</h4>
              <div className="between" style={{ flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                    Tài xế: {inspectingBus.driverName}
                  </p>
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                    Số điện thoại liên hệ: <strong>{inspectingBus.driverPhone}</strong>
                  </p>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <a
                    href={`tel:${inspectingBus.driverPhone}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#15803d',
                      color: '#fff',
                      padding: '8px 14px',
                      borderRadius: 6,
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <Phone size={14} /> Gọi cho tài xế
                  </a>
                </div>
              </div>
            </div>

            {/* Next Stop and Journey Info */}
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 16,
                fontSize: 13,
              }}
            >
              <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>Hành trình và trạm dừng:</h4>
              <p style={{ margin: '0 0 6px' }}>
                Trạm kế tiếp: <strong>{inspectingBus.nextStop}</strong> (Dự kiến đến sau {inspectingBus.etaMinutes} phút)
              </p>
              <p className="muted" style={{ margin: 0 }}>
                Tọa độ GPS hiện tại: {inspectingBus.lat.toFixed(5)}, {inspectingBus.lng.toFixed(5)} · Hướng di chuyển: {inspectingBus.heading}°
              </p>
            </div>

            {/* Dispatch Actions */}
            <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedBus(inspectingBus);
                  setInspectingBus(null);
                }}
              >
                <MapPin size={14} /> Xem trên bản đồ lớn
              </Button>
              <Button variant="secondary" onClick={() => setInspectingBus(null)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
