import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { OperationsService } from './operations.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IncidentType, IncidentSeverity } from '@prisma/client';

@ApiTags('Operations & Reports (Voucher, Sự cố, Đánh giá & Báo cáo MySQL)')
@Controller('api/v1/operations')
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get('vouchers')
  @ApiOperation({ summary: 'Lấy danh sách mã giảm giá Voucher đang kích hoạt (US 18)' })
  getActiveVouchers() {
    return this.operationsService.getActiveVouchers();
  }

  @Post('incidents')
  @ApiOperation({ summary: 'Tài xế báo cáo sự cố đường sá hoặc trễ chuyến (US 11)' })
  reportIncident(
    @Body()
    body: {
      tripId: string;
      driverId?: string;
      incidentType: IncidentType;
      severity?: IncidentSeverity;
      description: string;
      delayMinutes: number;
      actionTaken?: string;
    },
  ) {
    return this.operationsService.reportIncident(body);
  }

  @Get('incidents')
  @ApiOperation({ summary: 'Xem danh sách các sự cố vận hành đã báo cáo' })
  getIncidents() {
    return this.operationsService.getIncidents();
  }

  @Post('feedbacks')
  @ApiOperation({ summary: 'Hành khách gửi đánh giá chất lượng chuyến xe (US 24)' })
  submitFeedback(
    @Body()
    body: {
      userId?: string;
      tripId: string;
      ratingStars: number;
      criteria?: string;
      content: string;
    },
  ) {
    return this.operationsService.submitFeedback(body);
  }

  @Get('feedbacks')
  @ApiOperation({ summary: 'Xem danh sách phản hồi và khiếu nại của hành khách' })
  getFeedbacks() {
    return this.operationsService.getFeedbacks();
  }

  @Get('dashboard/summary')
  @ApiOperation({ summary: 'Báo cáo doanh thu & Tỷ lệ lấp đầy chỗ tổng hợp trực tiếp từ MySQL (US 19, 20)' })
  getDashboardSummary() {
    return this.operationsService.getDashboardSummary();
  }
}
