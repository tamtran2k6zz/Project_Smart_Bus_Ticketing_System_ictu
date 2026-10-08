import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Bus,
  Plus,
  Search,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Edit2,
  Trash2,
  X,
  Users,
  RefreshCw,
  Phone,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import adminScheduleApi from '../../api/adminScheduleApi';

export const AdminSchedulesPage = () => {
  const [schedules, setSchedules] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [routeFilter, setRouteFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State for Create / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    tripCode: '',
    routeCode: 'TUYEN-01',
    routeName: 'Tuyến số 01: Cổng ICTU ⇄ Bến xe Thái Nguyên',
    fromStop: 'Cổng chính ICTU (Quyết Thắng)',
    toStop: 'Bến xe Trung tâm Thái Nguyên',
    busPlate: '20B-123.45',
    busType: 'Xe điện EcoBus 29 chỗ',
    driverName: 'Nguyễn Văn An',
    driverPhone: '0912 345 678',
    departureTime: '06:30',
    arrivalTime: '07:15',
    frequencyMinutes: 20,
    totalSeats: 29,
    unitPrice: 15000,
    status: 'ACTIVE',
    notes: '',
  });

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [schedRes, statsRes] = await Promise.all([
        adminScheduleApi.getSchedules({
          search: searchTerm,
          routeCode: routeFilter,
          status: statusFilter,
        }),
        adminScheduleApi.getStats(),
      ]);

      setSchedules(schedRes.data.items);
      setStats(statsRes.data);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách lịch trình');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, routeFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Network reconnected listener
  useEffect(() => {
    const handleReconnected = () => loadData();
    window.addEventListener('app:network-reconnected', handleReconnected);
    return () => window.removeEventListener('app:network-reconnected', handleReconnected);
  }, [loadData]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingSchedule(null);
    setFormData({
      tripCode: `SCH-ICTU-0${Math.floor(10 + Math.random() * 89)}`,
      routeCode: 'TUYEN-01',
      routeName: 'Tuyến số 01: Cổng ICTU ⇄ Bến xe Thái Nguyên',
      fromStop: 'Cổng chính ICTU (Quyết Thắng)',
      toStop: 'Bến xe Trung tâm Thái Nguyên',
      busPlate: '20B-123.45',
      busType: 'Xe điện EcoBus 29 chỗ',
      driverName: 'Nguyễn Văn An',
      driverPhone: '0912 345 678',
      departureTime: '07:00',
      arrivalTime: '07:45',
      frequencyMinutes: 20,
      totalSeats: 29,
      unitPrice: 15000,
      status: 'ACTIVE',
      notes: 'Lịch trình xuất bến cố định trong ngày',
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = schedule => {
    setEditingSchedule(schedule);
    setFormData({
      tripCode: schedule.tripCode,
      routeCode: schedule.routeCode,
      routeName: schedule.routeName,
      fromStop: schedule.fromStop,
      toStop: schedule.toStop,
      busPlate: schedule.busPlate,
      busType: schedule.busType,
      driverName: schedule.driverName,
      driverPhone: schedule.driverPhone,
      departureTime: schedule.departureTime,
      arrivalTime: schedule.arrivalTime,
      frequencyMinutes: schedule.frequencyMinutes,
      totalSeats: schedule.totalSeats,
      unitPrice: schedule.unitPrice,
      status: schedule.status,
      notes: schedule.notes || '',
    });
    setModalOpen(true);
  };

  // Handle Form Change
  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'routeCode') {
        if (value === 'TUYEN-01') {
          updated.routeName = 'Tuyến số 01: Cổng ICTU ⇄ Bến xe Thái Nguyên';
          updated.fromStop = 'Cổng chính ICTU (Quyết Thắng)';
          updated.toStop = 'Bến xe Trung tâm Thái Nguyên';
        } else if (value === 'TUYEN-02') {
          updated.routeName = 'Tuyến số 02: Ký túc xá T1 ⇄ Trung tâm TP Thái Nguyên';
          updated.fromStop = 'Ký túc xá T1 ICTU';
          updated.toStop = 'Bưu điện tỉnh Thái Nguyên';
        } else if (value === 'TUYEN-03') {
          updated.routeName = 'Tuyến số 03: ICTU ⇄ Ký túc xá ĐH Sư Phạm';
          updated.fromStop = 'Cổng phụ ICTU (Đường Z115)';
          updated.toStop = 'Ký túc xá ĐH Sư Phạm';
        } else if (value === 'TUYEN-05') {
          updated.routeName = 'Tuyến số 05: Cổng ICTU ⇄ BV Đa khoa Thái Nguyên';
          updated.fromStop = 'Cổng chính ICTU';
          updated.toStop = 'Bệnh viện Đa khoa Trung ương Thái Nguyên';
        }
      }
      return updated;
    });
  };

  // Submit Create or Update
  const handleSubmit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (editingSchedule) {
        const res = await adminScheduleApi.updateSchedule(editingSchedule.id, formData);
        setSuccessMessage(res.message);
      } else {
        const res = await adminScheduleApi.createSchedule(formData);
        setSuccessMessage(res.message);
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Thao tác không thành công');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async schedule => {
    const nextStatus = schedule.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await adminScheduleApi.toggleScheduleStatus(schedule.id, nextStatus);
      setSuccessMessage(res.message);
      await loadData();
    } catch (err) {
      setError(err.message || 'Không thể đổi trạng thái lịch trình');
    }
  };

  // Delete Schedule
  const handleDelete = async schedule => {
    if (window.confirm(`Bạn có chắc muốn xóa lịch trình ${schedule.tripCode}?`)) {
      try {
        const res = await adminScheduleApi.deleteSchedule(schedule.id);
        setSuccessMessage(res.message);
        await loadData();
      } catch (err) {
        setError(err.message || 'Không thể xóa lịch trình');
      }
    }
  };

  const formatVND = amount => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-500/30">
              <Calendar className="w-3.5 h-3.5" />
              Điều phối Xe Buýt • Web Admin
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Quản lý Lịch trình chạy xe buýt ICTU
            </h1>
            <p className="text-slate-300 text-sm mt-1.5 max-w-2xl">
              Cấu hình các khung giờ xuất bến, gán tài xế & phương tiện xe điện EcoBus phục vụ sinh viên và cán bộ giảng viên.
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
              onClick={handleOpenCreateModal}
              icon={Plus}
              data-testid="btn-create-schedule"
              className="bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20"
            >
              Thêm Lịch trình mới
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
              Tổng số lịch trình
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900" data-testid="kpi-total-schedules">
            {stats?.totalSchedules ?? 0} chuyến/ngày
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Toàn bộ 4 tuyến chính</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Đang hoạt động
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600" data-testid="kpi-active-schedules">
            {stats?.activeCount ?? 0} chuyến
          </p>
          <span className="text-xs text-emerald-700/80 mt-1 block">Sẵn sàng nhận khách</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Xe buýt điều phối
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Bus className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {stats?.uniqueBuses ?? 0} xe
          </p>
          <span className="text-xs text-indigo-600 font-medium mt-1 block">EcoBus 29 & CNG 45 chỗ</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Đội ngũ tài xế
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {stats?.uniqueDrivers ?? 0} tài xế
          </p>
          <span className="text-xs text-purple-600 font-medium mt-1 block">Đã phân công trực ca</span>
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
              data-testid="schedule-search-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã chuyến, tài xế, biển số xe..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Route filter */}
          <div className="md:col-span-4">
            <select
              data-testid="schedule-route-filter"
              value={routeFilter}
              onChange={e => setRouteFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-700 font-medium"
            >
              <option value="ALL">Mọi tuyến xe buýt ICTU</option>
              <option value="TUYEN-01">Tuyến 01: Cổng ICTU ⇄ Bến xe TN</option>
              <option value="TUYEN-02">Tuyến 02: KTX T1 ⇄ Bưu điện TN</option>
              <option value="TUYEN-03">Tuyến 03: ICTU ⇄ ĐH Sư Phạm</option>
              <option value="TUYEN-05">Tuyến 05: ICTU ⇄ BV Đa khoa</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="md:col-span-3">
            <select
              data-testid="schedule-status-filter"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-700 font-medium"
            >
              <option value="ALL">Mọi trạng thái lịch trình</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="SUSPENDED">Tạm ngưng</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
            <LoadingSpinner size="lg" color="primary" />
            <span className="text-sm font-medium">Đang tải danh sách lịch trình chạy xe...</span>
          </div>
        ) : schedules.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-base font-semibold text-slate-700">Không tìm thấy lịch trình nào</p>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Không có chuyến xe nào khớp với điều kiện lọc hiện tại.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse" data-testid="schedules-table">
              <thead>
                <tr className="bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <th scope="col" className="px-5 py-3.5">Mã chuyến & Tuyến</th>
                  <th scope="col" className="px-5 py-3.5">Phương tiện & Tài xế</th>
                  <th scope="col" className="px-5 py-3.5">Giờ chạy & Tần suất</th>
                  <th scope="col" className="px-5 py-3.5">Ghế & Giá vé</th>
                  <th scope="col" className="px-5 py-3.5">Trạng thái</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {schedules.map(item => (
                  <tr key={item.id} className="hover:bg-blue-50/40 transition-colors" data-testid={`schedule-row-${item.id}`}>
                    {/* Cột 1: Mã & Tuyến */}
                    <td className="px-5 py-4 align-top">
                      <div className="space-y-1">
                        <span className="inline-block font-mono font-bold text-blue-700 text-xs px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                          {item.tripCode}
                        </span>
                        <p className="font-semibold text-slate-900 text-sm leading-tight">{item.routeName}</p>
                        <p className="text-xs text-slate-500">{item.fromStop} → {item.toStop}</p>
                      </div>
                    </td>

                    {/* Cột 2: Phương tiện & Tài xế */}
                    <td className="px-5 py-4 align-top">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800 text-xs">
                          <Bus className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.busPlate}</span>
                          <span className="text-[11px] font-normal text-slate-500">({item.busType})</span>
                        </div>
                        <div className="text-xs text-slate-600 flex items-center gap-1.5">
                          <span>Tài xế: <strong>{item.driverName}</strong></span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{item.driverPhone}</span>
                        </div>
                      </div>
                    </td>

                    {/* Cột 3: Giờ xuất bến & Tần suất */}
                    <td className="px-5 py-4 align-top">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <Clock className="w-4 h-4 text-indigo-500" />
                          <span>{item.departureTime}</span>
                          <span className="text-slate-400 font-normal">→</span>
                          <span>{item.arrivalTime}</span>
                        </div>
                        <span className="inline-block text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          Tần suất: {item.frequencyMinutes} phút/chuyến
                        </span>
                      </div>
                    </td>

                    {/* Cột 4: Ghế & Giá vé */}
                    <td className="px-5 py-4 align-top">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900">{formatVND(item.unitPrice)}</p>
                        <span className="text-xs text-slate-500 block">
                          Còn trống: <strong className="text-emerald-700">{item.availableSeats}</strong>/{item.totalSeats} ghế
                        </span>
                      </div>
                    </td>

                    {/* Cột 5: Trạng thái */}
                    <td className="px-5 py-4 align-top">
                      <span
                        data-testid={`status-${item.id}`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          item.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {item.status === 'ACTIVE' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Đang hoạt động
                          </>
                        ) : (
                          <>
                            <PauseCircle className="w-3.5 h-3.5" />
                            Tạm ngưng
                          </>
                        )}
                      </span>
                    </td>

                    {/* Cột 6: Thao tác */}
                    <td className="px-5 py-4 align-top text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`btn-toggle-status-${item.id}`}
                          onClick={() => handleToggleStatus(item)}
                          title={item.status === 'ACTIVE' ? 'Tạm dừng chạy' : 'Kích hoạt lại'}
                          className={item.status === 'ACTIVE' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}
                        >
                          {item.status === 'ACTIVE' ? (
                            <PauseCircle className="w-4 h-4" />
                          ) : (
                            <PlayCircle className="w-4 h-4" />
                          )}
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          data-testid={`btn-edit-schedule-${item.id}`}
                          onClick={() => handleOpenEditModal(item)}
                          icon={Edit2}
                          title="Sửa lịch trình"
                        >
                          Sửa
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`btn-delete-schedule-${item.id}`}
                          onClick={() => handleDelete(item)}
                          title="Xóa lịch trình"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form Thêm / Sửa Lịch trình */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="schedule-form-modal"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold">
                  {editingSchedule ? 'Chỉnh sửa Lịch trình Xe Buýt' : 'Tạo mới Lịch trình Xe Buýt ICTU'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mã chuyến xe</label>
                  <input
                    type="text"
                    data-testid="input-trip-code"
                    required
                    value={formData.tripCode}
                    onChange={e => handleChange('tripCode', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tuyến xe ICTU</label>
                  <select
                    data-testid="select-route"
                    value={formData.routeCode}
                    onChange={e => handleChange('routeCode', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="TUYEN-01">Tuyến 01: Cổng ICTU ⇄ Bến xe TN</option>
                    <option value="TUYEN-02">Tuyến 02: KTX T1 ⇄ Bưu điện TN</option>
                    <option value="TUYEN-03">Tuyến 03: ICTU ⇄ ĐH Sư Phạm</option>
                    <option value="TUYEN-05">Tuyến 05: ICTU ⇄ BV Đa khoa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giờ xuất bến</label>
                  <input
                    type="time"
                    data-testid="input-departure-time"
                    required
                    value={formData.departureTime}
                    onChange={e => handleChange('departureTime', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giờ đến dự kiến</label>
                  <input
                    type="time"
                    data-testid="input-arrival-time"
                    required
                    value={formData.arrivalTime}
                    onChange={e => handleChange('arrivalTime', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Biển số xe buýt</label>
                  <input
                    type="text"
                    data-testid="input-bus-plate"
                    required
                    value={formData.busPlate}
                    onChange={e => handleChange('busPlate', e.target.value)}
                    placeholder="20B-123.45"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tài xế điều khiển</label>
                  <input
                    type="text"
                    data-testid="input-driver-name"
                    required
                    value={formData.driverName}
                    onChange={e => handleChange('driverName', e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại tài xế</label>
                  <input
                    type="tel"
                    data-testid="input-driver-phone"
                    value={formData.driverPhone}
                    onChange={e => handleChange('driverPhone', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tổng số ghế</label>
                  <input
                    type="number"
                    data-testid="input-total-seats"
                    min="10"
                    max="60"
                    value={formData.totalSeats}
                    onChange={e => handleChange('totalSeats', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giá vé một lượt (VNĐ)</label>
                  <input
                    type="number"
                    data-testid="input-unit-price"
                    step="1000"
                    value={formData.unitPrice}
                    onChange={e => handleChange('unitPrice', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú điều phối</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                  placeholder="Ghi chú về tần suất hoặc lưu ý vận hành..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  data-testid="btn-submit-schedule"
                >
                  {editingSchedule ? 'Lưu thay đổi' : 'Xác nhận tạo lịch trình'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSchedulesPage;
