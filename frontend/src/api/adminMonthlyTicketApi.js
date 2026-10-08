import apiClient from './apiClient';

/**
 * Mock Data for Monthly Ticket Subscriptions (Đăng ký vé tháng trực tuyến ICTU)
 */
const INITIAL_SUBSCRIPTIONS = [
  {
    id: 'sub-01',
    subscriptionCode: 'MTP-2026-00101',
    fullName: 'Nguyễn Hoàng Đức',
    studentId: 'DTC215180123',
    phone: '0981 234 567',
    email: 'duc.nguyen@smartbus.ictu.vn',
    faculty: 'Khoa Công nghệ Thông tin - K21',
    customerType: 'STUDENT', // STUDENT | FACULTY | STANDARD
    subscriptionType: 'SINGLE_ROUTE', // SINGLE_ROUTE | ALL_ROUTES
    routeCode: 'TUYEN-01',
    routeName: 'Tuyến số 01: Cổng ICTU ⇄ Bến xe Thái Nguyên',
    validMonth: '2026-10',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    price: 100000, // Sinh viên ưu đãi 50%
    paymentMethod: 'VNPAY',
    paymentStatus: 'PAID',
    transactionId: 'VNP-SUB-202610-00101',
    status: 'PENDING', // PENDING | ACTIVE | REJECTED | EXPIRED
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    studentCardImage: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400',
    qrCode: 'MTP-QR-202610-00101',
    createdAt: '2026-10-01T08:30:00+07:00',
    notes: 'Sinh viên đăng ký trực tuyến qua cổng ICTU SmartBus',
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null,
  },
  {
    id: 'sub-02',
    subscriptionCode: 'MTP-2026-00102',
    fullName: 'Trần Thị Thu Hà',
    studentId: 'DTC225480045',
    phone: '0972 889 123',
    email: 'thuha.tran@ictu.edu.vn',
    faculty: 'Khoa Hệ thống thông tin kinh tế - K22',
    customerType: 'STUDENT',
    subscriptionType: 'ALL_ROUTES',
    routeCode: 'ALL_ROUTES',
    routeName: 'Vé liên tuyến: Toàn mạng lưới xe buýt ICTU',
    validMonth: '2026-10',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    price: 160000, // Vé liên tuyến sinh viên
    paymentMethod: 'MOMO',
    paymentStatus: 'PAID',
    transactionId: 'MM-SUB-202610-00102',
    status: 'ACTIVE',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    studentCardImage: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400',
    qrCode: 'MTP-QR-202610-00102',
    createdAt: '2026-09-28T09:15:00+07:00',
    notes: 'Hồ sơ đầy đủ, đã duyệt thẻ điện tử',
    approvedAt: '2026-09-29T10:00:00+07:00',
    approvedBy: 'Admin Quản trị ICTU',
    rejectionReason: null,
  },
  {
    id: 'sub-03',
    subscriptionCode: 'MTP-2026-00103',
    fullName: 'TS. Lê Minh Tuấn',
    studentId: 'GV-ICTU-089',
    phone: '0912 345 678',
    email: 'tuan.lm@ictu.edu.vn',
    faculty: 'Giảng viên Khoa Điện tử Viễn thông',
    customerType: 'FACULTY',
    subscriptionType: 'SINGLE_ROUTE',
    routeCode: 'TUYEN-02',
    routeName: 'Tuyến số 02: Ký túc xá T1 ⇄ Bưu điện tỉnh Thái Nguyên',
    validMonth: '2026-10',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    price: 150000, // Cán bộ giảng viên
    paymentMethod: 'VNPAY',
    paymentStatus: 'PAID',
    transactionId: 'VNP-SUB-202610-00103',
    status: 'ACTIVE',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    studentCardImage: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400',
    qrCode: 'MTP-QR-202610-00103',
    createdAt: '2026-09-29T14:20:00+07:00',
    notes: 'Thẻ cán bộ giảng viên hợp lệ',
    approvedAt: '2026-09-30T08:30:00+07:00',
    approvedBy: 'Admin Quản trị ICTU',
    rejectionReason: null,
  },
  {
    id: 'sub-04',
    subscriptionCode: 'MTP-2026-00104',
    fullName: 'Hoàng Quốc Việt',
    studentId: 'DTC205120332',
    phone: '0965 443 210',
    email: 'viet.hq@ictu.edu.vn',
    faculty: 'Khoa Kỹ thuật Phần mềm',
    customerType: 'STUDENT',
    subscriptionType: 'SINGLE_ROUTE',
    routeCode: 'TUYEN-03',
    routeName: 'Tuyến số 03: ICTU ⇄ Ký túc xá ĐH Sư Phạm',
    validMonth: '2026-10',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    price: 100000,
    paymentMethod: 'CASH',
    paymentStatus: 'PENDING',
    transactionId: 'POS-SUB-202610-00104',
    status: 'PENDING',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    studentCardImage: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400',
    qrCode: 'MTP-QR-202610-00104',
    createdAt: '2026-10-02T10:00:00+07:00',
    notes: 'Sinh viên chọn thanh toán tại văn phòng quản lý vé',
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null,
  },
  {
    id: 'sub-05',
    subscriptionCode: 'MTP-2026-00105',
    fullName: 'Nguyễn Thị Minh Châu',
    studentId: 'DTC235670889',
    phone: '0971 334 556',
    email: 'chau.ntm@ictu.edu.vn',
    faculty: 'Khoa Truyền thông Đa phương tiện',
    customerType: 'STUDENT',
    subscriptionType: 'SINGLE_ROUTE',
    routeCode: 'TUYEN-01',
    routeName: 'Tuyến số 01: Cổng ICTU ⇄ Bến xe Thái Nguyên',
    validMonth: '2026-10',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    price: 100000,
    paymentMethod: 'VNPAY',
    paymentStatus: 'PAID',
    transactionId: 'VNP-SUB-202610-00105',
    status: 'REJECTED',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    studentCardImage: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400',
    qrCode: 'MTP-QR-202610-00105',
    createdAt: '2026-10-01T11:45:00+07:00',
    notes: 'Ảnh chụp thẻ sinh viên bị mờ, không rõ mã số sinh viên',
    approvedAt: null,
    approvedBy: null,
    rejectionReason: 'Ảnh chụp thẻ sinh viên bị mờ không đọc được mã số. Vui lòng chụp lại rõ nét.',
  },
];

