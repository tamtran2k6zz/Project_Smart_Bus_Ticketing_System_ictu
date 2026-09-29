import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IncidentType, IncidentSeverity, FeedbackStatus, VoucherStatus } from '@prisma/client';

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Quản lý Voucher (US 18)
  async getActiveVouchers() {
    const now = new Date();
    return this.prisma.voucher.findMany({
      where: {
        status: VoucherStatus.ACTIVE,
        endDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 2. Báo cáo sự cố đường sá & trễ chuyến (US 11 - Tài xế)
  async reportIncident(data: {
    tripId: string;
    driverId?: string;
    incidentType: IncidentType;
    severity?: IncidentSeverity;
    description: string;
    delayMinutes: number;
    actionTaken?: string;
  }) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: data.tripId },
      include: { route: true, bus: true },
    });

    const report = await this.prisma.incidentReport.create({
      data: {
        tripId: data.tripId,
        driverId: data.driverId || trip?.driverId || 'system',
        incidentType: data.incidentType,
        severity: data.severity || IncidentSeverity.MEDIUM,
        description: data.description,
        delayMinutes: data.delayMinutes,
        actionTaken: data.actionTaken,
      },
    });

    // Cập nhật trạng thái chuyến xe nếu cần
    if (data.delayMinutes > 15) {
      await this.prisma.trip.update({
        where: { id: data.tripId },
        data: { status: 'CANCELLED' },
      }).catch(() => null);
    }

    return report;
  }

  async getIncidents() {
    return this.prisma.incidentReport.findMany({
      include: {
        trip: {
          include: { route: true, bus: true },
        },
        driver: {
          select: { fullName: true, phoneNumber: true },
        },
      },
      orderBy: { reportedAt: 'desc' },
      take: 20,
    });
  }

  // 3. Gửi và xem phản ánh chất lượng chuyến đi (US 24 - Hành khách)
  async submitFeedback(data: {
    userId?: string;
    tripId: string;
    ratingStars: number;
    criteria?: string;
    content: string;
  }) {
    return this.prisma.feedback.create({
      data: {
        userId: data.userId || 'guest',
        tripId: data.tripId,
        ratingStars: data.ratingStars,
        criteria: data.criteria || 'ChatLuongChung',
        content: data.content,
        status: FeedbackStatus.PENDING,
      },
    });
  }

  async getFeedbacks() {
    return this.prisma.feedback.findMany({
      include: {
        user: { select: { fullName: true, email: true } },
        trip: { include: { route: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 30,
    });
  }

  // 4. Báo cáo doanh thu & Tỷ lệ lấp đầy chỗ (US 19, US 20, US 21)
  async getDashboardSummary() {
    const [
      totalUsers,
      totalRoutes,
      totalBusStops,
      totalBuses,
      totalTrips,
      totalTickets,
      totalPayments,
      activeIncidents,
      recentFeedbacks,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.route.count({ where: { deletedAt: null } }),
      this.prisma.busStop.count({ where: { deletedAt: null } }),
      this.prisma.bus.count(),
      this.prisma.trip.count(),
      this.prisma.ticket.count({ where: { status: { in: ['BOOKED', 'CHECKED_IN'] } } }),
      this.prisma.payment.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
      }),
      this.prisma.incidentReport.count(),
      this.prisma.feedback.count(),
    ]);

    const totalRevenue = Number(totalPayments._sum.amount || 0);

    // Tính tỷ lệ lấp đầy chỗ trung bình (US 20)
    const trips = await this.prisma.trip.findMany({
      take: 10,
      include: {
        bus: true,
        route: true,
        tickets: { where: { status: { in: ['BOOKED', 'CHECKED_IN'] } } },
      },
      orderBy: { departureTime: 'desc' },
    });

    const tripStats = trips.map((t) => {
      const bookedCount = t.tickets.length;
      const capacity = t.bus.totalSeats;
      const occupancyRate = capacity > 0 ? Math.round((bookedCount / capacity) * 100) : 0;
      return {
        id: t.id,
        routeCode: t.route.code,
        routeName: t.route.name,
        busPlate: t.bus.plateNumber,
        departureTime: t.departureTime,
        bookedSeats: bookedCount,
        totalSeats: capacity,
        occupancyRate: `${occupancyRate}%`,
        status: t.status,
      };
    });

    return {
      overview: {
        totalRevenue,
        totalTicketsBooked: totalTickets,
        totalUsers,
        totalRoutes,
        totalBusStops,
        totalBuses,
        totalTrips,
        activeIncidents,
        recentFeedbacks,
      },
      tripOccupancy: tripStats,
    };
  }
}
