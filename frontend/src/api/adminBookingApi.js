import apiClient from './apiClient';

/**
 * Mock data for Admin Transactions & Booked Tickets
 * Matches ICTU Bus System schema and US 06 Payment Gateway specifications
 */
const INITIAL_BOOKINGS = [
  {
    id: 'bkg-101',
    bookingCode: 'BK-ICTU-8921',
    ticketCode: 'TCK-2026-00101',
    customer: {
      name: 'Nguyễn Hoàng Đức',
      email: 'duc.nguyen@smartbus.ictu.vn',
      phone: '0981 234 567',
    },
    trip: {
      id: 'trip-01',
      code: 'ICTU-TRP-010',
      routeCode: 'TUYEN-01',
      routeName: 'Tuyến số 01: Cổng ICTU ⇄ Bến xe Thái Nguyên',
      fromStop: 'Cổng chính ICTU (Quyết Thắng)',
      toStop: 'Bến xe Trung tâm Thái Nguyên',
      busPlate: '20B-123.45',
      busType: 'Xe điện EcoBus 29 chỗ',
      departureTime: '2026-09-30T07:30:00+07:00',
      arrivalTime: '2026-09-30T08:15:00+07:00',
    },
    seats: ['A04'],
    quantity: 1,
    unitPrice: 15000,
    totalAmount: 15000,
    status: 'CONFIRMED', // CONFIRMED | PENDING | CANCELLED | REFUNDED
    paymentMethod: 'VNPAY', // VNPAY | MOMO | ZALOPAY | CASH
    paymentChannel: 'Cổng VNPay QR (Ngân hàng VCB)',
    transactionId: 'VNP-20260930-891024',
    paidAt: '2026-09-30T07:12:45+07:00',
    createdAt: '2026-09-30T07:10:12+07:00',
    notes: 'Thanh toán trực tuyến thành công qua VNPay-QR',
  },
  {
    id: 'bkg-102',
    bookingCode: 'BK-ICTU-8922',
    ticketCode: 'TCK-2026-00102',
    customer: {
      name: 'Trần Thị Thu Hà',
      email: 'thuha.tran@ictu.edu.vn',
      phone: '0972 889 123',
    },
    trip: {
      id: 'trip-02',
      code: 'ICTU-TRP-022',
      routeCode: 'TUYEN-03',
      routeName: 'Tuyến số 03: ICTU ⇄ Ký túc xá ĐH Sư Phạm',
      fromStop: 'Cổng phụ ICTU',
      toStop: 'Ký túc xá ĐH Sư Phạm',
      busPlate: '20B-987.65',
      busType: 'Xe buýt CNG 45 chỗ',
      departureTime: '2026-09-30T08:00:00+07:00',
      arrivalTime: '2026-09-30T08:40:00+07:00',
    },
    seats: ['B12', 'B13'],
    quantity: 2,
    unitPrice: 10000,
    totalAmount: 20000,
    status: 'CONFIRMED',
    paymentMethod: 'MOMO',
    paymentChannel: 'Ví điện tử MoMo AutoPay',
    transactionId: 'MM-20260930-449102',
    paidAt: '2026-09-30T07:22:10+07:00',
    createdAt: '2026-09-30T07:20:00+07:00',
    notes: 'Thanh toán ví MoMo qua mã QR thanh toán nhanh',
  },
  {
    id: 'bkg-103',
    bookingCode: 'BK-ICTU-8923',
    ticketCode: 'TCK-2026-00103',
    customer: {
      name: 'Lê Minh Tuấn',
      email: 'tuan.lm@ictu.edu.vn',
      phone: '0912 345 678',
    },
    trip: {
      id: 'trip-03',
      code: 'ICTU-TRP-035',
      routeCode: 'TUYEN-02',
      routeName: 'Tuyến số 02: Ký túc xá T1 ⇄ Trung tâm TP Thái Nguyên',
      fromStop: 'Ký túc xá T1',
      toStop: 'Bưu điện tỉnh Thái Nguyên',
      busPlate: '20B-555.88',
      busType: 'Xe điện EcoBus 29 chỗ',
      departureTime: '2026-09-30T09:15:00+07:00',
      arrivalTime: '2026-09-30T09:55:00+07:00',
    },
    seats: ['A08'],
    quantity: 1,
    unitPrice: 15000,
    totalAmount: 15000,
    status: 'PENDING',
    paymentMethod: 'VNPAY',
    paymentChannel: 'Cổng VNPay Gateway (Chờ xác nhận)',
    transactionId: 'VNP-20260930-Pending03',
    paidAt: null,
    createdAt: '2026-09-30T08:05:00+07:00',
    notes: 'Khách hàng đang trong quá trình xác thực OTP ngân hàng',
  },
  {
    id: 'bkg-104',
    bookingCode: 'BK-ICTU-8924',
    ticketCode: 'TCK-2026-00104',
    customer: {
      name: 'Phạm Thị Quỳnh Anh',
      email: 'quynhanh.pham@ictu.edu.vn',
      phone: '0963 112 233',
    },
    trip: {
      id: 'trip-01',
      code: 'ICTU-TRP-010',
      routeCode: 'TUYEN-01',
      routeName: 'Tuyến số 01: Cổng ICTU ⇄ Bến xe Thái Nguyên',
      fromStop: 'Cổng chính ICTU (Quyết Thắng)',
      toStop: 'Bến xe Trung tâm Thái Nguyên',
      busPlate: '20B-123.45',
      busType: 'Xe điện EcoBus 29 chỗ',
      departureTime: '2026-09-30T10:00:00+07:00',
      arrivalTime: '2026-09-30T10:45:00+07:00',
    },
    seats: ['C01'],
    quantity: 1,
    unitPrice: 15000,
    totalAmount: 15000,
    status: 'CANCELLED',
    paymentMethod: 'VNPAY',
    paymentChannel: 'Cổng VNPay (Hết hạn giao dịch 15 phút)',
    transactionId: 'VNP-20260930-Expired04',
    paidAt: null,
    createdAt: '2026-09-30T07:45:00+07:00',
    notes: 'Giao dịch hết thời gian chờ thanh toán (Timeout)',
  },
  {
    id: 'bkg-105',
    bookingCode: 'BK-ICTU-8925',
    ticketCode: 'TCK-2026-00105',
    customer: {
      name: 'Hoàng Văn Đạt',
      email: 'dat.hv@gmail.com',
      phone: '0945 999 888',
    },
    trip: {
      id: 'trip-04',
      code: 'ICTU-TRP-044',
      routeCode: 'TUYEN-05',
      routeName: 'Tuyến số 05: ICTU ⇄ Bệnh viện Đa khoa Trung ương TN',
      fromStop: 'Cổng ICTU',
      toStop: 'BV Đa khoa Trung ương TN',
      busPlate: '20B-444.12',
      busType: 'Xe buýt tiêu chuẩn 35 chỗ',
      departureTime: '2026-09-30T11:30:00+07:00',
      arrivalTime: '2026-09-30T12:05:00+07:00',
    },
    seats: ['A02', 'A03', 'A04'],
    quantity: 3,
    unitPrice: 12000,
    totalAmount: 36000,
    status: 'REFUNDED',
    paymentMethod: 'ZALOPAY',
    paymentChannel: 'Cổng thanh toán ZaloPay Sandbox',
    transactionId: 'ZP-20260930-991204',
    paidAt: '2026-09-30T06:50:00+07:00',
    createdAt: '2026-09-30T06:48:00+07:00',
    notes: 'Khách hàng hủy chuyến trước 2 giờ - Đã hoàn tiền tự động 100%',
  },
  {
    id: 'bkg-106',
    bookingCode: 'BK-ICTU-8926',
    ticketCode: 'TCK-2026-00106',
    customer: {
      name: 'Vũ Đức Thịnh',
      email: 'thinh.vu@smartbus.ictu.vn',
      phone: '0934 567 890',
    },
    trip: {
      id: 'trip-02',
      code: 'ICTU-TRP-022',
      routeCode: 'TUYEN-03',
      routeName: 'Tuyến số 03: ICTU ⇄ Ký túc xá ĐH Sư Phạm',
      fromStop: 'Cổng phụ ICTU',
      toStop: 'Ký túc xá ĐH Sư Phạm',
      busPlate: '20B-987.65',
      busType: 'Xe buýt CNG 45 chỗ',
      departureTime: '2026-09-30T13:30:00+07:00',
      arrivalTime: '2026-09-30T14:10:00+07:00',
    },
    seats: ['C05'],
    quantity: 1,
    unitPrice: 10000,
    totalAmount: 10000,
    status: 'CONFIRMED',
    paymentMethod: 'CASH',
    paymentChannel: 'Thanh toán trực tiếp tại quầy điều phối ICTU',
    transactionId: 'POS-20260930-00102',
    paidAt: '2026-09-30T08:15:00+07:00',
    createdAt: '2026-09-30T08:14:00+07:00',
    notes: 'Vé in trực tiếp từ hệ thống POS quầy vé cơ sở ICTU',
  },
  {
    id: 'bkg-107',
    bookingCode: 'BK-ICTU-8927',
    ticketCode: 'TCK-2026-00107',
    customer: {
      name: 'Đặng Mai Lan',
      email: 'lan.dang@ictu.edu.vn',
      phone: '0977 445 566',
    },
    trip: {
      id: 'trip-01',
      code: 'ICTU-TRP-010',
      routeCode: 'TUYEN-01',
      routeName: 'Tuyến số 01: Cổng ICTU ⇄ Bến xe Thái Nguyên',
      fromStop: 'Cổng chính ICTU (Quyết Thắng)',
      toStop: 'Bến xe Trung tâm Thái Nguyên',
      busPlate: '20B-123.45',
      busType: 'Xe điện EcoBus 29 chỗ',
      departureTime: '2026-09-30T14:30:00+07:00',
      arrivalTime: '2026-09-30T15:15:00+07:00',
    },
    seats: ['B01', 'B02'],
    quantity: 2,
    unitPrice: 15000,
    totalAmount: 30000,
    status: 'CONFIRMED',
    paymentMethod: 'VNPAY',
    paymentChannel: 'Cổng VNPay QR (Ngân hàng BIDV)',
    transactionId: 'VNP-20260930-771923',
    paidAt: '2026-09-30T08:45:11+07:00',
    createdAt: '2026-09-30T08:42:00+07:00',
    notes: 'Thanh toán thành công qua ứng dụng ngân hàng Smart Banking',
  },
  {
    id: 'bkg-108',
    bookingCode: 'BK-ICTU-8928',
    ticketCode: 'TCK-2026-00108',
    customer: {
      name: 'Ngô Quốc Bảo',
      email: 'bao.nq@gmail.com',
      phone: '0988 776 655',
    },
    trip: {
      id: 'trip-03',
      code: 'ICTU-TRP-035',
      routeCode: 'TUYEN-02',
      routeName: 'Tuyến số 02: Ký túc xá T1 ⇄ Trung tâm TP Thái Nguyên',
      fromStop: 'Ký túc xá T1',
      toStop: 'Bưu điện tỉnh Thái Nguyên',
      busPlate: '20B-555.88',
      busType: 'Xe điện EcoBus 29 chỗ',
      departureTime: '2026-09-30T16:00:00+07:00',
      arrivalTime: '2026-09-30T16:40:00+07:00',
    },
    seats: ['A11'],
    quantity: 1,
    unitPrice: 15000,
    totalAmount: 15000,
    status: 'PENDING',
    paymentMethod: 'MOMO',
    paymentChannel: 'Ví MoMo (Chờ người dùng quét mã)',
    transactionId: 'MM-20260930-Pending08',
    paidAt: null,
    createdAt: '2026-09-30T08:50:00+07:00',
    notes: 'Chờ khách hàng mở ứng dụng MoMo hoàn tất giao dịch',
  },
  {
    id: 'bkg-109',
    bookingCode: 'BK-ICTU-8929',
    ticketCode: 'TCK-2026-00109',
    customer: {
      name: 'Nguyễn Thị Minh Hằng',
      email: 'hang.ntm@ictu.edu.vn',
      phone: '0978 112 334',
    },
    trip: {
      id: 'trip-01',
      code: 'ICTU-TRP-010',
      routeCode: 'TUYEN-01',
      routeName: 'Tuyến số 01: Cổng ICTU ⇄ Bến xe Thái Nguyên',
      fromStop: 'Cổng chính ICTU (Quyết Thắng)',
      toStop: 'Bến xe Trung tâm Thái Nguyên',
      busPlate: '20B-123.45',
      busType: 'Xe điện EcoBus 29 chỗ',
      departureTime: '2026-09-30T17:15:00+07:00',
      arrivalTime: '2026-09-30T18:00:00+07:00',
    },
    seats: ['A01', 'A02'],
    quantity: 2,
    unitPrice: 15000,
    totalAmount: 30000,
    status: 'CONFIRMED',
    paymentMethod: 'VNPAY',
    paymentChannel: 'Cổng VNPay QR (MB Bank)',
    transactionId: 'VNP-20260930-119283',
    paidAt: '2026-09-30T09:10:00+07:00',
    createdAt: '2026-09-30T09:08:00+07:00',
    notes: 'Thanh toán thành công qua App MBBank',
  },
  {
    id: 'bkg-110',
    bookingCode: 'BK-ICTU-8930',
    ticketCode: 'TCK-2026-00110',
    customer: {
      name: 'Trịnh Quốc Cường',
      email: 'cuong.tq@gmail.com',
      phone: '0915 678 999',
    },
    trip: {
      id: 'trip-04',
      code: 'ICTU-TRP-044',
      routeCode: 'TUYEN-05',
      routeName: 'Tuyến số 05: ICTU ⇄ Bệnh viện Đa khoa Trung ương TN',
      fromStop: 'Cổng ICTU',
      toStop: 'BV Đa khoa Trung ương TN',
      busPlate: '20B-444.12',
      busType: 'Xe buýt tiêu chuẩn 35 chỗ',
      departureTime: '2026-09-30T17:45:00+07:00',
      arrivalTime: '2026-09-30T18:20:00+07:00',
    },
    seats: ['B05'],
    quantity: 1,
    unitPrice: 12000,
    totalAmount: 12000,
    status: 'PENDING',
    paymentMethod: 'ZALOPAY',
    paymentChannel: 'Cổng ZaloPay QR (Đang giữ chỗ 10 phút)',
    transactionId: 'ZP-20260930-Pending10',
    paidAt: null,
    createdAt: '2026-09-30T09:20:00+07:00',
    notes: 'Hành khách đang giữ chỗ, chờ xác nhận thanh toán',
  },
  {
    id: 'bkg-111',
    bookingCode: 'BK-ICTU-8931',
    ticketCode: 'TCK-2026-00111',
    customer: {
      name: 'Đỗ Thùy Trang',
      email: 'trang.dt@ictu.edu.vn',
      phone: '0966 333 222',
    },
    trip: {
      id: 'trip-02',
      code: 'ICTU-TRP-022',
      routeCode: 'TUYEN-03',
      routeName: 'Tuyến số 03: ICTU ⇄ Ký túc xá ĐH Sư Phạm',
      fromStop: 'Cổng phụ ICTU',
      toStop: 'Ký túc xá ĐH Sư Phạm',
      busPlate: '20B-987.65',
      busType: 'Xe buýt CNG 45 chỗ',
      departureTime: '2026-09-30T18:30:00+07:00',
      arrivalTime: '2026-09-30T19:10:00+07:00',
    },
    seats: ['C08'],
    quantity: 1,
    unitPrice: 10000,
    totalAmount: 10000,
    status: 'CANCELLED',
    paymentMethod: 'CASH',
    paymentChannel: 'Quầy bán vé ICTU',
    transactionId: 'POS-20260930-00111',
    paidAt: null,
    createdAt: '2026-09-30T09:30:00+07:00',
    notes: 'Khách đổi ý hủy giữ chỗ qua tổng đài hỗ trợ',
  },
  {
    id: 'bkg-112',
    bookingCode: 'BK-ICTU-8932',
    ticketCode: 'TCK-2026-00112',
    customer: {
      name: 'Lương Đình Phong',
      email: 'phong.ld@gmail.com',
      phone: '0983 456 781',
    },
    trip: {
      id: 'trip-03',
      code: 'ICTU-TRP-035',
      routeCode: 'TUYEN-02',
      routeName: 'Tuyến số 02: Ký túc xá T1 ⇄ Trung tâm TP Thái Nguyên',
      fromStop: 'Ký túc xá T1',
      toStop: 'Bưu điện tỉnh Thái Nguyên',
      busPlate: '20B-555.88',
      busType: 'Xe điện EcoBus 29 chỗ',
      departureTime: '2026-09-30T19:00:00+07:00',
      arrivalTime: '2026-09-30T19:40:00+07:00',
    },
    seats: ['A03'],
    quantity: 1,
    unitPrice: 15000,
    totalAmount: 15000,
    status: 'CONFIRMED',
    paymentMethod: 'MOMO',
    paymentChannel: 'Ví điện tử MoMo',
    transactionId: 'MM-20260930-881920',
    paidAt: '2026-09-30T09:46:00+07:00',
    createdAt: '2026-09-30T09:45:00+07:00',
    notes: 'Thanh toán thành công qua quét mã MoMo',
  },
  {
    id: 'bkg-113',
    bookingCode: 'BK-ICTU-8933',
    ticketCode: 'TCK-2026-00113',
    customer: {
      name: 'Bùi Thị Lan Hương',
      email: 'huong.btl@ictu.edu.vn',
      phone: '0979 556 677',
    },
    trip: {
      id: 'trip-01',
      code: 'ICTU-TRP-010',
      routeCode: 'TUYEN-01',
      routeName: 'Tuyến số 01: Cổng ICTU ⇄ Bến xe Thái Nguyên',
      fromStop: 'Cổng chính ICTU (Quyết Thắng)',
      toStop: 'Bến xe Trung tâm Thái Nguyên',
      busPlate: '20B-123.45',
      busType: 'Xe điện EcoBus 29 chỗ',
      departureTime: '2026-09-30T19:30:00+07:00',
      arrivalTime: '2026-09-30T20:15:00+07:00',
    },
    seats: ['B07'],
    quantity: 1,
    unitPrice: 15000,
    totalAmount: 15000,
    status: 'PENDING',
    paymentMethod: 'VNPAY',
    paymentChannel: 'Cổng VNPay QR',
    transactionId: 'VNP-20260930-Pending13',
    paidAt: null,
    createdAt: '2026-09-30T10:00:00+07:00',
    notes: 'Đang giữ chỗ trực tuyến, thời gian còn lại: 08 phút',
  },
  {
    id: 'bkg-114',
    bookingCode: 'BK-ICTU-8934',
    ticketCode: 'TCK-2026-00114',
    customer: {
      name: 'Dương Văn Hải',
      email: 'hai.dv@ictu.edu.vn',
      phone: '0904 223 344',
    },
    trip: {
      id: 'trip-02',
      code: 'ICTU-TRP-022',
      routeCode: 'TUYEN-03',
      routeName: 'Tuyến số 03: ICTU ⇄ Ký túc xá ĐH Sư Phạm',
      fromStop: 'Cổng phụ ICTU',
      toStop: 'Ký túc xá ĐH Sư Phạm',
      busPlate: '20B-987.65',
      busType: 'Xe buýt CNG 45 chỗ',
      departureTime: '2026-09-30T20:00:00+07:00',
      arrivalTime: '2026-09-30T20:40:00+07:00',
    },
    seats: ['A05', 'A06'],
    quantity: 2,
    unitPrice: 10000,
    totalAmount: 20000,
    status: 'CONFIRMED',
    paymentMethod: 'VNPAY',
    paymentChannel: 'Cổng VNPay QR (VietinBank)',
    transactionId: 'VNP-20260930-662819',
    paidAt: '2026-09-30T10:15:30+07:00',
    createdAt: '2026-09-30T10:12:00+07:00',
    notes: 'Thanh toán thành công qua ứng dụng iPay VietinBank',
  },
  {
    id: 'bkg-115',
    bookingCode: 'BK-ICTU-8935',
    ticketCode: 'TCK-2026-00115',
    customer: {
      name: 'Vũ Ngọc Ánh',
      email: 'anh.vn@gmail.com',
      phone: '0936 889 900',
    },
    trip: {
      id: 'trip-03',
      code: 'ICTU-TRP-035',
      routeCode: 'TUYEN-02',
      routeName: 'Tuyến số 02: Ký túc xá T1 ⇄ Trung tâm TP Thái Nguyên',
      fromStop: 'Ký túc xá T1',
      toStop: 'Bưu điện tỉnh Thái Nguyên',
      busPlate: '20B-555.88',
      busType: 'Xe điện EcoBus 29 chỗ',
      departureTime: '2026-09-30T20:30:00+07:00',
      arrivalTime: '2026-09-30T21:10:00+07:00',
    },
    seats: ['B09'],
    quantity: 1,
    unitPrice: 15000,
    totalAmount: 15000,
    status: 'CANCELLED',
    paymentMethod: 'VNPAY',
    paymentChannel: 'Cổng VNPay Gateway',
    transactionId: 'VNP-20260930-Fail15',
    paidAt: null,
    createdAt: '2026-09-30T10:20:00+07:00',
    notes: 'Giao dịch bị từ chối do thẻ không đủ số dư',
  },
  {
    id: 'bkg-116',
    bookingCode: 'BK-ICTU-8936',
    ticketCode: 'TCK-2026-00116',
    customer: {
      name: 'Tạ Văn Quyết',
      email: 'quyet.tv@ictu.edu.vn',
      phone: '0982 771 882',
    },
    trip: {
      id: 'trip-04',
      code: 'ICTU-TRP-044',
      routeCode: 'TUYEN-05',
      routeName: 'Tuyến số 05: ICTU ⇄ Bệnh viện Đa khoa Trung ương TN',
      fromStop: 'Cổng ICTU',
      toStop: 'BV Đa khoa Trung ương TN',
      busPlate: '20B-444.12',
      busType: 'Xe buýt tiêu chuẩn 35 chỗ',
      departureTime: '2026-09-30T21:00:00+07:00',
      arrivalTime: '2026-09-30T21:35:00+07:00',
    },
    seats: ['A09'],
    quantity: 1,
    unitPrice: 12000,
    totalAmount: 12000,
    status: 'CONFIRMED',
    paymentMethod: 'CASH',
    paymentChannel: 'Thanh toán trực tiếp lái xe / POS',
    transactionId: 'POS-20260930-00116',
    paidAt: '2026-09-30T10:35:00+07:00',
    createdAt: '2026-09-30T10:34:00+07:00',
    notes: 'Thanh toán tiền mặt quét mã thẻ NFC sinh viên',
  },
];

