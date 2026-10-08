import apiClient from './apiClient';

/**
 * Mock Data for Bus Schedules (Lịch trình chạy xe buýt ICTU)
 */
const INITIAL_SCHEDULES = [
  {
    id: 'sch-01',
    tripCode: 'SCH-ICTU-01',
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
    daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    status: 'ACTIVE', // ACTIVE | SUSPENDED | COMPLETED
    availableSeats: 18,
    totalSeats: 29,
    unitPrice: 15000,
    notes: 'Chuyến xe ưu tiên ca sáng cho sinh viên và cán bộ giảng viên',
    createdAt: '2026-10-01T06:00:00+07:00',
  },
  {
    id: 'sch-02',
    tripCode: 'SCH-ICTU-02',
    routeCode: 'TUYEN-01',
    routeName: 'Tuyến số 01: Cổng ICTU ⇄ Bến xe Thái Nguyên',
    fromStop: 'Cổng chính ICTU (Quyết Thắng)',
    toStop: 'Bến xe Trung tâm Thái Nguyên',
    busPlate: '20B-123.45',
    busType: 'Xe điện EcoBus 29 chỗ',
    driverName: 'Nguyễn Văn An',
    driverPhone: '0912 345 678',
    departureTime: '07:30',
    arrivalTime: '08:15',
    frequencyMinutes: 20,
    daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
    status: 'ACTIVE',
    availableSeats: 8,
    totalSeats: 29,
    unitPrice: 15000,
    notes: 'Giờ cao điểm sinh viên vào lớp ca 1',
    createdAt: '2026-10-01T06:00:00+07:00',
  },
  {
    id: 'sch-03',
    tripCode: 'SCH-ICTU-03',
    routeCode: 'TUYEN-03',
    routeName: 'Tuyến số 03: ICTU ⇄ Ký túc xá ĐH Sư Phạm',
    fromStop: 'Cổng phụ ICTU (Đường Z115)',
    toStop: 'Ký túc xá ĐH Sư Phạm',
    busPlate: '20B-987.65',
    busType: 'Xe buýt CNG 45 chỗ',
    driverName: 'Trần Văn Bình',
    driverPhone: '0978 223 344',
    departureTime: '08:00',
    arrivalTime: '08:40',
    frequencyMinutes: 30,
    daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    status: 'ACTIVE',
    availableSeats: 25,
    totalSeats: 45,
    unitPrice: 10000,
    notes: 'Xe sức chứa lớn phục vụ liên trường Đại học Thái Nguyên',
    createdAt: '2026-10-01T06:00:00+07:00',
  },
  {
    id: 'sch-04',
    tripCode: 'SCH-ICTU-04',
    routeCode: 'TUYEN-02',
    routeName: 'Tuyến số 02: Ký túc xá T1 ⇄ Trung tâm TP Thái Nguyên',
    fromStop: 'Ký túc xá T1 ICTU',
    toStop: 'Bưu điện tỉnh Thái Nguyên',
    busPlate: '20B-555.88',
    busType: 'Xe điện EcoBus 29 chỗ',
    driverName: 'Lê Hoàng Long',
    driverPhone: '0934 889 900',
    departureTime: '09:15',
    arrivalTime: '09:55',
    frequencyMinutes: 30,
    daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
    status: 'ACTIVE',
    availableSeats: 15,
    totalSeats: 29,
    unitPrice: 15000,
    notes: 'Kết nối sinh viên KTX tới các dịch vụ trung tâm thành phố',
    createdAt: '2026-10-01T06:00:00+07:00',
  },
  {
    id: 'sch-05',
    tripCode: 'SCH-ICTU-05',
    routeCode: 'TUYEN-05',
    routeName: 'Tuyến số 05: Cổng ICTU ⇄ BV Đa khoa Thái Nguyên',
    fromStop: 'Cổng chính ICTU',
    toStop: 'Bệnh viện Đa khoa Trung ương Thái Nguyên',
    busPlate: '20B-444.22',
    busType: 'Xe điện EcoBus 29 chỗ',
    driverName: 'Phạm Minh Đức',
    driverPhone: '0988 123 456',
    departureTime: '10:00',
    arrivalTime: '10:45',
    frequencyMinutes: 45,
    daysOfWeek: ['MON', 'WED', 'FRI'],
    status: 'SUSPENDED',
    availableSeats: 29,
    totalSeats: 29,
    unitPrice: 15000,
    notes: 'Tạm ngưng bảo trì định kỳ hệ thống ắc quy xe điện',
    createdAt: '2026-10-01T06:00:00+07:00',
  },
  {
    id: 'sch-06',
    tripCode: 'SCH-ICTU-06',
    routeCode: 'TUYEN-01',
    routeName: 'Tuyến số 01: Cổng ICTU ⇄ Bến xe Thái Nguyên',
    fromStop: 'Cổng chính ICTU (Quyết Thắng)',
    toStop: 'Bến xe Trung tâm Thái Nguyên',
    busPlate: '20B-123.45',
    busType: 'Xe điện EcoBus 29 chỗ',
    driverName: 'Nguyễn Văn An',
    driverPhone: '0912 345 678',
    departureTime: '17:15',
    arrivalTime: '18:00',
    frequencyMinutes: 20,
    daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    status: 'ACTIVE',
    availableSeats: 5,
    totalSeats: 29,
    unitPrice: 15000,
    notes: 'Chuyến xe cao điểm buổi chiều tan học',
    createdAt: '2026-10-01T06:00:00+07:00',
  },
];

