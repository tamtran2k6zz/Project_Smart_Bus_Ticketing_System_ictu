import React, { useState, useEffect, useCallback } from 'react';
import {
  Ticket,
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  X,
  RefreshCw,
  QrCode,
  GraduationCap,
  Briefcase,
  User,
  AlertCircle,
  Calendar,
  Building,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import adminMonthlyTicketApi from '../../api/adminMonthlyTicketApi';

export const AdminMonthlyTicketsPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('ALL');

  // Modal State: Register Form
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register Form Data
  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    phone: '',
    email: '',
    faculty: 'Khoa Công nghệ Thông tin - K22',
    customerType: 'STUDENT', // STUDENT | FACULTY | STANDARD
    subscriptionType: 'SINGLE_ROUTE', // SINGLE_ROUTE | ALL_ROUTES
    routeCode: 'TUYEN-01',
    routeName: 'Tuyến số 01: Cổng ICTU ⇄ Bến xe Thái Nguyên',
    validMonth: '2026-10',
    paymentMethod: 'VNPAY',
    studentCardImage: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400',
    notes: 'Sinh viên đăng ký trực tuyến tại cổng ICTU',
  });

  // Modal State: Detail & Approval
  const [detailSubscription, setDetailSubscription] = useState(null);
  const [rejectModeOpen, setRejectModeOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [subRes, statsRes] = await Promise.all([
        adminMonthlyTicketApi.getSubscriptions({
          search: searchTerm,
          status: statusFilter,
          customerType: customerTypeFilter,
        }),
        adminMonthlyTicketApi.getStats(),
      ]);

      setSubscriptions(subRes.data.items);
      setStats(statsRes.data);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách vé tháng');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, customerTypeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Network reconnected listener
  useEffect(() => {
    const handleReconnected = () => loadData();
    window.addEventListener('app:network-reconnected', handleReconnected);
    return () => window.removeEventListener('app:network-reconnected', handleReconnected);
  }, [loadData]);

  // Handle Form Change with dynamic price preview
  const handleFormChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'routeCode') {
        if (value === 'TUYEN-01') updated.routeName = 'Tuyến số 01: Cổng ICTU ⇄ Bến xe Thái Nguyên';
        if (value === 'TUYEN-02') updated.routeName = 'Tuyến số 02: KTX T1 ⇄ Bưu điện TN';
        if (value === 'TUYEN-03') updated.routeName = 'Tuyến số 03: ICTU ⇄ ĐH Sư Phạm';
        if (value === 'TUYEN-05') updated.routeName = 'Tuyến số 05: Cổng ICTU ⇄ BV Đa khoa';
        if (value === 'ALL_ROUTES') updated.routeName = 'Vé liên tuyến: Toàn mạng lưới xe buýt ICTU';
      }
      if (field === 'subscriptionType' && value === 'ALL_ROUTES') {
        updated.routeCode = 'ALL_ROUTES';
        updated.routeName = 'Vé liên tuyến: Toàn mạng lưới xe buýt ICTU';
      }
      return updated;
    });
  };

  // Calculate estimated price
  const calculatePrice = () => {
    if (formData.customerType === 'STUDENT') {
      return formData.subscriptionType === 'ALL_ROUTES' ? 160000 : 100000;
    } else if (formData.customerType === 'FACULTY') {
      return formData.subscriptionType === 'ALL_ROUTES' ? 220000 : 150000;
    }
    return formData.subscriptionType === 'ALL_ROUTES' ? 300000 : 200000;
  };

  // Submit Online Registration Form
  const handleSubmitRegistration = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await adminMonthlyTicketApi.registerMonthlyTicket(formData);
      setSuccessMessage(res.message);
      setRegisterModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Đăng ký vé tháng không thành công');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approve Subscription
  const handleApprove = async subscription => {
    setIsProcessingApproval(true);
    try {
      const res = await adminMonthlyTicketApi.approveSubscription(subscription.id);
      setSuccessMessage(res.message);
      setDetailSubscription(res.data);
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể duyệt cấp vé tháng');
    } finally {
      setIsProcessingApproval(false);
    }
  };

  // Reject Subscription
  const handleReject = async () => {
    if (!detailSubscription) return;
    setIsProcessingApproval(true);
    try {
      const res = await adminMonthlyTicketApi.rejectSubscription(detailSubscription.id, {
        reason: rejectReason || 'Thông tin thẻ sinh viên hoặc ảnh chụp không hợp lệ',
      });
      setSuccessMessage(res.message);
      setDetailSubscription(res.data);
      setRejectModeOpen(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể từ chối hồ sơ');
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const formatVND = amount => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getCustomerTypeBadge = type => {
    if (type === 'STUDENT') {
      return {
        label: 'Sinh viên ICTU',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: GraduationCap,
      };
    }
    if (type === 'FACULTY') {
      return {
        label: 'Cán bộ Giảng viên',
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: Briefcase,
      };
    }
    return {
      label: 'Hành khách thường',
      color: 'bg-slate-100 text-slate-700 border-slate-300',
      icon: User,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-500/30">
              <Ticket className="w-3.5 h-3.5" />
              Vé tháng Sinh viên & Cán bộ • Web Admin
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Quản lý Đăng ký Vé tháng Trực tuyến
            </h1>
            <p className="text-slate-300 text-sm mt-1.5 max-w-2xl">
              Xét duyệt hồ sơ làm thẻ vé xe buýt tháng cho sinh viên ICTU (giảm 50% học phí đi lại), cấp mã thẻ QR điện tử và tiếp nhận đăng ký mới.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="md"
              onClick={loadData}
              icon={RefreshCw}
              isLoading={isLoading}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              Làm mới
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setRegisterModalOpen(true)}
              icon={Plus}
              data-testid="btn-open-register-modal"
              className="bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20"
            >
              Đăng ký vé tháng mới
            </Button>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMessage && (
        <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tổng số hồ sơ vé tháng
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900" data-testid="kpi-total-subscriptions">
            {stats?.totalCount ?? 0} hồ sơ
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Sinh viên & Giảng viên</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Chờ duyệt thẻ (Cần xử lý)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600" data-testid="kpi-pending-subscriptions">
            {stats?.pendingCount ?? 0} hồ sơ
          </p>
          <span className="text-xs text-amber-700/80 mt-1 block">Chờ xác thực thẻ sinh viên</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Đã duyệt & Đang sử dụng
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600" data-testid="kpi-active-subscriptions">
            {stats?.activeCount ?? 0} thẻ hoạt động
          </p>
          <span className="text-xs text-emerald-700 mt-1 block">Đã cấp mã thẻ QR</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Doanh thu vé tháng
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900" data-testid="kpi-monthly-revenue">
            {formatVND(stats?.totalRevenue ?? 0)}
          </p>
          <span className="text-xs text-purple-600 font-medium mt-1 block">Đã đối soát vào quỹ trường</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              data-testid="monthly-search-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên sinh viên, Mã SV, SĐT, Email..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Status filter */}
          <div className="md:col-span-4">
            <select
              data-testid="monthly-status-filter"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-700 font-medium"
            >
              <option value="ALL">Mọi trạng thái hồ sơ</option>
              <option value="PENDING">Chờ xét duyệt (PENDING)</option>
              <option value="ACTIVE">Đã kích hoạt thẻ (ACTIVE)</option>
              <option value="REJECTED">Bị từ chối (REJECTED)</option>
            </select>
          </div>

          {/* Customer type filter */}
          <div className="md:col-span-3">
            <select
              data-testid="monthly-type-filter"
              value={customerTypeFilter}
              onChange={e => setCustomerTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-700 font-medium"
            >
              <option value="ALL">Tất cả đối tượng</option>
              <option value="STUDENT">Sinh viên ICTU</option>
              <option value="FACULTY">Cán bộ Giảng viên</option>
              <option value="STANDARD">Khách ngoài</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
            <LoadingSpinner size="lg" color="primary" />
            <span className="text-sm font-medium">Đang tải danh sách đăng ký vé tháng...</span>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Ticket className="w-6 h-6" />
            </div>
            <p className="text-base font-semibold text-slate-700">Không tìm thấy hồ sơ vé tháng nào</p>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Không có hồ sơ nào phù hợp với điều kiện tìm kiếm và bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse" data-testid="monthly-tickets-table">
              <thead>
                <tr className="bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <th scope="col" className="px-5 py-3.5">Mã thẻ & QR</th>
                  <th scope="col" className="px-5 py-3.5">Người đăng ký</th>
                  <th scope="col" className="px-5 py-3.5">Tuyến & Thời hạn</th>
                  <th scope="col" className="px-5 py-3.5">Tiền vé & Thanh toán</th>
                  <th scope="col" className="px-5 py-3.5">Trạng thái hồ sơ</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {subscriptions.map(item => {
                  const badge = getCustomerTypeBadge(item.customerType);
                  const BadgeIcon = badge.icon;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/40 transition-colors"
                      data-testid={`subscription-row-${item.id}`}
                    >
                      {/* Cột 1: Mã thẻ & QR */}
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-1">
                          <span className="inline-block font-mono font-bold text-blue-700 text-xs px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                            {item.subscriptionCode}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                            <QrCode className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.qrCode}</span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Người đăng ký */}
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900 leading-tight">{item.fullName}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                              {item.studentId}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.2 rounded-full border ${badge.color}`}>
                              <BadgeIcon className="w-3 h-3" />
                              {badge.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{item.phone} • {item.email}</p>
                        </div>
                      </td>

                      {/* Cột 3: Tuyến & Thời hạn */}
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-800 text-xs">{item.routeName}</p>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Tháng {item.validMonth} ({item.startDate} → {item.endDate})</span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 4: Tiền vé & Thanh toán */}
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900">{formatVND(item.price)}</p>
                          <span
                            className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                              item.paymentStatus === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {item.paymentMethod} • {item.paymentStatus === 'PAID' ? 'Đã thu tiền' : 'Chưa thu tiền'}
                          </span>
                        </div>
                      </td>

                      {/* Cột 5: Trạng thái hồ sơ */}
                      <td className="px-5 py-4 align-top">
                        <span
                          data-testid={`status-${item.id}`}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            item.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : item.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {item.status === 'ACTIVE' && (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Đã kích hoạt thẻ
                            </>
                          )}
                          {item.status === 'PENDING' && (
                            <>
                              <Clock className="w-3.5 h-3.5" />
                              Chờ duyệt thẻ
                            </>
                          )}
                          {item.status === 'REJECTED' && (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              Bị từ chối
                            </>
                          )}
                        </span>
                      </td>

                      {/* Cột 6: Thao tác */}
                      <td className="px-5 py-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === 'PENDING' && (
                            <Button
                              variant="primary"
                              size="sm"
                              data-testid={`btn-quick-approve-${item.id}`}
                              onClick={() => handleApprove(item)}
                              icon={CheckCircle2}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs text-xs"
                            >
                              Duyệt thẻ
                            </Button>
                          )}

                          <Button
                            variant="secondary"
                            size="sm"
                            data-testid={`btn-view-subscription-${item.id}`}
                            onClick={() => {
                              setDetailSubscription(item);
                              setRejectModeOpen(false);
                            }}
                            icon={Eye}
                            aria-label={`Xem hồ sơ ${item.subscriptionCode}`}
                          >
                            Hồ sơ
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
      </div>

      {/* Modal 1: Form Đăng ký Vé tháng Trực tuyến */}
      {registerModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="monthly-register-modal"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold">Đăng ký Vé Xe Buýt Tháng Trực tuyến</h3>
              </div>
              <button
                type="button"
                onClick={() => setRegisterModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRegistration} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-blue-700 font-semibold block">Chính sách ưu đãi sinh viên ICTU</span>
                  <p className="text-xs text-blue-900 font-medium">Giảm ngay 50% giá vé tháng khi có thẻ sinh viên hợp lệ</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Số tiền tạm tính:</span>
                  <span className="text-lg font-bold text-blue-700 font-mono" data-testid="preview-price">
                    {formatVND(calculatePrice())}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên người đăng ký</label>
                  <input
                    type="text"
                    data-testid="input-full-name"
                    required
                    value={formData.fullName}
                    onChange={e => handleFormChange('fullName', e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mã sinh viên / Mã cán bộ</label>
                  <input
                    type="text"
                    data-testid="input-student-id"
                    required
                    value={formData.studentId}
                    onChange={e => handleFormChange('studentId', e.target.value)}
                    placeholder="DTC225..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại liên hệ</label>
                  <input
                    type="tel"
                    data-testid="input-phone"
                    required
                    value={formData.phone}
                    onChange={e => handleFormChange('phone', e.target.value)}
                    placeholder="0981 234 567"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email trường ICTU</label>
                  <input
                    type="email"
                    data-testid="input-email"
                    required
                    value={formData.email}
                    onChange={e => handleFormChange('email', e.target.value)}
                    placeholder="sv@ictu.edu.vn"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Đối tượng đăng ký</label>
                  <select
                    data-testid="select-customer-type"
                    value={formData.customerType}
                    onChange={e => handleFormChange('customerType', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="STUDENT">Sinh viên ICTU (Giảm 50% - 100.000đ/tháng)</option>
                    <option value="FACULTY">Cán bộ / Giảng viên ICTU (150.000đ/tháng)</option>
                    <option value="STANDARD">Khách ngoài trường (200.000đ/tháng)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loại thẻ vé tháng</label>
                  <select
                    data-testid="select-subscription-type"
                    value={formData.subscriptionType}
                    onChange={e => handleFormChange('subscriptionType', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="SINGLE_ROUTE">Tuyến cố định (Đi 1 tuyến đăng ký)</option>
                    <option value="ALL_ROUTES">Vé liên tuyến (Tất cả các tuyến buýt ICTU)</option>
                  </select>
                </div>
              </div>

              {formData.subscriptionType === 'SINGLE_ROUTE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tuyến xe đăng ký</label>
                  <select
                    data-testid="select-route"
                    value={formData.routeCode}
                    onChange={e => handleFormChange('routeCode', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TUYEN-01">Tuyến 01: Cổng ICTU ⇄ Bến xe TN</option>
                    <option value="TUYEN-02">Tuyến 02: KTX T1 ⇄ Bưu điện TN</option>
                    <option value="TUYEN-03">Tuyến 03: ICTU ⇄ ĐH Sư Phạm</option>
                    <option value="TUYEN-05">Tuyến 05: ICTU ⇄ BV Đa khoa</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tháng áp dụng</label>
                  <select
                    data-testid="select-month"
                    value={formData.validMonth}
                    onChange={e => handleFormChange('validMonth', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="2026-10">Tháng 10/2026</option>
                    <option value="2026-11">Tháng 11/2026</option>
                    <option value="2026-12">Tháng 12/2026</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cổng thanh toán</label>
                  <select
                    data-testid="select-payment-method"
                    value={formData.paymentMethod}
                    onChange={e => handleFormChange('paymentMethod', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="VNPAY">VNPay QR (Khuyên dùng)</option>
                    <option value="MOMO">Ví MoMo AutoPay</option>
                    <option value="CASH">Tiền mặt tại Văn phòng Quản lý vé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ảnh thẻ sinh viên / Minh chứng (Đường link ảnh hoặc tải lên)
                </label>
                <input
                  type="text"
                  data-testid="input-student-card-image"
                  value={formData.studentCardImage}
                  onChange={e => handleFormChange('studentCardImage', e.target.value)}
                  placeholder="https://... hoặc link ảnh thẻ"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setRegisterModalOpen(false)}
                >
                  Đóng
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  data-testid="btn-submit-monthly-registration"
                >
                  Xác nhận gửi đăng ký vé tháng
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Chi tiết hồ sơ & Duyệt cấp vé tháng */}
      {detailSubscription && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="subscription-detail-modal"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold">Chi tiết Hồ sơ Thẻ Vé Tháng Điện Tử</h3>
              </div>
              <button
                type="button"
                data-testid="btn-close-detail-modal"
                onClick={() => setDetailSubscription(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Thẻ vé tháng Preview Card */}
              <div className="bg-gradient-to-tr from-blue-700 via-indigo-700 to-blue-900 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-blue-200" />
                    <span className="font-bold tracking-tight text-sm">SMARTBUS ICTU • THẺ VÉ THÁNG</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider">
                    {detailSubscription.customerType === 'STUDENT' ? 'Sinh viên' : 'Cán bộ'}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-20 rounded-lg bg-white/10 border border-white/20 overflow-hidden shrink-0 flex items-center justify-center">
                    <img
                      src={detailSubscription.avatarUrl}
                      alt={detailSubscription.fullName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-bold leading-tight">{detailSubscription.fullName}</p>
                    <p className="text-xs text-blue-200 font-mono font-bold">Mã SV: {detailSubscription.studentId}</p>
                    <p className="text-xs text-blue-100">{detailSubscription.faculty}</p>
                    <p className="text-xs text-blue-200">Áp dụng: Tháng {detailSubscription.validMonth} ({detailSubscription.routeName})</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-mono">
                  <span>MÃ: {detailSubscription.subscriptionCode}</span>
                  <span>QR: {detailSubscription.qrCode}</span>
                </div>
              </div>

              {/* Thông tin xác minh thẻ sinh viên */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Minh chứng thẻ sinh viên đính kèm
                </h4>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-16 rounded bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                    <img
                      src={detailSubscription.studentCardImage}
                      alt="Thẻ sinh viên"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <p>Họ tên: <strong>{detailSubscription.fullName}</strong></p>
                    <p>Mã thẻ: <strong className="font-mono">{detailSubscription.studentId}</strong></p>
                    <p>SĐT: <strong>{detailSubscription.phone}</strong></p>
                    <p>Trạng thái thanh toán: <strong className="text-emerald-700">{detailSubscription.paymentStatus} ({formatVND(detailSubscription.price)})</strong></p>
                  </div>
                </div>
              </div>

              {/* Lý do từ chối nếu có */}
              {detailSubscription.rejectionReason && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Lý do từ chối trước đó:</strong>
                    <span>{detailSubscription.rejectionReason}</span>
                  </div>
                </div>
              )}

              {/* Sub-form nhập lý do từ chối */}
              {rejectModeOpen && (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Xác nhận từ chối hồ sơ vé tháng</span>
                  </div>
                  <input
                    type="text"
                    data-testid="input-reject-reason"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Nhập lý do từ chối (Ảnh mờ, thông tin không khớp)..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRejectModeOpen(false)}
                    >
                      Hủy
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      data-testid="btn-confirm-reject"
                      isLoading={isProcessingApproval}
                      onClick={handleReject}
                    >
                      Xác nhận Từ chối
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {detailSubscription.status === 'PENDING' && !rejectModeOpen && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      data-testid="btn-approve-subscription"
                      isLoading={isProcessingApproval}
                      onClick={() => handleApprove(detailSubscription)}
                      icon={CheckCircle2}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                    >
                      Duyệt cấp thẻ vé tháng
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid="btn-reject-subscription"
                      onClick={() => setRejectModeOpen(true)}
                      className="text-rose-600 border-rose-300 hover:bg-rose-50"
                      icon={XCircle}
                    >
                      Từ chối duyệt
                    </Button>
                  </>
                )}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDetailSubscription(null)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMonthlyTicketsPage;