// Helper to get cached storage or fallback to initial
const getStoredBookings = () => {
  try {
    const raw = sessionStorage.getItem('admin_bookings_data');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (_e) {
    // ignore
  }
  return [...INITIAL_BOOKINGS];
};

const saveStoredBookings = items => {
  try {
    sessionStorage.setItem('admin_bookings_data', JSON.stringify(items));
  } catch (_e) {
    // ignore
  }
};

export const adminBookingApi = {
  /**
   * Get list of bookings & transactions with filtering, searching, and pagination
   */
  async getBookings(params = {}) {
    const {
      search = '',
      status = 'ALL',
      paymentMethod = 'ALL',
      routeCode = 'ALL',
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    // Try remote API first if explicitly enabled
    if (import.meta.env.VITE_USE_REAL_API === 'true') {
      try {
        const response = await apiClient.get('/admin/bookings', { params });
        if (response && response.data) {
          return response.data;
        }
      } catch (_err) {
        // Backend US 06 endpoint not yet connected; fallback to local mock engine
      }
    }

    // Local in-memory filtering engine
    let data = getStoredBookings();

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter(item => {
        return (
          item.bookingCode.toLowerCase().includes(q) ||
          item.ticketCode.toLowerCase().includes(q) ||
          item.transactionId.toLowerCase().includes(q) ||
          item.customer.name.toLowerCase().includes(q) ||
          item.customer.phone.includes(q) ||
          item.trip.routeName.toLowerCase().includes(q) ||
          item.trip.busPlate.toLowerCase().includes(q)
        );
      });
    }

    if (status && status !== 'ALL') {
      if (status === 'CONFIRMED' || status === 'PAID') {
        data = data.filter(item => item.status === 'CONFIRMED' || item.status === 'BOOKED');
      } else if (status === 'PENDING' || status === 'RESERVED') {
        data = data.filter(item => item.status === 'PENDING' || item.status === 'RESERVED');
      } else if (status === 'CANCELLED') {
        data = data.filter(item => item.status === 'CANCELLED' || item.status === 'REFUNDED');
      } else {
        data = data.filter(item => item.status === status);
      }
    }

    if (paymentMethod && paymentMethod !== 'ALL') {
      data = data.filter(item => item.paymentMethod === paymentMethod);
    }

    if (routeCode && routeCode !== 'ALL') {
      data = data.filter(item => item.trip.routeCode === routeCode);
    }

    // Sorting
    data.sort((a, b) => {
      let valA = a[sortBy] ?? '';
      let valB = b[sortBy] ?? '';
      if (sortBy === 'totalAmount') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return sortOrder === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

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
   * Get single booking details
   */
  async getBookingById(id) {
    if (import.meta.env.VITE_USE_REAL_API === 'true') {
      try {
        const response = await apiClient.get(`/admin/bookings/${id}`);
        if (response && response.data) return response.data;
      } catch (_err) {
        // fallback
      }
    }

    const data = getStoredBookings();
    const item = data.find(b => b.id === id || b.bookingCode === id || b.ticketCode === id);
    if (!item) {
      throw new Error('Không tìm thấy thông tin vé hoặc giao dịch');
    }
    return { statusCode: 200, data: item };
  },

  /**
   * Update booking status (e.g. Confirm manual payment, Cancel ticket)
   */
  async updateBookingStatus(id, newStatus, reason = '') {
    if (import.meta.env.VITE_USE_REAL_API === 'true') {
      try {
        const response = await apiClient.patch(`/admin/bookings/${id}/status`, {
          status: newStatus,
          reason,
        });
        if (response && response.data) return response.data;
      } catch (_err) {
        // fallback
      }
    }

    const data = getStoredBookings();
    const index = data.findIndex(b => b.id === id);
    if (index === -1) {
      throw new Error('Không tìm thấy thông tin vé cần cập nhật');
    }

    data[index] = {
      ...data[index],
      status: newStatus,
      notes: reason ? `${data[index].notes || ''} [Admin cập nhật: ${reason}]` : data[index].notes,
      paidAt:
        newStatus === 'CONFIRMED' && !data[index].paidAt
          ? new Date().toISOString()
          : data[index].paidAt,
      updatedAt: new Date().toISOString(),
    };

    saveStoredBookings(data);
    return { statusCode: 200, data: data[index], message: 'Cập nhật trạng thái thành công' };
  },

  /**
   * Refund transaction
   */
  async refundTransaction(id, reason = 'Hoàn tiền theo yêu cầu') {
    return this.updateBookingStatus(id, 'REFUNDED', reason);
  },

  /**
   * Get statistical summary for dashboard cards
   */
  async getStats() {
    const data = getStoredBookings();
    const totalTransactions = data.length;
    const confirmedList = data.filter(d => d.status === 'CONFIRMED');
    const totalRevenue = confirmedList.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const confirmedCount = confirmedList.length;
    const pendingCount = data.filter(d => d.status === 'PENDING' || d.status === 'RESERVED').length;
    const cancelledCount = data.filter(d => d.status === 'CANCELLED' || d.status === 'REFUNDED').length;
    const refundedCount = data.filter(d => d.status === 'REFUNDED').length;
    const totalTicketsSold = confirmedList.reduce((acc, curr) => acc + curr.quantity, 0);

    return {
      statusCode: 200,
      data: {
        totalRevenue,
        totalTransactions,
        totalTicketsSold,
        pendingCount,
        refundedCount,
        cancelledCount,
        statusCounts: {
          ALL: totalTransactions,
          CONFIRMED: confirmedCount,
          PENDING: pendingCount,
          CANCELLED: cancelledCount,
        },
        successRate: totalTransactions ? Math.round((confirmedList.length / totalTransactions) * 100) : 0,
      },
    };
  },
};

export default adminBookingApi;
