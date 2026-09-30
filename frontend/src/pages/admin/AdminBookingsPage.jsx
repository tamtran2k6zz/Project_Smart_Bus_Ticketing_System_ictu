import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Ticket,
  Bus,
  CreditCard,
  Search,
  RefreshCw,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  MapPin,
  User,
  Phone,
  QrCode,
  DollarSign,
  TrendingUp,
  X,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { adminBookingApi } from '../../api/adminBookingApi';

export const AdminBookingsPage = () => {
  // State
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filters & search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [routeFilter, setRouteFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [paginationInfo, setPaginationInfo] = useState({ totalItems: 0, totalPages: 1 });

  // Detail Modal
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [bookingsRes, statsRes] = await Promise.all([
        adminBookingApi.getBookings({
          search: searchTerm,
          status: statusFilter,
          paymentMethod: paymentFilter,
          routeCode: routeFilter,
          page: currentPage,
          limit: itemsPerPage,
        }),
        adminBookingApi.getStats(),
      ]);

      setBookings(bookingsRes.data.items);
      setPaginationInfo(bookingsRes.data.pagination);
      setStats(statsRes.data);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách giao dịch');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, paymentFilter, routeFilter, currentPage, itemsPerPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Format currency VND
  const formatVND = amount => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Format Date Time
  const formatDateTime = dateStr => {
    if (!dateStr) return '---';
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Copy code helper
  const handleCopy = (code, type) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(`${type}-${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Handle status update
  const handleStatusChange = async (bookingId, newStatus, reason) => {
    setIsUpdatingStatus(true);
    try {
      const res = await adminBookingApi.updateBookingStatus(bookingId, newStatus, reason);
      setSuccessMessage(res.message || 'Cập nhật trạng thái thành công');
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking(res.data);
      }
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể cập nhật trạng thái');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = ['Mã vé', 'Mã đơn', 'Hành khách', 'SĐT', 'Chuyến xe', 'Biển số', 'Số tiền', 'Phương thức', 'Trạng thái', 'Ngày tạo'];
    const rows = bookings.map(b => [
      b.ticketCode,
      b.bookingCode,
      `"${b.customer.name}"`,
      b.customer.phone,
      `"${b.trip.routeName}"`,
      b.trip.busPlate,
      b.totalAmount,
      b.paymentMethod,
      b.status,
      b.createdAt,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SmartBus_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status configuration mapping
  const statusConfig = useMemo(
    () => ({
      CONFIRMED: {
        label: 'Đã thanh toán',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        badgeDot: 'bg-emerald-500',
        icon: CheckCircle2,
      },
      PENDING: {
        label: 'Chờ thanh toán',
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        badgeDot: 'bg-amber-500',
        icon: Clock,
      },
      CANCELLED: {
        label: 'Đã hủy',
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        badgeDot: 'bg-slate-500',
        icon: XCircle,
      },
      REFUNDED: {
        label: 'Đã hoàn tiền',
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        badgeDot: 'bg-rose-500',
        icon: RotateCcw,
      },
    }),
    []
  );

  // Payment method badge styling
  const paymentMethodBadges = {
    VNPAY: { label: 'VNPay QR', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    MOMO: { label: 'MoMo', color: 'bg-pink-50 text-pink-700 border-pink-200' },
    ZALOPAY: { label: 'ZaloPay', color: 'bg-sky-50 text-sky-700 border-sky-200' },
    CASH: { label: 'Tiền mặt / POS', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-500/30">
              <CreditCard className="w-3.5 h-3.5" />
              US 06: Cổng thanh toán • Màn hình Quản trị
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Quản lý Giao dịch & Danh sách Vé đã đặt
            </h1>
            <p className="text-slate-300 text-sm mt-1.5 max-w-2xl">
              Theo dõi đối soát luồng thanh toán VNPay, MoMo, kiểm tra mã vé, chuyến xe buýt ICTU và trạng thái giao dịch thời gian thực.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="md"
              onClick={handleExportCSV}
              icon={Download}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/30"
            >
              Xuất CSV
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={loadData}
              icon={RefreshCw}
              isLoading={isLoading}
              className="bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20"
            >
              Làm mới
            </Button>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} />
      )}
      {successMessage && (
        <Alert
          type="success"
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tổng doanh thu đã nhận
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900" data-testid="kpi-revenue">
            {stats ? formatVND(stats.totalRevenue) : '0 ₫'}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Thanh toán thành công</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tổng vé đã thanh toán
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900" data-testid="kpi-tickets">
            {stats ? `${stats.totalTicketsSold} vé` : '0 vé'}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            {stats?.totalTransactions || 0} lượt giao dịch hệ thống
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Giao dịch chờ xử lý
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600" data-testid="kpi-pending">
            {stats ? `${stats.pendingCount} đơn` : '0 đơn'}
          </p>
          <span className="text-xs text-amber-700/80 mt-1 block">
            Đang chờ quét mã / OTP ngân hàng
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tỷ lệ thanh toán
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900" data-testid="kpi-success-rate">
            {stats ? `${stats.successRate}%` : '0%'}
          </p>
          <span className="text-xs text-purple-600 font-medium mt-1 block">
            {stats?.refundedCount || 0} vé hoàn tiền
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search box */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              data-testid="search-input"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo mã vé, chuyến xe, tên khách, SĐT..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Status filter */}
          <div className="md:col-span-2">
            <select
              data-testid="status-filter"
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-700"
            >
              <option value="ALL">Mọi trạng thái</option>
              <option value="CONFIRMED">Đã thanh toán</option>
              <option value="PENDING">Chờ thanh toán</option>
              <option value="CANCELLED">Đã hủy</option>
              <option value="REFUNDED">Đã hoàn tiền</option>
            </select>
          </div>

          {/* Payment method filter */}
          <div className="md:col-span-2">
            <select
              data-testid="payment-filter"
              value={paymentFilter}
              onChange={e => {
                setPaymentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-700"
            >
              <option value="ALL">Mọi cổng thanh toán</option>
              <option value="VNPAY">VNPay QR</option>
              <option value="MOMO">Ví MoMo</option>
              <option value="ZALOPAY">ZaloPay</option>
              <option value="CASH">Tiền mặt / POS</option>
            </select>
          </div>

          {/* Route filter */}
          <div className="md:col-span-3 flex items-center gap-2">
            <select
              data-testid="route-filter"
              value={routeFilter}
              onChange={e => {
                setRouteFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-700"
            >
              <option value="ALL">Tất cả tuyến xe ICTU</option>
              <option value="TUYEN-01">Tuyến 01: ICTU ⇄ Bến xe TN</option>
              <option value="TUYEN-02">Tuyến 02: KTX T1 ⇄ Bưu điện TN</option>
              <option value="TUYEN-03">Tuyến 03: ICTU ⇄ ĐH Sư Phạm</option>
              <option value="TUYEN-05">Tuyến 05: ICTU ⇄ BV Đa khoa</option>
            </select>

            {(searchTerm || statusFilter !== 'ALL' || paymentFilter !== 'ALL' || routeFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setPaymentFilter('ALL');
                  setRouteFilter('ALL');
                  setCurrentPage(1);
                }}
                className="text-xs text-red-600 hover:text-red-700 whitespace-nowrap"
                title="Xóa bộ lọc"
              >
                Đặt lại
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Data Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Bảng Dữ liệu Vé đặt & Giao dịch thanh toán
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              {paginationInfo.totalItems} bản ghi
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Hiển thị trang <strong className="text-slate-800">{paginationInfo.page}</strong> / {paginationInfo.totalPages}
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
            <LoadingSpinner size="lg" color="primary" />
            <span className="text-sm font-medium">Đang tải dữ liệu vé & giao dịch...</span>
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-base font-semibold text-slate-700">Không tìm thấy giao dịch nào</p>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Không có bản ghi nào phù hợp với điều kiện tìm kiếm và bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          /* Table - DoD: Hiển thị bảng dữ liệu vé đặt với các cột mã vé, chuyến xe, số tiền, trạng thái */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" data-testid="bookings-table">
              <thead>
                <tr className="bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <th scope="col" className="px-5 py-3.5">
                    Mã vé
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Chuyến xe
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Hành khách
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Số tiền
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Trạng thái
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {bookings.map(item => {
                  const currentStatus = statusConfig[item.status] || statusConfig.PENDING;
                  const StatusIcon = currentStatus.icon;
                  const pBadge = paymentMethodBadges[item.paymentMethod] || {
                    label: item.paymentMethod,
                    color: 'bg-slate-100 text-slate-700 border-slate-200',
                  };

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/40 transition-colors group"
                      data-testid={`booking-row-${item.id}`}
                    >
                      {/* Cột 1: Mã vé (DoD) */}
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                            <span data-testid={`ticket-code-${item.id}`}>{item.ticketCode}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.ticketCode, 'tck')}
                              className="text-slate-400 hover:text-blue-600 transition-colors"
                              title="Sao chép mã vé"
                              aria-label={`Sao chép mã vé ${item.ticketCode}`}
                            >
                              {copiedCode === `tck-${item.ticketCode}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            Đơn: {item.bookingCode}
                          </div>
                          <div className="inline-block text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            Ghế: {item.seats.join(', ')} ({item.quantity} vé)
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Chuyến xe (DoD) */}
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-1 max-w-xs">
                          <div
                            className="font-semibold text-slate-900 flex items-center gap-1.5"
                            data-testid={`trip-info-${item.id}`}
                          >
                            <Bus className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="line-clamp-1">{item.trip.routeName}</span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{item.trip.fromStop} → {item.trip.toStop}</span>
                          </div>
                          <div className="text-xs text-slate-600 flex items-center gap-2">
                            <span className="font-mono bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200 text-[11px]">
                              {item.trip.busPlate}
                            </span>
                            <span>•</span>
                            <span className="text-slate-500">
                              {formatDateTime(item.trip.departureTime)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 3: Hành khách */}
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-0.5">
                          <p className="font-medium text-slate-900">{item.customer.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {item.customer.phone}
                          </p>
                        </div>
                      </td>

                      {/* Cột 4: Số tiền (DoD) */}
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-1">
                          <p
                            className="text-base font-bold text-slate-900"
                            data-testid={`amount-${item.id}`}
                          >
                            {formatVND(item.totalAmount)}
                          </p>
                          <span
                            className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border ${pBadge.color}`}
                          >
                            {pBadge.label}
                          </span>
                        </div>
                      </td>

                      {/* Cột 5: Trạng thái (DoD) */}
                      <td className="px-5 py-4 align-top">
                        <div>
                          <span
                            data-testid={`status-${item.id}`}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${currentStatus.bg}`}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            {currentStatus.label}
                          </span>
                          <span className="block text-[11px] text-slate-400 mt-1">
                            {formatDateTime(item.createdAt)}
                          </span>
                        </div>
                      </td>

                      {/* Cột 6: Thao tác */}
                      <td className="px-5 py-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedBooking(item)}
                            icon={Eye}
                            aria-label={`Xem chi tiết vé ${item.ticketCode}`}
                            data-testid={`view-detail-btn-${item.id}`}
                          >
                            Chi tiết
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!isLoading && bookings.length > 0 && (
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Hiển thị <strong className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</strong> -{' '}
              <strong className="text-slate-800">
                {Math.min(currentPage * itemsPerPage, paginationInfo.totalItems)}
              </strong>{' '}
              trên tổng số <strong className="text-slate-800">{paginationInfo.totalItems}</strong> giao dịch
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                icon={ChevronLeft}
                aria-label="Trang trước"
              >
                Trước
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: paginationInfo.totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                      currentPage === p
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= paginationInfo.totalPages}
                onClick={() => setCurrentPage(p => Math.min(paginationInfo.totalPages, p + 1))}
                icon={ChevronRight}
                aria-label="Trang sau"
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Ticket className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold">Chi tiết Vé xe & Giao dịch Cổng thanh toán</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                aria-label="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Ticket Voucher Top Highlight */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-blue-700 uppercase">Mã vé điện tử</span>
                  <div className="text-2xl font-mono font-bold text-blue-900 flex items-center gap-2">
                    <span>{selectedBooking.ticketCode}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedBooking.ticketCode, 'detail-tck')}
                      className="text-blue-500 hover:text-blue-700"
                      title="Sao chép"
                    >
                      {copiedCode === `detail-tck-${selectedBooking.ticketCode}` ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-blue-700">Mã đơn đặt: {selectedBooking.bookingCode}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-white p-1.5 rounded-lg border border-blue-200 shadow-xs flex items-center justify-center">
                    <QrCode className="w-13 h-13 text-slate-800" />
                  </div>
                  <div className="text-right sm:text-left">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        statusConfig[selectedBooking.status]?.bg || 'bg-slate-100'
                      }`}
                    >
                      {statusConfig[selectedBooking.status]?.label}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">Xuất trình khi lên xe</p>
                  </div>
                </div>
              </div>

              {/* Trip Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Bus className="w-4 h-4 text-blue-600" />
                  Thông tin chuyến xe & Lộ trình di chuyển
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm">
                  <div className="font-bold text-slate-900 text-base">
                    {selectedBooking.trip.routeName}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/70 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block">Điểm đón khách:</span>
                      <strong className="text-slate-800">{selectedBooking.trip.fromStop}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Điểm trả khách:</span>
                      <strong className="text-slate-800">{selectedBooking.trip.toStop}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Thời gian khởi hành:</span>
                      <strong className="text-slate-800 font-mono">
                        {formatDateTime(selectedBooking.trip.departureTime)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Xe & Ghế đặt:</span>
                      <strong className="text-slate-800">
                        {selectedBooking.trip.busPlate} ({selectedBooking.trip.busType}) — Ghế:{' '}
                        <span className="text-blue-600 font-bold">
                          {selectedBooking.seats.join(', ')}
                        </span>
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  Chi tiết Cổng thanh toán (US 06)
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Cổng thanh toán:</span>
                    <span className="font-semibold text-slate-900">
                      {selectedBooking.paymentChannel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Mã giao dịch đối soát (TxnRef):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedBooking.transactionId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Thời điểm thanh toán:</span>
                    <span className="text-slate-800">
                      {formatDateTime(selectedBooking.paidAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-700">Tổng số tiền thanh toán:</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatVND(selectedBooking.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" />
                  Thông tin Hành khách
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block">Họ và tên:</span>
                    <strong className="text-slate-800 text-sm">{selectedBooking.customer.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Email:</span>
                    <strong className="text-slate-800">{selectedBooking.customer.email}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Số điện thoại:</span>
                    <strong className="text-slate-800">{selectedBooking.customer.phone}</strong>
                  </div>
                </div>
              </div>

              {/* Notes / Admin Audit */}
              {selectedBooking.notes && (
                <div className="text-xs bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block">Ghi chú đối soát hệ thống:</strong>
                    <span>{selectedBooking.notes}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {selectedBooking.status === 'PENDING' && (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isUpdatingStatus}
                    onClick={() =>
                      handleStatusChange(
                        selectedBooking.id,
                        'CONFIRMED',
                        'Admin duyệt thanh toán thủ công'
                      )
                    }
                    className="bg-emerald-600 hover:bg-emerald-700"
                    icon={CheckCircle2}
                  >
                    Duyệt thanh toán
                  </Button>
                )}

                {selectedBooking.status === 'CONFIRMED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdatingStatus}
                    onClick={() =>
                      handleStatusChange(
                        selectedBooking.id,
                        'REFUNDED',
                        'Khách hủy vé, hoàn tiền qua cổng thanh toán'
                      )
                    }
                    className="text-rose-600 border-rose-200 hover:bg-rose-50"
                    icon={RotateCcw}
                  >
                    Hoàn tiền (Refund)
                  </Button>
                )}

                {selectedBooking.status === 'PENDING' && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdatingStatus}
                    onClick={() =>
                      handleStatusChange(
                        selectedBooking.id,
                        'CANCELLED',
                        'Hết hạn thanh toán / Hủy yêu cầu'
                      )
                    }
                    className="text-slate-600 border-slate-300 hover:bg-slate-100"
                    icon={XCircle}
                  >
                    Hủy vé
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  icon={Ticket}
                >
                  In vé
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedBooking(null)}
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookingsPage;
