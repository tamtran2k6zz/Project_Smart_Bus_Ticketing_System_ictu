import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UsePipes,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CreatePaymentDto,
  CreatePaymentResponseDto,
  VNPayIpnDto,
  VNPayIpnResponseDto,
  MoMoIpnDto,
  MoMoIpnResponseDto,
} from './dto/payment.dto';

@Controller('api/v1/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Endpoint 1: Khởi tạo URL thanh toán (VNPay / MoMo Sandbox)
   * POST /api/v1/payments/create-url
   * Header: Authorization: Bearer <JWT>
   */
  @Post('create-url')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async createPaymentUrl(
    @Body() dto: CreatePaymentDto,
    @Req() req: Request,
  ): Promise<CreatePaymentResponseDto> {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    return this.paymentService.createPaymentUrl(dto, clientIp);
  }

  /**
   * Endpoint 2A: Webhook / IPN từ VNPay (VNPay gọi qua GET method - mặc định)
   * GET /api/v1/payments/vnpay-ipn
   *
   * Lưu ý: KHÔNG dùng ValidationPipe/whitelist cho IPN VNPay vì chữ ký
   * được tính trên TOÀN BỘ tham số `vnp_*` mà VNPay gửi tới.
   */
  @Get('vnpay-ipn')
  @HttpCode(HttpStatus.OK)
  async handleVNPayIpn(@Query() query: VNPayIpnDto): Promise<VNPayIpnResponseDto> {
    return this.paymentService.handleVNPayIpn(query);
  }

  /**
   * Endpoint 2A (POST): Webhook / IPN từ VNPay (một số kênh/tài liệu VNPay gọi qua POST)
   * POST /api/v1/payments/vnpay-ipn
   */
  @Post('vnpay-ipn')
  @HttpCode(HttpStatus.OK)
  async handleVNPayIpnPost(
    @Body() body: VNPayIpnDto,
  ): Promise<VNPayIpnResponseDto> {
    return this.paymentService.handleVNPayIpn(body);
  }

  /**
   * Endpoint 2B: Webhook / IPN từ MoMo (MoMo gọi qua POST method)
   * POST /api/v1/payments/momo-ipn
   */
  @Post('momo-ipn')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async handleMoMoIpn(@Body() body: MoMoIpnDto): Promise<MoMoIpnResponseDto> {
    return this.paymentService.handleMoMoIpn(body);
  }

  /**
   * Endpoint 3A: Callback Return URL từ VNPay cho Frontend
   * GET /api/v1/payments/vnpay-return
   */
  @Get('vnpay-return')
  async handleVNPayReturn(
    @Query() query: Record<string, any>,
    @Res() res: Response,
  ) {
    const result = await this.paymentService.handleVNPayReturn(query);
    // Chuyển hướng người dùng về trang giao diện kết quả đơn hàng trên Frontend
    return res.redirect(result.redirectUrl);
  }

  /**
   * Endpoint 3B: Callback Return URL từ MoMo cho Frontend
   * GET /api/v1/payments/momo-return
   */
  @Get('momo-return')
  async handleMoMoReturn(
    @Query() query: Record<string, any>,
    @Res() res: Response,
  ) {
    const result = await this.paymentService.handleMoMoReturn(query);
    // Chuyển hướng người dùng về trang giao diện kết quả đơn hàng trên Frontend
    return res.redirect(result.redirectUrl);
  }
}

