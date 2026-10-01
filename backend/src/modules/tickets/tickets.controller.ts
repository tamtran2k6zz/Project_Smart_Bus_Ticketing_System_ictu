import {
  Controller,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketDetailDto } from './dto/ticket-detail.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('api/v1/tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * Endpoint: Truy xuất chi tiết vé điện tử theo mã vé.
   * GET /api/v1/tickets/:ticket_code
   * Header: Authorization: Bearer <JWT>
   */
  @Get(':ticket_code')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getTicketDetail(
    @Param('ticket_code') ticketCode: string,
  ): Promise<TicketDetailDto> {
    return this.ticketsService.getTicketByCode(ticketCode);
  }
}
