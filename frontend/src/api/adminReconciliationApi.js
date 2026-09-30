import apiClient from './apiClient';

/**
 * Mock data for Revenue Reconciliation by Date and by Trip (US 06 - STT 25)
 * Tiêu chí nghiệm thu (DoD): Hiển thị tổng doanh thu, số vé đã bán và số vé đã hủy theo ngày.
 */
const INITIAL_DAILY_RECONCILIATION = [
  {
    id: 'rec-2026-09-30',
    date: '2026-09-30',
    formattedDate: '30/09/2026 (Hôm nay)',
    dayOfWeek: 'Thứ Tư',
    tripsCount: 16,
    totalRevenue: 247000, // Tổng doanh thu
    ticketsSold: 18,       // Số vé đã bán
    ticketsCancelled: 3,  // Số vé đã hủy
    ticketsRefunded: 1,
    onlineAmount: 225000, // Cổng VNPay, MoMo, ZaloPay
    cashAmount: 22000,    // Quầy / POS / Lái xe
    status: 'MATCHED',    // MATCHED | PENDING | DISCREPANCY
    statusLabel: 'Khớp 100%',
    gatewayFee: 2470,     // 1% phí cổng
    netRevenue: 244530,
    note: 'Đã hoàn tất đối soát số liệu với cổng thanh toán VNPay và MoMo',
  },
  {
    id: 'rec-2026-09-29',
    date: '2026-09-29',
    formattedDate: '29/09/2026',
    dayOfWeek: 'Thứ Ba',
    tripsCount: 16,
    totalRevenue: 310000,
    ticketsSold: 24,
    ticketsCancelled: 2,
    ticketsRefunded: 2,
    onlineAmount: 280000,
    cashAmount: 30000,
    status: 'MATCHED',
    statusLabel: 'Khớp 100%',
    gatewayFee: 3100,
    netRevenue: 306900,
    note: 'Đối soát thành công tự động lúc 23:59',
  },
  {
    id: 'rec-2026-09-28',
    date: '2026-09-28',
    formattedDate: '28/09/2026',
    dayOfWeek: 'Thứ Hai',
    tripsCount: 14,
    totalRevenue: 285000,
    ticketsSold: 21,
    ticketsCancelled: 1,
    ticketsRefunded: 1,
    onlineAmount: 255000,
    cashAmount: 30000,
    status: 'MATCHED',
    statusLabel: 'Khớp 100%',
    gatewayFee: 2850,
    netRevenue: 282150,
    note: 'Đối soát khớp số dư tài khoản thu hộ Vietcombank',
  },
  {
    id: 'rec-2026-09-27',
    date: '2026-09-27',
    formattedDate: '27/09/2026',
    dayOfWeek: 'Chủ Nhật',
    tripsCount: 10,
    totalRevenue: 195000,
    ticketsSold: 15,
    ticketsCancelled: 4,
    ticketsRefunded: 3,
    onlineAmount: 180000,
    cashAmount: 15000,
    status: 'MATCHED',
    statusLabel: 'Khớp 100%',
    gatewayFee: 1950,
    netRevenue: 193050,
    note: 'Cuối tuần giảm chuyến xe sinh viên',
  },
  {
    id: 'rec-2026-09-26',
    date: '2026-09-26',
    formattedDate: '26/09/2026',
    dayOfWeek: 'Thứ Bảy',
    tripsCount: 12,
    totalRevenue: 230000,
    ticketsSold: 17,
    ticketsCancelled: 2,
    ticketsRefunded: 1,
    onlineAmount: 200000,
    cashAmount: 30000,
    status: 'MATCHED',
    statusLabel: 'Khớp 100%',
    gatewayFee: 2300,
    netRevenue: 227700,
    note: 'Đối soát hoàn tất',
  },
  {
    id: 'rec-2026-09-25',
    date: '2026-09-25',
    formattedDate: '25/09/2026',
    dayOfWeek: 'Thứ Sáu',
    tripsCount: 16,
    totalRevenue: 345000,
    ticketsSold: 26,
    ticketsCancelled: 3,
    ticketsRefunded: 2,
    onlineAmount: 315000,
    cashAmount: 30000,
    status: 'MATCHED',
    statusLabel: 'Khớp 100%',
    gatewayFee: 3450,
    netRevenue: 341550,
    note: 'Lượng sinh viên về quê cuối tuần tăng cao',
  },
  {
    id: 'rec-2026-09-24',
    date: '2026-09-24',
    formattedDate: '24/09/2026',
    dayOfWeek: 'Thứ Năm',
    tripsCount: 14,
    totalRevenue: 270000,
    ticketsSold: 20,
    ticketsCancelled: 1,
    ticketsRefunded: 1,
    onlineAmount: 240000,
    cashAmount: 30000,
    status: 'MATCHED',
    statusLabel: 'Khớp 100%',
    gatewayFee: 2700,
    netRevenue: 267300,
    note: 'Đối soát tự động hệ thống',
  },
];

