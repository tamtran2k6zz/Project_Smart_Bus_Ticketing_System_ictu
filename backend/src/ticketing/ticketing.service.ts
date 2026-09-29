import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BookingStatus, TicketStatus, PaymentStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class TicketingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy sơ đồ ghế thực tế của chuyến xe kèm trạng thái đặt chỗ (US 2, US 3)
   */
  async getTripSeats(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        bus: {
          include: {
            seats: {
              orderBy: { seatNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Không tìm thấy chuyến xe!');
    }

    const now = new Date();

    // Tìm các vé đang còn hiệu lực giữ chỗ hoặc đã thanh toán
    const activeTickets = await this.prisma.ticket.findMany({
      where: {
        tripId,
        status: { in: [TicketStatus.BOOKED, TicketStatus.CHECKED_IN, TicketStatus.RESERVED] },
      },
    });

    // Lọc bỏ các vé giữ chỗ đã quá hạn 10 phút (US 3)
    const occupiedSeatNumbers = new Set<string>();
    for (const ticket of activeTickets) {
      if (ticket.status === TicketStatus.RESERVED) {
        if (ticket.reservationExpiresAt && ticket.reservationExpiresAt > now) {
          occupiedSeatNumbers.add(ticket.seatNumber);
        }
      } else {
        occupiedSeatNumbers.add(ticket.seatNumber);
      }
    }

    const seatsWithStatus = trip.bus.seats.map((seat) => ({
      ...seat,
      isAvailable: !occupiedSeatNumbers.has(seat.seatNumber),
    }));

    return {
      tripId: trip.id,
      bus: {
        plateNumber: trip.bus.plateNumber,
        busType: trip.bus.busType,
        totalSeats: trip.bus.totalSeats,
        standingCapacity: trip.bus.standingCapacity,
      },
      seats: seatsWithStatus,
    };
  }

  /**
   * Đặt vé trực tiếp vào MySQL với cơ chế giữ chỗ 10 phút và sinh mã QR (US 2, 3, 4, 6, 7)
   */
  async createBooking(data: {
    tripId: string;
    userId?: string;
    seatNumber: string;
    fromStopId?: string;
    toStopId?: string;
    voucherCode?: string;
    paymentMethod?: PaymentMethod;
    customerEmail?: string;
  }) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: data.tripId },
      include: { bus: true, route: true },
    });

    if (!trip) {
      throw new NotFoundException('Chuyến xe không tồn tại!');
    }

    const now = new Date();

    // Kiểm tra xem ghế đã có người giữ chỗ hoặc mua chưa trong MySQL
    const existingTicket = await this.prisma.ticket.findFirst({
      where: {
        tripId: data.tripId,
        seatNumber: data.seatNumber,
        status: { in: [TicketStatus.BOOKED, TicketStatus.CHECKED_IN, TicketStatus.RESERVED] },
      },
    });

    if (existingTicket) {
      if (
        existingTicket.status === TicketStatus.RESERVED &&
        existingTicket.reservationExpiresAt &&
        existingTicket.reservationExpiresAt <= now
      ) {
        // Vé giữ chỗ hết hạn -> Cập nhật sang CANCELLED để giải phóng chỗ
        await this.prisma.ticket.update({
          where: { id: existingTicket.id },
          data: { status: TicketStatus.CANCELLED },
        });
      } else {
        throw new ConflictException(`Ghế ${data.seatNumber} đã có người chọn hoặc giữ chỗ!`);
      }
    }

    // Tính giá vé & Khuyến mãi Voucher (US 18)
    let originalPrice = Number(trip.basePrice);
    let discountAmount = 0;
    let appliedVoucherId: string | undefined;

    if (data.voucherCode) {
      const voucher = await this.prisma.voucher.findUnique({
        where: { code: data.voucherCode.trim().toUpperCase() },
      });

      if (voucher && voucher.status === 'ACTIVE' && voucher.endDate >= now) {
        appliedVoucherId = voucher.id;
        if (voucher.discountPercent > 0) {
          discountAmount = (originalPrice * voucher.discountPercent) / 100;
          if (Number(voucher.maxDiscountAmount) > 0) {
            discountAmount = Math.min(discountAmount, Number(voucher.maxDiscountAmount));
          }
        } else if (Number(voucher.maxDiscountAmount) > 0) {
          discountAmount = Number(voucher.maxDiscountAmount);
        }
        await this.prisma.voucher.update({
          where: { id: voucher.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    const finalPrice = Math.max(0, originalPrice - discountAmount);

    // Thời gian giữ chỗ 10 phút (US 3)
    const reservationExpiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    const bookingCode = `BK-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const ticketCode = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    const qrCode = `SMARTBUS-QR-${ticketCode}-${bookingCode}`;

    // Lưu vào MySQL trong Transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          tripId: data.tripId,
          userId: data.userId || null,
          bookingCode,
          status: BookingStatus.CONFIRMED,
          totalAmount: finalPrice,
        },
      });

      const seat = await tx.seat.findFirst({
        where: { busId: trip.busId, seatNumber: data.seatNumber },
      });

      const ticket = await tx.ticket.create({
        data: {
          bookingId: booking.id,
          tripId: data.tripId,
          userId: data.userId || null,
          seatId: seat?.id || null,
          seatNumber: data.seatNumber,
          fromStopId: data.fromStopId || null,
          toStopId: data.toStopId || null,
          voucherId: appliedVoucherId || null,
          ticketCode,
          qrCode,
          price: finalPrice,
          status: TicketStatus.BOOKED,
          reservationExpiresAt,
        },
      });

      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          ticketId: ticket.id,
          gatewayTransactionId: `TRANS-${Date.now()}`,
          paymentMethod: data.paymentMethod || PaymentMethod.VNPAY,
          amount: finalPrice,
          status: PaymentStatus.SUCCESS,
          electronicInvoiceCode: `INV-${Date.now().toString().slice(-8)}`,
          invoiceEmail: data.customerEmail || 'khachhang@gmail.com',
          paidAt: now,
        },
      });

      // Tạo thông báo nếu có userId
      if (data.userId) {
        await tx.notification.create({
          data: {
            userId: data.userId,
            title: 'Đặt vé thành công!',
            content: `Bạn đã đặt thành công vé ${ticketCode}, ghế ${data.seatNumber} trên tuyến ${trip.route.name}. Mã QR đã sẵn sàng trong vé của bạn.`,
            type: 'SYSTEM',
          },
        }).catch(() => null);
      }

      return { booking, ticket, payment, qrCode };
    });

    return result;
  }

  /**
   * Lấy danh sách vé của người dùng (US 4)
   */
  async getUserTickets(userId: string) {
    return this.prisma.ticket.findMany({
      where: { userId },
      include: {
        trip: {
          include: {
            route: true,
            bus: true,
          },
        },
        fromStop: true,
        toStop: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Soát vé bằng mã QR (US 15 - Tài xế / Phụ xe)
   */
  async verifyTicket(ticketCodeOrQr: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        OR: [
          { ticketCode: ticketCodeOrQr.trim() },
          { qrCode: ticketCodeOrQr.trim() },
        ],
      },
      include: {
        trip: {
          include: { route: true, bus: true },
        },
        user: {
          select: { fullName: true, phoneNumber: true, email: true, discountType: true },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Mã vé hoặc mã QR không hợp lệ!');
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      throw new BadRequestException('Vé này đã bị hủy hoặc hoàn tiền!');
    }

    if (ticket.status === TicketStatus.CHECKED_IN) {
      return {
        isValid: true,
        isAlreadyCheckedIn: true,
        message: `Vé đã được soát vào lúc ${ticket.checkedInAt?.toLocaleString('vi-VN')}`,
        ticket,
      };
    }

    // Đánh dấu đã soát vé trong MySQL
    const updated = await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.CHECKED_IN,
        checkedInAt: new Date(),
      },
      include: {
        trip: { include: { route: true, bus: true } },
        user: { select: { fullName: true, phoneNumber: true, email: true, discountType: true } },
      },
    });

    return {
      isValid: true,
      isAlreadyCheckedIn: false,
      message: 'Soát vé thành công! Hành khách được phép lên xe.',
      ticket: updated,
    };
  }

  /**
   * Hủy vé & Xử lý hoàn tiền tự động (US 5, US 8)
   */
  async cancelTicket(ticketId: string, userId?: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { trip: true, payments: true },
    });

    if (!ticket) {
      throw new NotFoundException('Không tìm thấy vé cần hủy!');
    }

    if (userId && ticket.userId && ticket.userId !== userId) {
      throw new BadRequestException('Bạn không có quyền hủy vé của người khác!');
    }

    if (ticket.status === TicketStatus.CHECKED_IN) {
      throw new BadRequestException('Vé đã được soát lên xe, không thể hủy!');
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      throw new BadRequestException('Vé này đã được hủy trước đó!');
    }

    // Cập nhật trạng thái vé và hoàn tiền trong MySQL
    await this.prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.CANCELLED },
      });

      if (ticket.bookingId) {
        await tx.booking.update({
          where: { id: ticket.bookingId },
          data: { status: BookingStatus.CANCELLED },
        });
      }

      await tx.payment.updateMany({
        where: { ticketId },
        data: { status: PaymentStatus.REFUNDED },
      });
    });

    return {
      message: 'Hủy vé và xử lý hoàn tiền thành công!',
      ticketId,
      refundAmount: ticket.price,
    };
  }
}
