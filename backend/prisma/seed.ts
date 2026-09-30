import { PrismaClient, UserRole, DiscountType, DiscountStatus, UserStatus, RouteStatus, FareType, TicketType, TripStatus, BookingStatus, TicketStatus, PaymentMethod, PaymentStatus, MonthlyPassType, PassStatus, VoucherStatus, IncidentType, IncidentSeverity, FeedbackStatus, NotificationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting MySQL database seeding...');

  // 1. Clean existing records in reverse dependency order
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.incidentReport.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.monthlyPass.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.fare.deleteMany();
  await prisma.routeStop.deleteMany();
  await prisma.busStop.deleteMany();
  await prisma.route.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned previous database records.');

  // 2. Hash passwords
  const adminPassHash = await bcrypt.hash('Admin@12345', 10);
  const managerPassHash = await bcrypt.hash('Manager@123', 10);
  const driverPassHash = await bcrypt.hash('Driver@123', 10);
  const userPassHash = await bcrypt.hash('User@123', 10);

  // 3. Create Users
  const admin = await prisma.user.create({
    data: {
      fullName: 'Trần Đặng Công Tâm (Admin)',
      email: 'admin@smartbus.ictu.vn',
      phoneNumber: '0912345678',
      passwordHash: adminPassHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const manager = await prisma.user.create({
    data: {
      fullName: 'Quản lý Điều hành Tuyến',
      email: 'manager@smartbus.ictu.vn',
      phoneNumber: '0988888888',
      passwordHash: managerPassHash,
      role: UserRole.MANAGER,
      status: UserStatus.ACTIVE,
    },
  });

  const driver = await prisma.user.create({
    data: {
      fullName: 'Bác tài Nguyễn Văn Lái',
      email: 'driver@smartbus.ictu.vn',
      phoneNumber: '0987654321',
      passwordHash: driverPassHash,
      role: UserRole.DRIVER,
      status: UserStatus.ACTIVE,
    },
  });

  const assistant = await prisma.user.create({
    data: {
      fullName: 'Phụ xe Lê Văn Phụ',
      email: 'assistant@smartbus.ictu.vn',
      phoneNumber: '0977112233',
      passwordHash: driverPassHash,
      role: UserRole.DRIVER,
      status: UserStatus.ACTIVE,
    },
  });

  const passenger = await prisma.user.create({
    data: {
      fullName: 'Nguyễn Hoàng Đức (Hành khách)',
      email: 'khachhang@gmail.com',
      phoneNumber: '0901234567',
      passwordHash: userPassHash,
      role: UserRole.PASSENGER,
      discountType: DiscountType.STUDENT,
      discountStatus: DiscountStatus.APPROVED,
      discountProofUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600',
      status: UserStatus.ACTIVE,
    },
  });

  const studentPending = await prisma.user.create({
    data: {
      fullName: 'Lê Sinh Viên (Chờ duyệt HSSV)',
      email: 'sinhvien@ictu.edu.vn',
      phoneNumber: '0933445566',
      passwordHash: userPassHash,
      role: UserRole.PASSENGER,
      discountType: DiscountType.STUDENT,
      discountStatus: DiscountStatus.PENDING,
      discountProofUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600',
      status: UserStatus.ACTIVE,
    },
  });

  console.log('✅ Created real users with bcrypt passwords.');

  // 4. Create Bus Stops
  const stopsData = [
    { code: 'BS-01', name: 'Bến xe Mỹ Đình', address: 'Phạm Hùng, Mỹ Đình, Nam Từ Liêm, Hà Nội', latitude: 21.0285, longitude: 105.7783 },
    { code: 'BS-02', name: 'Đại học Quốc gia Hà Nội', address: '144 Xuân Thủy, Cầu Giấy, Hà Nội', latitude: 21.0368, longitude: 105.7825 },
    { code: 'BS-03', name: 'Trạm Cầu Giấy', address: 'Điểm trung chuyển xe buýt Cầu Giấy, Hà Nội', latitude: 21.0298, longitude: 105.8016 },
    { code: 'BS-04', name: 'Trạm Kim Mã', address: 'Số 1 Kim Mã, Ba Đình, Hà Nội', latitude: 21.0315, longitude: 105.8198 },
    { code: 'BS-05', name: 'Bến xe Long Biên', address: 'Yên Phụ, Ba Đình, Hà Nội', latitude: 21.0422, longitude: 105.8505 },
    { code: 'BS-06', name: 'Bến xe Yên Nghĩa', address: 'QL6, Yên Nghĩa, Hà Đông, Hà Nội', latitude: 20.9576, longitude: 105.7482 },
    { code: 'BS-07', name: 'Trạm Ngã Tư Sở', address: 'Ngã Tư Sở, Đống Đa, Hà Nội', latitude: 21.0028, longitude: 105.8194 },
    { code: 'BS-08', name: 'Sân bay Quốc tế Nội Bài', address: 'Nhà ga T1/T2 Nội Bài, Sóc Sơn, Hà Nội', latitude: 21.2187, longitude: 105.8042 },
    { code: 'BS-09', name: 'Bến xe Thái Nguyên', address: 'Đồng Quang, TP. Thái Nguyên', latitude: 21.5833, longitude: 105.8333 },
    { code: 'BS-10', name: 'Trường ĐH CNTT & TT Thái Nguyên (ICTU)', address: 'Đường Z115, Quyết Thắng, TP. Thái Nguyên', latitude: 21.5866, longitude: 105.8078 },
    { code: 'BS-11', name: 'Khu công nghiệp Gang Thép', address: 'Tích Lương, TP. Thái Nguyên', latitude: 21.5289, longitude: 105.8711 },
  ];

  const stops: Record<string, any> = {};
  for (const s of stopsData) {
    stops[s.code] = await prisma.busStop.create({ data: s });
  }

  console.log(`✅ Created ${stopsData.length} bus stops in MySQL.`);

  // 5. Create Routes
  const r01 = await prisma.route.create({
    data: {
      code: 'R01',
      name: 'Bến xe Mỹ Đình - Bến xe Long Biên',
      description: 'Tuyến buýt trục chính kết nối bến xe phía Tây và trung tâm Long Biên',
      distanceKm: 18.5,
      estimatedDurationMin: 45,
      status: RouteStatus.ACTIVE,
    },
  });

  const r02 = await prisma.route.create({
    data: {
      code: 'R02',
      name: 'Bến xe Yên Nghĩa - Sân bay Nội Bài',
      description: 'Tuyến xe buýt chất lượng cao đón trả khách sân bay Nội Bài',
      distanceKm: 38.0,
      estimatedDurationMin: 70,
      status: RouteStatus.ACTIVE,
    },
  });

  const r03 = await prisma.route.create({
    data: {
      code: 'BUS-TN01',
      name: 'Bến xe Thái Nguyên - ICTU - Gang Thép',
      description: 'Tuyến xe buýt thông minh phục vụ sinh viên ICTU và người dân Thái Nguyên',
      distanceKm: 16.0,
      estimatedDurationMin: 35,
      status: RouteStatus.ACTIVE,
    },
  });

  console.log('✅ Created 3 main bus routes.');

  // 6. Connect Route Stops
  const r01Stops = [
    { routeId: r01.id, stopId: stops['BS-01'].id, stopOrder: 1, distanceFromStartKm: 0, estimatedMinutesFromStart: 0, isTerminal: true },
    { routeId: r01.id, stopId: stops['BS-02'].id, stopOrder: 2, distanceFromStartKm: 2.5, estimatedMinutesFromStart: 8, isTerminal: false },
    { routeId: r01.id, stopId: stops['BS-03'].id, stopOrder: 3, distanceFromStartKm: 6.0, estimatedMinutesFromStart: 18, isTerminal: false },
    { routeId: r01.id, stopId: stops['BS-04'].id, stopOrder: 4, distanceFromStartKm: 11.2, estimatedMinutesFromStart: 30, isTerminal: false },
    { routeId: r01.id, stopId: stops['BS-05'].id, stopOrder: 5, distanceFromStartKm: 18.5, estimatedMinutesFromStart: 45, isTerminal: true },
  ];
  for (const rs of r01Stops) await prisma.routeStop.create({ data: rs });

  const r02Stops = [
    { routeId: r02.id, stopId: stops['BS-06'].id, stopOrder: 1, distanceFromStartKm: 0, estimatedMinutesFromStart: 0, isTerminal: true },
    { routeId: r02.id, stopId: stops['BS-07'].id, stopOrder: 2, distanceFromStartKm: 8.5, estimatedMinutesFromStart: 20, isTerminal: false },
    { routeId: r02.id, stopId: stops['BS-03'].id, stopOrder: 3, distanceFromStartKm: 14.0, estimatedMinutesFromStart: 32, isTerminal: false },
    { routeId: r02.id, stopId: stops['BS-08'].id, stopOrder: 4, distanceFromStartKm: 38.0, estimatedMinutesFromStart: 70, isTerminal: true },
  ];
  for (const rs of r02Stops) await prisma.routeStop.create({ data: rs });

  const r03Stops = [
    { routeId: r03.id, stopId: stops['BS-09'].id, stopOrder: 1, distanceFromStartKm: 0, estimatedMinutesFromStart: 0, isTerminal: true },
    { routeId: r03.id, stopId: stops['BS-10'].id, stopOrder: 2, distanceFromStartKm: 5.5, estimatedMinutesFromStart: 12, isTerminal: false },
    { routeId: r03.id, stopId: stops['BS-11'].id, stopOrder: 3, distanceFromStartKm: 16.0, estimatedMinutesFromStart: 35, isTerminal: true },
  ];
  for (const rs of r03Stops) await prisma.routeStop.create({ data: rs });

  console.log('✅ Linked stops with order & distance to routes.');

  // 7. Fares
  await prisma.fare.create({
    data: {
      routeId: r01.id,
      fareType: FareType.FLAT_FARE,
      ticketType: TicketType.SINGLE,
      amount: 10000,
    },
  });
  await prisma.fare.create({
    data: {
      routeId: r01.id,
      fareType: FareType.FLAT_FARE,
      ticketType: TicketType.MONTHLY_STUDENT,
      amount: 100000,
    },
  });
  await prisma.fare.create({
    data: {
      routeId: r02.id,
      fareType: FareType.STAGE_FARE,
      ticketType: TicketType.SINGLE,
      amount: 35000,
      fromStopId: stops['BS-06'].id,
      toStopId: stops['BS-08'].id,
    },
  });
  await prisma.fare.create({
    data: {
      routeId: r03.id,
      fareType: FareType.FLAT_FARE,
      ticketType: TicketType.SINGLE,
      amount: 8000,
    },
  });

  // 8. Buses and Seats
  const bus1 = await prisma.bus.create({
    data: {
      plateNumber: '29B-123.45',
      busType: 'Thaco City Bus',
      totalSeats: 20,
      standingCapacity: 25,
      currentLatitude: 21.0285,
      currentLongitude: 105.7783,
      status: 'READY',
    },
  });

  const bus2 = await prisma.bus.create({
    data: {
      plateNumber: '29B-987.65',
      busType: 'VinFast E-Bus',
      totalSeats: 24,
      standingCapacity: 30,
      currentLatitude: 21.0368,
      currentLongitude: 105.7825,
      status: 'RUNNING',
    },
  });

  const bus3 = await prisma.bus.create({
    data: {
      plateNumber: '20B-888.88',
      busType: 'Smart ICTU Bus',
      totalSeats: 20,
      standingCapacity: 20,
      currentLatitude: 21.5866,
      currentLongitude: 105.8078,
      status: 'READY',
    },
  });

  // Create Seats for bus1 (A01 - A10, B01 - B10)
  for (let i = 1; i <= 10; i++) {
    const numA = (i < 10 ? '0' : '') + i;
    await prisma.seat.create({
      data: {
        busId: bus1.id,
        seatNumber: `A${numA}`,
        rowPosition: i % 2 === 1 ? 'WINDOW' : 'AISLE',
        isPriority: i <= 2,
      },
    });
    const numB = (i < 10 ? '0' : '') + i;
    await prisma.seat.create({
      data: {
        busId: bus1.id,
        seatNumber: `B${numB}`,
        rowPosition: i % 2 === 1 ? 'WINDOW' : 'AISLE',
        isPriority: false,
      },
    });
  }

  // Create Seats for bus2
  for (let i = 1; i <= 12; i++) {
    const num = (i < 10 ? '0' : '') + i;
    await prisma.seat.create({ data: { busId: bus2.id, seatNumber: `E${num}`, rowPosition: 'WINDOW', isPriority: i === 1 } });
    await prisma.seat.create({ data: { busId: bus2.id, seatNumber: `F${num}`, rowPosition: 'AISLE', isPriority: false } });
  }

  // Create Seats for bus3
  for (let i = 1; i <= 10; i++) {
    const num = (i < 10 ? '0' : '') + i;
    await prisma.seat.create({ data: { busId: bus3.id, seatNumber: `T${num}`, rowPosition: 'WINDOW', isPriority: i === 1 } });
    await prisma.seat.create({ data: { busId: bus3.id, seatNumber: `S${num}`, rowPosition: 'AISLE', isPriority: false } });
  }

  console.log('✅ Created 3 buses with real seat configurations.');

  // 9. Scheduled Trips for Today & Tomorrow
  const now = new Date();
  const trip1Dep = new Date(now.getTime() + 60 * 60 * 1000); // in 1 hour
  const trip1Arr = new Date(trip1Dep.getTime() + 45 * 60 * 1000);

  const trip2Dep = new Date(now.getTime() + 3 * 60 * 60 * 1000); // in 3 hours
  const trip2Arr = new Date(trip2Dep.getTime() + 45 * 60 * 1000);

  const trip3Dep = new Date(now.getTime() + 2 * 60 * 60 * 1000); // in 2 hours
  const trip3Arr = new Date(trip3Dep.getTime() + 70 * 60 * 1000);

  const trip4Dep = new Date(now.getTime() + 4 * 60 * 60 * 1000); // in 4 hours
  const trip4Arr = new Date(trip4Dep.getTime() + 35 * 60 * 1000);

  const trip1 = await prisma.trip.create({
    data: {
      routeId: r01.id,
      busId: bus1.id,
      driverId: driver.id,
      assistantId: assistant.id,
      departureTime: trip1Dep,
      arrivalTime: trip1Arr,
      basePrice: 10000,
      status: TripStatus.SCHEDULED,
      dispatchNotes: 'Chuyến giờ cao điểm sáng, đón trả trạm đúng quy chuẩn',
    },
  });

  const trip2 = await prisma.trip.create({
    data: {
      routeId: r01.id,
      busId: bus1.id,
      driverId: driver.id,
      assistantId: assistant.id,
      departureTime: trip2Dep,
      arrivalTime: trip2Arr,
      basePrice: 10000,
      status: TripStatus.SCHEDULED,
    },
  });

  const trip3 = await prisma.trip.create({
    data: {
      routeId: r02.id,
      busId: bus2.id,
      driverId: driver.id,
      departureTime: trip3Dep,
      arrivalTime: trip3Arr,
      basePrice: 35000,
      status: TripStatus.SCHEDULED,
      dispatchNotes: 'Xe buýt điện thông minh Nội Bài, kiểm tra điều hòa trước khi chạy',
    },
  });

  const trip4 = await prisma.trip.create({
    data: {
      routeId: r03.id,
      busId: bus3.id,
      driverId: driver.id,
      assistantId: assistant.id,
      departureTime: trip4Dep,
      arrivalTime: trip4Arr,
      basePrice: 8000,
      status: TripStatus.SCHEDULED,
      dispatchNotes: 'Chuyến xe kết nối giảng đường ICTU và trung tâm Thái Nguyên',
    },
  });

  console.log('✅ Created 4 active trips for today.');

  // 10. Vouchers
  const voucher1 = await prisma.voucher.create({
    data: {
      code: 'BUYT5K',
      title: 'Giảm ngay 5.000đ cho chuyến đầu tiên',
      discountPercent: 0,
      maxDiscountAmount: 5000,
      minOrderAmount: 10000,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      usageLimit: 1000,
      usedCount: 15,
      status: VoucherStatus.ACTIVE,
    },
  });

  const voucher2 = await prisma.voucher.create({
    data: {
      code: 'ICTU2026',
      title: 'Ưu đãi sinh viên ICTU - Giảm 20%',
      discountPercent: 20,
      maxDiscountAmount: 10000,
      minOrderAmount: 8000,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      usageLimit: 500,
      usedCount: 42,
      status: VoucherStatus.ACTIVE,
    },
  });

  // 11. Real Booking & Tickets with QR
  const booking1 = await prisma.booking.create({
    data: {
      tripId: trip1.id,
      userId: passenger.id,
      bookingCode: 'BK-2026-001',
      status: BookingStatus.CONFIRMED,
      totalAmount: 10000,
    },
  });

  const seatA01 = await prisma.seat.findFirst({ where: { busId: bus1.id, seatNumber: 'A01' } });

  const ticket1 = await prisma.ticket.create({
    data: {
      bookingId: booking1.id,
      tripId: trip1.id,
      userId: passenger.id,
      seatId: seatA01?.id,
      seatNumber: 'A01',
      fromStopId: stops['BS-01'].id,
      toStopId: stops['BS-05'].id,
      voucherId: voucher1.id,
      ticketCode: 'TKT-998822',
      qrCode: 'SMARTBUS-QR-TKT-998822-VERIFIED',
      price: 10000,
      status: TicketStatus.BOOKED,
    },
  });

  // Payment for Ticket 1
  await prisma.payment.create({
    data: {
      bookingId: booking1.id,
      ticketId: ticket1.id,
      gatewayTransactionId: 'VNPAY-TRANS-20260929-100234',
      paymentMethod: PaymentMethod.VNPAY,
      amount: 10000,
      status: PaymentStatus.SUCCESS,
      electronicInvoiceCode: 'INV-E-2026-09001',
      invoiceEmail: 'khachhang@gmail.com',
      paidAt: new Date(),
    },
  });

  // 12. Monthly Pass
  await prisma.monthlyPass.create({
    data: {
      userId: passenger.id,
      routeId: r01.id,
      cardCode: 'RFID-ICTU-PASS-001',
      passType: MonthlyPassType.STUDENT,
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-30'),
      price: 100000,
      status: PassStatus.ACTIVE,
    },
  });

  // 13. Feedback
  await prisma.feedback.create({
    data: {
      userId: passenger.id,
      tripId: trip1.id,
      ratingStars: 5,
      criteria: 'DungGio',
      content: 'Xe buýt đến đúng giờ, tài xế và phụ xe giao tiếp văn minh, xe sạch sẽ!',
      status: FeedbackStatus.RESOLVED,
      responseFromStaff: 'Cảm ơn quý khách đã tin tưởng trải nghiệm dịch vụ xe buýt thông minh!',
    },
  });

  // 14. Incident Report
  await prisma.incidentReport.create({
    data: {
      tripId: trip1.id,
      driverId: driver.id,
      incidentType: IncidentType.TRAFFIC_JAM,
      severity: IncidentSeverity.LOW,
      description: 'Đoạn đường Xuân Thủy mật độ giao thông đông đúc vào giờ tan tầm.',
      delayMinutes: 10,
      actionTaken: 'Đã báo hiệu ứng dụng gửi thông báo trễ 10 phút đến hành khách tại trạm.',
    },
  });

  // 15. Notification
  await prisma.notification.create({
    data: {
      userId: passenger.id,
      title: 'Xe sắp đến trạm đón!',
      content: 'Chuyến xe Tuyến R01 biển số 29B-123.45 cách trạm Bến xe Mỹ Đình khoảng 500m (dự kiến đến sau 3 phút).',
      type: NotificationType.APPROACHING_STOP,
      isRead: false,
    },
  });

  // 16. Activity Log
  await prisma.activityLog.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_INIT_MYSQL',
      module: 'DATABASE',
      ipAddress: '127.0.0.1',
      userAgent: 'Node.js/Prisma Seed Script',
    },
  });

  console.log('🎉 REAL SEED DATA SUCCESSFULLY INSERTED INTO MYSQL!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