const getStoredSubscriptions = () => {
  try {
    const raw = sessionStorage.getItem('admin_monthly_tickets_data');
    if (raw) return JSON.parse(raw);
  } catch (_e) {
    // fallback
  }
  return [...INITIAL_SUBSCRIPTIONS];
};

const saveStoredSubscriptions = items => {
  try {
    sessionStorage.setItem('admin_monthly_tickets_data', JSON.stringify(items));
  } catch (_e) {
    // fallback
  }
};

export const adminMonthlyTicketApi = {
  /**
   * Lấy danh sách đăng ký vé tháng với bộ lọc
   */
  async getSubscriptions(params = {}) {
    const {
      search = '',
      status = 'ALL',
      customerType = 'ALL',
      subscriptionType = 'ALL',
      validMonth = 'ALL',
      page = 1,
      limit = 10,
    } = params;

    if (import.meta.env.VITE_USE_REAL_API === 'true') {
      try {
        const response = await apiClient.get('/admin/monthly-tickets', { params });
        if (response && response.data) return response.data;
      } catch (_err) {
        // fallback
      }
    }

    let data = getStoredSubscriptions();

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter(item => {
        return (
          item.subscriptionCode.toLowerCase().includes(q) ||
          item.fullName.toLowerCase().includes(q) ||
          item.studentId.toLowerCase().includes(q) ||
          item.phone.includes(q) ||
          item.email.toLowerCase().includes(q) ||
          item.routeName.toLowerCase().includes(q)
        );
      });
    }

    if (status && status !== 'ALL') {
      data = data.filter(item => item.status === status);
    }

    if (customerType && customerType !== 'ALL') {
      data = data.filter(item => item.customerType === customerType);
    }

    if (subscriptionType && subscriptionType !== 'ALL') {
      data = data.filter(item => item.subscriptionType === subscriptionType);
    }

    if (validMonth && validMonth !== 'ALL') {
      data = data.filter(item => item.validMonth === validMonth);
    }

    // Sort by createdAt desc
    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
   * Đăng ký vé tháng trực tuyến mới
   */
  async registerMonthlyTicket(payload) {
    if (import.meta.env.VITE_USE_REAL_API === 'true') {
      try {
        const response = await apiClient.post('/admin/monthly-tickets', payload);
        if (response && response.data) return response.data;
      } catch (_err) {
        // fallback
      }
    }

    const data = getStoredSubscriptions();
    const newSeq = Math.floor(100 + Math.random() * 900);
    const subCode = `MTP-2026-00${newSeq}`;
    
    // Calculate price based on customerType and subscriptionType
    let price = 100000;
    if (payload.customerType === 'STUDENT') {
      price = payload.subscriptionType === 'ALL_ROUTES' ? 160000 : 100000;
    } else if (payload.customerType === 'FACULTY') {
      price = payload.subscriptionType === 'ALL_ROUTES' ? 220000 : 150000;
    } else {
      price = payload.subscriptionType === 'ALL_ROUTES' ? 300000 : 200000;
    }

    const newSub = {
      id: `sub-${Date.now().toString().slice(-4)}`,
      subscriptionCode: subCode,
      fullName: payload.fullName,
      studentId: payload.studentId || 'DTC215000000',
      phone: payload.phone,
      email: payload.email,
      faculty: payload.faculty || 'Khoa Công nghệ Thông tin',
      customerType: payload.customerType || 'STUDENT',
      subscriptionType: payload.subscriptionType || 'SINGLE_ROUTE',
      routeCode: payload.routeCode || 'TUYEN-01',
      routeName: payload.routeName || 'Tuyến số 01: Cổng ICTU ⇄ Bến xe Thái Nguyên',
      validMonth: payload.validMonth || '2026-10',
      startDate: `${payload.validMonth || '2026-10'}-01`,
      endDate: `${payload.validMonth || '2026-10'}-31`,
      price,
      paymentMethod: payload.paymentMethod || 'VNPAY',
      paymentStatus: payload.paymentStatus || 'PAID',
      transactionId: `TXN-SUB-${Date.now().toString().slice(-6)}`,
      status: 'PENDING',
      avatarUrl: payload.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      studentCardImage: payload.studentCardImage || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400',
      qrCode: `MTP-QR-${subCode}`,
      notes: payload.notes || 'Hồ sơ đăng ký trực tuyến tiếp nhận thành công',
      createdAt: new Date().toISOString(),
      approvedAt: null,
      approvedBy: null,
      rejectionReason: null,
    };

    data.unshift(newSub);
    saveStoredSubscriptions(data);

    return {
      statusCode: 201,
      data: newSub,
      message: `Đăng ký vé tháng thành công! Mã hồ sơ của bạn là ${newSub.subscriptionCode}.`,
    };
  },

  /**
   * Duyệt cấp thẻ vé tháng cho khách (Admin Action)
   */
  async approveSubscription(id, { note = '' } = {}) {
    const data = getStoredSubscriptions();
    const idx = data.findIndex(s => s.id === id);
    if (idx === -1) {
      throw new Error('Không tìm thấy hồ sơ đăng ký vé tháng');
    }

    data[idx] = {
      ...data[idx],
      status: 'ACTIVE',
      approvedAt: new Date().toISOString(),
      approvedBy: 'Quản trị viên (Admin ICTU)',
      notes: note ? `${data[idx].notes} [Admin: ${note}]` : `${data[idx].notes} [Đã duyệt kích hoạt thẻ]`,
      rejectionReason: null,
    };

    saveStoredSubscriptions(data);

    return {
      statusCode: 200,
      data: data[idx],
      message: `Đã duyệt cấp vé tháng ${data[idx].subscriptionCode} thành công! Thẻ điện tử đã được kích hoạt.`,
    };
  },

  /**
   * Từ chối duyệt vé tháng (Admin Action)
   */
  async rejectSubscription(id, { reason = 'Hồ sơ hoặc thông tin minh chứng thẻ sinh viên không hợp lệ' } = {}) {
    const data = getStoredSubscriptions();
    const idx = data.findIndex(s => s.id === id);
    if (idx === -1) {
      throw new Error('Không tìm thấy hồ sơ đăng ký vé tháng');
    }

    data[idx] = {
      ...data[idx],
      status: 'REJECTED',
      rejectionReason: reason,
      notes: `${data[idx].notes} [Admin từ chối: ${reason}]`,
      approvedAt: null,
      approvedBy: null,
    };

    saveStoredSubscriptions(data);

    return {
      statusCode: 200,
      data: data[idx],
      message: `Đã từ chối hồ sơ vé tháng ${data[idx].subscriptionCode}.`,
    };
  },

  /**
   * Thống kê KPI vé tháng
   */
  async getStats() {
    const data = getStoredSubscriptions();
    const totalCount = data.length;
    const pendingCount = data.filter(s => s.status === 'PENDING').length;
    const activeCount = data.filter(s => s.status === 'ACTIVE').length;
    const rejectedCount = data.filter(s => s.status === 'REJECTED').length;
    const totalRevenue = data
      .filter(s => s.status === 'ACTIVE' || s.paymentStatus === 'PAID')
      .reduce((sum, item) => sum + item.price, 0);

    return {
      statusCode: 200,
      data: {
        totalCount,
        pendingCount,
        activeCount,
        rejectedCount,
        totalRevenue,
      },
    };
  },
};

export default adminMonthlyTicketApi;