const getStoredSchedules = () => {
  try {
    const raw = sessionStorage.getItem('admin_schedules_data');
    if (raw) return JSON.parse(raw);
  } catch (_e) {
    // fallback
  }
  return [...INITIAL_SCHEDULES];
};

const saveStoredSchedules = items => {
  try {
    sessionStorage.setItem('admin_schedules_data', JSON.stringify(items));
  } catch (_e) {
    // fallback
  }
};

export const adminScheduleApi = {
  /**
   * Lấy danh sách lịch trình chạy xe với bộ lọc
   */
  async getSchedules(params = {}) {
    const {
      search = '',
      routeCode = 'ALL',
      status = 'ALL',
      dayOfWeek = 'ALL',
      page = 1,
      limit = 10,
    } = params;

    if (import.meta.env.VITE_USE_REAL_API === 'true') {
      try {
        const response = await apiClient.get('/admin/schedules', { params });
        if (response && response.data) return response.data;
      } catch (_err) {
        // fallback to local mock engine
      }
    }

    let data = getStoredSchedules();

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter(item => {
        return (
          item.tripCode.toLowerCase().includes(q) ||
          item.routeName.toLowerCase().includes(q) ||
          item.busPlate.toLowerCase().includes(q) ||
          item.driverName.toLowerCase().includes(q) ||
          item.driverPhone.includes(q)
        );
      });
    }

    if (routeCode && routeCode !== 'ALL') {
      data = data.filter(item => item.routeCode === routeCode);
    }

    if (status && status !== 'ALL') {
      data = data.filter(item => item.status === status);
    }

    if (dayOfWeek && dayOfWeek !== 'ALL') {
      data = data.filter(item => item.daysOfWeek.includes(dayOfWeek));
    }

    // Sort by departure time
    data.sort((a, b) => a.departureTime.localeCompare(b.departureTime));

    const total = data.length;
    const startIndex = (page - 1) * limit;
    const items = data.slice(startIndex, startIndex + limit);

    return {
      statusCode: 200,
      data: {
        items,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalItems: total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    };
  },

  /**
   * Tạo mới lịch trình chạy xe
   */
  async createSchedule(payload) {
    if (import.meta.env.VITE_USE_REAL_API === 'true') {
      try {
        const response = await apiClient.post('/admin/schedules', payload);
        if (response && response.data) return response.data;
      } catch (_err) {
        // fallback
      }
    }

    const data = getStoredSchedules();
    const newId = `sch-${Date.now().toString().slice(-4)}`;
    const newSchedule = {
      id: newId,
      tripCode: payload.tripCode || `SCH-ICTU-${Math.floor(10 + Math.random() * 90)}`,
      routeCode: payload.routeCode || 'TUYEN-01',
      routeName: payload.routeName || 'Tuyến số 01: Cổng ICTU ⇄ Bến xe Thái Nguyên',
      fromStop: payload.fromStop || 'Cổng chính ICTU',
      toStop: payload.toStop || 'Bến xe Trung tâm Thái Nguyên',
      busPlate: payload.busPlate || '20B-111.99',
      busType: payload.busType || 'Xe điện EcoBus 29 chỗ',
      driverName: payload.driverName || 'Nguyễn Văn Mới',
      driverPhone: payload.driverPhone || '0981 999 888',
      departureTime: payload.departureTime || '07:00',
      arrivalTime: payload.arrivalTime || '07:45',
      frequencyMinutes: Number(payload.frequencyMinutes) || 20,
      daysOfWeek: payload.daysOfWeek || ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      status: payload.status || 'ACTIVE',
      availableSeats: Number(payload.totalSeats || 29),
      totalSeats: Number(payload.totalSeats || 29),
      unitPrice: Number(payload.unitPrice) || 15000,
      notes: payload.notes || 'Lịch trình được khởi tạo bởi Quản trị viên',
      createdAt: new Date().toISOString(),
    };

    data.unshift(newSchedule);
    saveStoredSchedules(data);

    return {
      statusCode: 201,
      data: newSchedule,
      message: `Đã thêm mới lịch trình ${newSchedule.tripCode} thành công!`,
    };
  },

  /**
   * Chỉnh sửa lịch trình
   */
  async updateSchedule(id, payload) {
    if (import.meta.env.VITE_USE_REAL_API === 'true') {
      try {
        const response = await apiClient.put(`/admin/schedules/${id}`, payload);
        if (response && response.data) return response.data;
      } catch (_err) {
        // fallback
      }
    }

    const data = getStoredSchedules();
    const idx = data.findIndex(s => s.id === id);
    if (idx === -1) {
      throw new Error('Không tìm thấy lịch trình xe');
    }

    data[idx] = {
      ...data[idx],
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    saveStoredSchedules(data);
    return {
      statusCode: 200,
      data: data[idx],
      message: `Cập nhật lịch trình ${data[idx].tripCode} thành công!`,
    };
  },

  /**
   * Bật/Tắt trạng thái hoạt động của lịch trình
   */
  async toggleScheduleStatus(id, newStatus) {
    const data = getStoredSchedules();
    const idx = data.findIndex(s => s.id === id);
    if (idx === -1) {
      throw new Error('Không tìm thấy lịch trình cần đổi trạng thái');
    }

    data[idx].status = newStatus;
    data[idx].updatedAt = new Date().toISOString();
    saveStoredSchedules(data);

    return {
      statusCode: 200,
      data: data[idx],
      message: `Đã chuyển trạng thái lịch trình ${data[idx].tripCode} sang "${newStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngưng'}"!`,
    };
  },

  /**
   * Xóa lịch trình
   */
  async deleteSchedule(id) {
    let data = getStoredSchedules();
    const target = data.find(s => s.id === id);
    if (!target) throw new Error('Không tìm thấy lịch trình để xóa');

    data = data.filter(s => s.id !== id);
    saveStoredSchedules(data);

    return {
      statusCode: 200,
      message: `Đã xóa lịch trình ${target.tripCode} khỏi hệ thống`,
    };
  },

  /**
   * Thống kê KPI lịch trình
   */
  async getStats() {
    const data = getStoredSchedules();
    const totalSchedules = data.length;
    const activeCount = data.filter(s => s.status === 'ACTIVE').length;
    const suspendedCount = data.filter(s => s.status === 'SUSPENDED').length;
    const uniqueBuses = new Set(data.map(s => s.busPlate)).size;
    const uniqueDrivers = new Set(data.map(s => s.driverName)).size;

    return {
      statusCode: 200,
      data: {
        totalSchedules,
        activeCount,
        suspendedCount,
        uniqueBuses,
        uniqueDrivers,
      },
    };
  },
};

export default adminScheduleApi;
