import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../database/prisma.service';
import { TicketDetailDto } from './dto/ticket-detail.dto';

interface QrTicketInput {
  ticketCode: string;
  tripId: number;
  seatNumber: string | null;
  status: string;
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Truy xuất chi tiết vé điện tử theo mã vé.
   *
   * Join Prisma: Ticket -> Trip -> (Route -> RouteStop -> BusStop), Bus, Driver (User)
   *               Ticket -> User (hành khách)
   *
   * @param ticketCode Mã vé điện tử (ticket_code)
   * @throws NotFoundException nếu không tìm thấy vé
   */
  async getTicketByCode(ticketCode: string): Promise<TicketDetailDto> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketCode },
      include: {
        user: true,
        trip: {
          include: {
            bus: true,
            driver: true,
            route: {
              include: {
                routeStops: {
                  include: { busStop: true },
                  orderBy: { stopOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      this.logger.warn(`Không tìm thấy vé điện tử với mã: ${ticketCode}`);
      throw new NotFoundException('Vé điện tử không tồn tại');
    }

    const trip = ticket.trip;
    const route = trip?.route;
    const routeStops = route?.routeStops ?? [];
    const originStop = routeStops[0]?.busStop?.name ?? '';
    const destinationStop = routeStops[routeStops.length - 1]?.busStop?.name ?? '';

    const qrCodeBase64 = await this.generateQrCodeDataUrl({
      ticketCode: ticket.ticketCode,
      tripId: ticket.tripId,
      seatNumber: ticket.seatNumber,
      status: ticket.status,
    });

    return {
      ticket_code: ticket.ticketCode,
      seat_code: ticket.seatNumber ?? '',
      price: Number(ticket.fareAmount),
      status: ticket.status,
      passenger_name: ticket.user?.fullName ?? 'Khách hàng',
      route_name: route?.name ?? '',
      origin_stop: originStop,
      destination_stop: destinationStop,
      departure_time: trip?.departureTime
        ? new Date(trip.departureTime).toISOString()
        : '',
      arrival_time: trip?.arrivalTime
        ? new Date(trip.arrivalTime).toISOString()
        : '',
      bus_plate_number: trip?.busPlate || trip?.bus?.plateNumber || '',
      bus_type: trip?.bus?.busType ?? '',
      driver_name: trip?.driver?.fullName ?? '',
      driver_phone: trip?.driver?.phoneNumber ?? '',
      qr_code_base64: qrCodeBase64,
    };
  }

  /**
   * Sinh ảnh mã QR (Data URL, Base64) từ thông tin định danh vé.
   */
  private async generateQrCodeDataUrl(ticket: QrTicketInput): Promise<string> {
    const payload = JSON.stringify({
      ticket_code: ticket.ticketCode,
      trip_id: ticket.tripId,
      seat_number: ticket.seatNumber,
      status: ticket.status,
    });

    return QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
  }
}
