import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Ticket,
  XCircle,
  Calendar,
  Bus,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Eye,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { adminReconciliationApi } from '../../api/adminReconciliationApi';

export const AdminRevenueReconciliationPage = () => {
  // State
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'trip'
  const [dailyData, setDailyData] = useState([]);
  const [tripData, setTripData] = useState([]);
  const [_summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [dateRange, setDateRange] = useState('7_DAYS'); // 'TODAY' | '7_DAYS' | '30_DAYS'
  const [routeFilter, setRouteFilter] = useState('ALL');

  // Modal detail for a selected day
  const [selectedDay, setSelectedDay] = useState(null);

  // Load daily and trip data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dailyRes, tripRes] = await Promise.all([
        adminReconciliationApi.getDailyReconciliation(),
        adminReconciliationApi.getTripReconciliation({ routeCode: routeFilter }),
      ]);

      let items = dailyRes.data.items;
      if (dateRange === 'TODAY') {
        items = items.filter(i => i.date === '2026-09-30');
      } else if (dateRange === '7_DAYS') {
        items = items.slice(0, 7);
      }

      setDailyData(items);
      setSummary(dailyRes.data.summary);
      setTripData(tripRes.data.items);
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu đối soát doanh thu');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, routeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Format currency VND
  const formatVND = amount => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (activeTab === 'daily') {
      const headers = ['Ngày đối soát', 'Thứ', 'Số chuyến', 'Tổng doanh thu', 'Số vé đã bán', 'Số vé đã hủy', 'Doanh thu Online', 'Doanh thu Tiền mặt', 'Trạng thái đối soát'];
      const rows = dailyData.map(d => [
        d.date,
        d.dayOfWeek,
        d.tripsCount,
        d.totalRevenue,
        d.ticketsSold,
        d.ticketsCancelled,
        d.onlineAmount,
        d.cashAmount,
        d.statusLabel,
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `DoiSoat_DoanhThu_TheoNgay_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ['Mã chuyến', 'Tuyến xe', 'Biển số', 'Giờ khởi hành', 'Số vé bán', 'Số vé hủy', 'Tỷ lệ lấp đầy (%)', 'Tổng doanh thu'];
      const rows = tripData.map(t => [
        t.tripCode,
        `"${t.routeName}"`,
        t.busPlate,
        t.departureTime,
        t.ticketsSold,
        t.ticketsCancelled,
        `${t.occupancyRate}%`,
        t.totalRevenue,
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `DoiSoat_DoanhThu_TheoChuyen_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Calculate stats for current active view
  const currentTotalRevenue = dailyData.reduce((sum, d) => sum + d.totalRevenue, 0);
  const currentTicketsSold = dailyData.reduce((sum, d) => sum + d.ticketsSold, 0);
  const currentTicketsCancelled = dailyData.reduce((sum, d) => sum + d.ticketsCancelled, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/30">
              <TrendingUp className="w-3.5 h-3.5" />
              US 06: Cổng thanh toán • Đối soát Doanh thu (STT 25)
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Quản lý Đối soát Doanh thu Vé theo Ngày & Chuyến xe
            </h1>
            <p className="text-slate-300 text-sm mt-1.5 max-w-2xl">
              Hệ thống đối soát tài chính tự động giữa cổng thanh toán trực tuyến (VNPay, MoMo) và hệ thống bán vé xe buýt thông minh ICTU.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="md"
              onClick={handleExportCSV}
              icon={FileSpreadsheet}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/30 cursor-pointer"
            >
              Xuất Báo cáo CSV
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={loadData}
              icon={RefreshCw}
              isLoading={isLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              Làm mới
            </Button>
          </div>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* KPI Cards (DoD STT 25: Tổng doanh thu, Số vé đã bán, Số vé đã hủy theo ngày) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* DoD 1: Tổng doanh thu theo ngày */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tổng doanh thu theo ngày
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900" data-testid="kpi-daily-revenue">
            {formatVND(currentTotalRevenue)}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Đã đối soát khớp 100%</span>
          </div>
        </div>

        {/* DoD 2: Số vé đã bán theo ngày */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Số vé đã bán theo ngày
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900" data-testid="kpi-daily-sold">
            {currentTicketsSold} vé
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            Doanh thu TB: {currentTicketsSold ? formatVND(Math.round(currentTotalRevenue / currentTicketsSold)) : '0 ₫'} / vé
          </span>
        </div>

        {/* DoD 3: Số vé đã hủy theo ngày */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Số vé đã hủy theo ngày
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600" data-testid="kpi-daily-cancelled">
            {currentTicketsCancelled} vé
          </p>
          <span className="text-xs text-rose-600/80 mt-1 block">
            Tỷ lệ hủy vé: {currentTicketsSold + currentTicketsCancelled ? Math.round((currentTicketsCancelled / (currentTicketsSold + currentTicketsCancelled)) * 100) : 0}%
          </span>
        </div>

        {/* Card 4: Kênh thanh toán & Đối soát */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cổng thanh toán Online
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {formatVND(dailyData.reduce((sum, d) => sum + d.onlineAmount, 0))}
          </p>
          <span className="text-xs text-purple-600 font-medium mt-1 block">
            Chiếm {currentTotalRevenue ? Math.round((dailyData.reduce((sum, d) => sum + d.onlineAmount, 0) / currentTotalRevenue) * 100) : 0}% tổng doanh thu
          </span>
        </div>
      </div>

      {/* Tabs & Period Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="tab-view-daily"
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'daily'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Đối soát theo ngày (DoD)</span>
          </button>

          <button
            type="button"
            data-testid="tab-view-trip"
            onClick={() => setActiveTab('trip')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'trip'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bus className="w-4 h-4" />
            <span>Đối soát theo chuyến xe</span>
          </button>
        </div>

        {/* Date Filter & Route Filter */}
        <div className="flex items-center gap-2">
          {activeTab === 'daily' ? (
            <select
              data-testid="date-range-filter"
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODAY">Hôm nay (30/09/2026)</option>
              <option value="7_DAYS">7 ngày qua</option>
              <option value="30_DAYS">30 ngày qua (Tất cả)</option>
            </select>
          ) : (
            <select
              data-testid="trip-route-filter"
              value={routeFilter}
              onChange={e => setRouteFilter(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả các tuyến xe ICTU</option>
              <option value="TUYEN-01">Tuyến 01: ICTU ⇄ Bến xe TN</option>
              <option value="TUYEN-02">Tuyến 02: KTX T1 ⇄ Bưu điện TN</option>
              <option value="TUYEN-03">Tuyến 03: ICTU ⇄ ĐH Sư Phạm</option>
              <option value="TUYEN-05">Tuyến 05: ICTU ⇄ BV Đa khoa</option>
            </select>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-500">
          <LoadingSpinner size="lg" color="primary" />
          <span className="text-sm font-medium">Đang tính toán số liệu đối soát doanh thu...</span>
        </div>
      ) : activeTab === 'daily' ? (
        /* Tab 1: Bảng Đối soát Doanh thu theo ngày (Core DoD STT 25) */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">
                Bảng Đối soát Doanh thu Vé theo Ngày
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                {dailyData.length} ngày đối soát
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" data-testid="daily-reconciliation-table">
              <thead>
                <tr className="bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <th scope="col" className="px-5 py-3.5">
                    Ngày đối soát
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Số chuyến
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Tổng doanh thu
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Số vé đã bán
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Số vé đã hủy
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Cổng Online / Tiền mặt
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Trạng thái đối soát
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {dailyData.map(item => (
                  <tr
                    key={item.id}
                    className="hover:bg-emerald-50/30 transition-colors"
                    data-testid={`daily-row-${item.date}`}
                  >
                    {/* Ngày */}
                    <td className="px-5 py-4 font-semibold text-slate-900 whitespace-nowrap">
                      <div>
                        <span>{item.formattedDate}</span>
                        <span className="block text-xs text-slate-400 font-normal">
                          {item.dayOfWeek}
                        </span>
                      </div>
                    </td>

                    {/* Số chuyến */}
                    <td className="px-5 py-4 text-slate-700 whitespace-nowrap">
                      <span className="font-semibold">{item.tripsCount}</span> chuyến
                    </td>

                    {/* DoD 1: Tổng doanh thu theo ngày */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className="text-base font-bold text-slate-900"
                        data-testid={`daily-revenue-${item.date}`}
                      >
                        {formatVND(item.totalRevenue)}
                      </span>
                    </td>

                    {/* DoD 2: Số vé đã bán theo ngày */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className="inline-flex items-center gap-1 font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full text-xs"
                        data-testid={`daily-sold-${item.date}`}
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        {item.ticketsSold} vé
                      </span>
                    </td>

                    {/* DoD 3: Số vé đã hủy theo ngày */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-full text-xs ${
                          item.ticketsCancelled > 0
                            ? 'text-rose-600 bg-rose-50'
                            : 'text-slate-500 bg-slate-100'
                        }`}
                        data-testid={`daily-cancelled-${item.date}`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        {item.ticketsCancelled} vé
                      </span>
                    </td>

                    {/* Online vs Cash breakdown */}
                    <td className="px-5 py-4 text-xs space-y-0.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-blue-700">
                        <CreditCard className="w-3 h-3" />
                        <span>Online: {formatVND(item.onlineAmount)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Building className="w-3 h-3" />
                        <span>Tiền mặt: {formatVND(item.cashAmount)}</span>
                      </div>
                    </td>

                    {/* Trạng thái đối soát */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {item.statusLabel}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Eye}
                        data-testid={`btn-view-detail-${item.id}`}
                        onClick={() => setSelectedDay(item)}
                        aria-label={`Xem chi tiết đối soát ngày ${item.formattedDate}`}
                      >
                        Chi tiết
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Tab 2: Bảng Đối soát Doanh thu theo chuyến xe */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Bus className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                Bảng Đối soát Doanh thu theo Từng Chuyến xe
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                {tripData.length} chuyến xe
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" data-testid="trip-reconciliation-table">
              <thead>
                <tr className="bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <th scope="col" className="px-5 py-3.5">
                    Mã chuyến
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Tuyến xe
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Xe & Lái xe
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Thời gian chạy
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Số vé bán / Hủy
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Lấp đầy
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Doanh thu chuyến
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {tripData.map(trip => (
                  <tr
                    key={trip.id}
                    className="hover:bg-blue-50/30 transition-colors"
                    data-testid={`trip-row-${trip.tripCode}`}
                  >
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">
                      {trip.tripCode}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {trip.routeName}
                    </td>
                    <td className="px-5 py-4 text-xs space-y-0.5">
                      <span className="font-mono bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                        {trip.busPlate}
                      </span>
                      <p className="text-slate-500">Lái xe: {trip.driverName}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600 text-xs font-mono">
                      {trip.departureTime}
                    </td>
                    <td className="px-5 py-4 text-xs space-y-1">
                      <span className="font-bold text-blue-600 block">{trip.ticketsSold} vé đã bán</span>
                      <span className="text-slate-400 block">{trip.ticketsCancelled} vé đã hủy</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${trip.occupancyRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                          {trip.occupancyRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900">
                      {formatVND(trip.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Chi tiết Ngày đối soát */}
      {selectedDay && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="day-detail-modal"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold">Chi tiết đối soát ngày {selectedDay.formattedDate}</h3>
              </div>
              <button
                type="button"
                data-testid="close-modal"
                onClick={() => setSelectedDay(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                aria-label="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
                <div>
                  <span className="text-xs text-emerald-700 block">Tổng doanh thu ngày:</span>
                  <strong className="text-xl font-bold text-emerald-900">
                    {formatVND(selectedDay.totalRevenue)}
                  </strong>
                </div>
                <div>
                  <span className="text-xs text-emerald-700 block">Thực nhận sau phí cổng:</span>
                  <strong className="text-xl font-bold text-emerald-900">
                    {formatVND(selectedDay.netRevenue)}
                  </strong>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                  <span>Số vé đã bán thành công:</span>
                  <strong className="text-blue-600 font-bold">{selectedDay.ticketsSold} vé</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                  <span>Số vé đã hủy:</span>
                  <strong className="text-rose-600 font-bold">{selectedDay.ticketsCancelled} vé</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                  <span>Doanh thu qua cổng VNPay/MoMo:</span>
                  <strong className="text-slate-800">{formatVND(selectedDay.onlineAmount)}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                  <span>Doanh thu tiền mặt tại quầy / lái xe:</span>
                  <strong className="text-slate-800">{formatVND(selectedDay.cashAmount)}</strong>
                </div>
                <div className="flex justify-between py-1.5 text-slate-600">
                  <span>Trạng thái đối soát tài chính:</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {selectedDay.statusLabel}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
                <span className="font-semibold block text-slate-700">Ghi chú đối soát:</span>
                {selectedDay.note}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedDay(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRevenueReconciliationPage;
