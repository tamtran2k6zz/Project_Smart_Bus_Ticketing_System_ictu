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
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
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
   * Endpoint 1: Khởi tạo URL thanh toán
   * POST /api/v1/payments/create-url
   */
  @Post('create-url')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
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
   * Endpoint 2A: Webhook / IPN từ VNPay (VNPay gọi qua GET method)
   * GET /api/v1/payments/vnpay-ipn
   */
  @Get('vnpay-ipn')
  @HttpCode(HttpStatus.OK)
  async handleVNPayIpn(@Query() query: VNPayIpnDto): Promise<VNPayIpnResponseDto> {
    return this.paymentService.handleVNPayIpn(query);
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