const INITIAL_TRIP_RECONCILIATION = [
  {
    id: 'trp-rec-01',
    tripCode: 'ICTU-TRP-010',
    date: '2026-09-30',
    departureTime: '07:30 - 30/09/2026',
    routeCode: 'TUYEN-01',
    routeName: 'Tuyến số 01: Cổng ICTU ⇄ Bến xe Thái Nguyên',
    busPlate: '20B-123.45',
    driverName: 'Trần Văn Hùng',
    totalSeats: 29,
    ticketsSold: 22,
    ticketsCancelled: 2,
    totalRevenue: 330000,
    occupancyRate: 76,
    status: 'COMPLETED',
  },
  {
    id: 'trp-rec-02',
    tripCode: 'ICTU-TRP-022',
    date: '2026-09-30',
    departureTime: '08:00 - 30/09/2026',
    routeCode: 'TUYEN-03',
    routeName: 'Tuyến số 03: ICTU ⇄ Ký túc xá ĐH Sư Phạm',
    busPlate: '20B-987.65',
    driverName: 'Nguyễn Văn Minh',
    totalSeats: 45,
    ticketsSold: 38,
    ticketsCancelled: 1,
    totalRevenue: 380000,
    occupancyRate: 84,
    status: 'COMPLETED',
  },
  {
    id: 'trp-rec-03',
    tripCode: 'ICTU-TRP-035',
    date: '2026-09-30',
    departureTime: '09:15 - 30/09/2026',
    routeCode: 'TUYEN-02',
    routeName: 'Tuyến số 02: Ký túc xá T1 ⇄ Trung tâm TP Thái Nguyên',
    busPlate: '20B-555.88',
    driverName: 'Hoàng Anh Tuấn',
    totalSeats: 29,
    ticketsSold: 25,
    ticketsCancelled: 0,
    totalRevenue: 375000,
    occupancyRate: 86,
    status: 'COMPLETED',
  },
  {
    id: 'trp-rec-04',
    tripCode: 'ICTU-TRP-044',
    date: '2026-09-30',
    departureTime: '11:30 - 30/09/2026',
    routeCode: 'TUYEN-05',
    routeName: 'Tuyến số 05: ICTU ⇄ Bệnh viện Đa khoa Trung ương TN',
    busPlate: '20B-444.12',
    driverName: 'Đặng Quốc Huy',
    totalSeats: 35,
    ticketsSold: 28,
    ticketsCancelled: 3,
    totalRevenue: 336000,
    occupancyRate: 80,
    status: 'COMPLETED',
  },
  {
    id: 'trp-rec-05',
    tripCode: 'ICTU-TRP-011',
    date: '2026-09-30',
    departureTime: '14:30 - 30/09/2026',
    routeCode: 'TUYEN-01',
    routeName: 'Tuyến số 01: Cổng ICTU ⇄ Bến xe Thái Nguyên',
    busPlate: '20B-123.45',
    driverName: 'Trần Văn Hùng',
    totalSeats: 29,
    ticketsSold: 26,
    ticketsCancelled: 1,
    totalRevenue: 390000,
    occupancyRate: 90,
    status: 'RUNNING',
  },
  {
    id: 'trp-rec-06',
    tripCode: 'ICTU-TRP-023',
    date: '2026-09-30',
    departureTime: '17:15 - 30/09/2026',
    routeCode: 'TUYEN-03',
    routeName: 'Tuyến số 03: ICTU ⇄ Ký túc xá ĐH Sư Phạm',
    busPlate: '20B-987.65',
    driverName: 'Nguyễn Văn Minh',
    totalSeats: 45,
    ticketsSold: 42,
    ticketsCancelled: 0,
    totalRevenue: 420000,
    occupancyRate: 93,
    status: 'SCHEDULED',
  },
];

export const adminReconciliationApi = {
  /**
   * Get revenue reconciliation grouped by date (DoD STT 25)
   */
  async getDailyReconciliation(params = {}) {
    const { startDate, endDate, routeCode = 'ALL' } = params;

    if (import.meta.env.VITE_USE_REAL_API === 'true') {
      try {
        const response = await apiClient.get('/admin/reconciliation/daily', { params });
        if (response && response.data) return response.data;
      } catch (_err) {
        // fallback
      }
    }

    let items = [...INITIAL_DAILY_RECONCILIATION];

    if (startDate) {
      items = items.filter(i => i.date >= startDate);
    }
    if (endDate) {
      items = items.filter(i => i.date <= endDate);
    }

    // Overall summary across the selected period
    const totalRevenue = items.reduce((sum, i) => sum + i.totalRevenue, 0);
    const totalTicketsSold = items.reduce((sum, i) => sum + i.ticketsSold, 0);
    const totalTicketsCancelled = items.reduce((sum, i) => sum + i.ticketsCancelled, 0);
    const totalOnlineAmount = items.reduce((sum, i) => sum + i.onlineAmount, 0);
    const totalCashAmount = items.reduce((sum, i) => sum + i.cashAmount, 0);
    const totalNetRevenue = items.reduce((sum, i) => sum + i.netRevenue, 0);

    return {
      statusCode: 200,
      data: {
        items,
        summary: {
          totalRevenue,
          totalTicketsSold,
          totalTicketsCancelled,
          totalOnlineAmount,
          totalCashAmount,
          totalNetRevenue,
          daysCount: items.length,
          reconciliationStatus: 'MATCHED_100_PERCENT',
        },
      },
    };
  },

  /**
   * Get revenue reconciliation grouped by trip
   */
  async getTripReconciliation(params = {}) {
    const { date, routeCode = 'ALL' } = params;

    if (import.meta.env.VITE_USE_REAL_API === 'true') {
      try {
        const response = await apiClient.get('/admin/reconciliation/trips', { params });
        if (response && response.data) return response.data;
      } catch (_err) {
        // fallback
      }
    }

    let items = [...INITIAL_TRIP_RECONCILIATION];
    if (date) {
      items = items.filter(i => i.date === date);
    }
    if (routeCode && routeCode !== 'ALL') {
      items = items.filter(i => i.routeCode === routeCode);
    }

    return {
      statusCode: 200,
      data: {
        items,
      },
    };
  },
};

export default adminReconciliationApi;
