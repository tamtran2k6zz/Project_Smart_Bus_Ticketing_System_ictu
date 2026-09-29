import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TicketingService } from './ticketing.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PaymentMethod } from '@prisma/client';

@ApiTags('Ticketing (Đặt vé, Sơ đồ ghế, Mã QR & Soát vé MySQL)')
@Controller('api/v1/ticketing')
export class TicketingController {
  constructor(private readonly ticketingService: TicketingService) {}

  @Get('trips/:tripId/seats')
  @ApiOperation({ summary: 'Lấy sơ đồ ghế và tình trạng trống thực tế của chuyến xe (US 2)' })
  getTripSeats(@Param('tripId') tripId: string) {
    return this.ticketingService.getTripSeats(tripId);
  }

  @Post('bookings')
  @ApiOperation({ summary: 'Đặt vé và giữ chỗ 10 phút, tạo mã QR Code (US 2, 3, 4, 6)' })
  createBooking(
    @Body()
    body: {
      tripId: string;
      userId?: string;
      seatNumber: string;
      fromStopId?: string;
      toStopId?: string;
      voucherCode?: string;
      paymentMethod?: PaymentMethod;
      customerEmail?: string;
    },
  ) {
    return this.ticketingService.createBooking(body);
  }

  @Get('my-tickets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách vé đã mua của hành khách (US 4)' })
  getMyTickets(@Req() req: any) {
    return this.ticketingService.getUserTickets(req.user.sub || req.user.id);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Soát vé bằng quét mã QR hoặc nhập mã vé (US 15 - Tài xế/Phụ xe)' })
  verifyTicket(@Body('code') code: string) {
    return this.ticketingService.verifyTicket(code);
  }

  @Post('tickets/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hủy vé và xử lý hoàn tiền tự động (US 5, US 8)' })
  cancelTicket(@Param('id') id: string, @Req() req: any) {
    return this.ticketingService.cancelTicket(id, req.user.sub || req.user.id);
  }
}
