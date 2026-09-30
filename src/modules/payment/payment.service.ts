import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { VNPayService } from './services/vnpay.service';
import { MoMoService } from './services/momo.service';
import {
  CreatePaymentDto,
  CreatePaymentResponseDto,
  PaymentMethodEnum,
  PaymentStatusEnum,
  VNPayIpnDto,
  VNPayIpnResponseDto,
  MoMoIpnDto,
  MoMoIpnResponseDto,
} from './dto/payment.dto';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly vnpayService: VNPayService,
    private readonly momoService: MoMoService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
  }

  /**
   * Endpoint 1: Create payment URL (VNPay or MoMo)
   */
  async createPaymentUrl(
    dto: CreatePaymentDto,
    clientIp?: string,
  ): Promise<CreatePaymentResponseDto> {
    // 1. Kiểm tra booking_id có tồn tại
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.booking_id },
    });

    if (!booking) {
      this.logger.warn(`Booking not found: ${dto.booking_id}`);
      throw new NotFoundException(`Booking with ID ${dto.booking_id} not found`);
    }

    // Kiểm tra trạng thái PENDING
    if (booking.status !== 'PENDING') {
      this.logger.warn(`Booking ${booking.id} is in status ${booking.status}, cannot pay`);
      throw new BadRequestException(
        `Booking is not in PENDING status (current: ${booking.status})`,
      );
    }

    // Kiểm tra thời hạn giữ chỗ (10 phút)
    const now = new Date();
    if (now > new Date(booking.expiresAt)) {
      this.logger.warn(`Booking ${booking.id} hold time expired at ${booking.expiresAt}`);
      // Tự động hủy nếu đã hết hạn
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Booking hold time (10 minutes) has expired');
    }

    // 2. Tạo bản ghi payment với trạng thái PENDING
    const payment = await this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        paymentMethod: dto.payment_method,
        amount: booking.totalAmount,
        currency: 'VND',
        status: 'PENDING',
      },
    });

    // 3. Tạo chữ ký số và URL thanh toán
    let paymentUrl: string;
    const orderInfo = `Thanh toan ve xe bus - Don hang ${booking.id}`;

    if (dto.payment_method === PaymentMethodEnum.VNPAY) {
      paymentUrl = this.vnpayService.createPaymentUrl({
        orderId: payment.id,
        amount: Number(payment.amount),
        orderInfo,
        ipAddr: clientIp,
        bankCode: dto.bank_code,
      });
    } else if (dto.payment_method === PaymentMethodEnum.MOMO) {
      paymentUrl = await this.momoService.createPaymentUrl({
        orderId: payment.id,
        amount: Number(payment.amount),
        orderInfo,
      });
    } else {
      throw new BadRequestException(`Unsupported payment method: ${dto.payment_method}`);
    }

    // Lưu payment_url vào database
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { paymentUrl },
    });

    return {
      payment_id: payment.id,
      booking_id: booking.id,
      payment_method: dto.payment_method,
      amount: Number(payment.amount),
      currency: payment.currency,
      payment_url: paymentUrl,
      expires_at: booking.expiresAt,
    };
  }

  /**
   * Endpoint 2A: Process VNPay IPN (Webhook GET)
   */
  async handleVNPayIpn(query: VNPayIpnDto): Promise<VNPayIpnResponseDto> {
    this.logger.log(`Received VNPay IPN for TxnRef: ${query.vnp_TxnRef}`);

    // 1. Validate chữ ký checksum HMAC-SHA512
    const isValidSignature = this.vnpayService.verifyChecksum(query);
    if (!isValidSignature) {
      this.logger.error(`Invalid VNPay checksum for TxnRef: ${query.vnp_TxnRef}`);
      return { RspCode: '97', Message: 'Invalid Checksum' };
    }

    const paymentId = query.vnp_TxnRef;
    const lockToken = crypto.randomUUID();
    const lockKey = `lock:payment:${paymentId}`;

    // 2. Dùng Distributed Lock (Redis) để tránh Race Condition khi gateway retry IPN song song
    const acquired = await this.redisService.acquireLock(lockKey, lockToken, 10000);
    if (!acquired) {
      this.logger.warn(`Could not acquire lock for payment ${paymentId} - concurrent IPN call`);
      return { RspCode: '99', Message: 'Concurrent transaction processing' };
    }

    try {
      // 3. Tìm giao dịch payment
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: { booking: true },
      });

      if (!payment) {
        this.logger.warn(`VNPay IPN: Payment not found for ID ${paymentId}`);
        return { RspCode: '01', Message: 'Order not found' };
      }

      // Kiểm tra số tiền khớp
      const receivedAmount = Number(query.vnp_Amount) / 100;
      if (Math.round(receivedAmount) !== Math.round(Number(payment.amount))) {
        this.logger.error(
          `VNPay IPN amount mismatch. Expected: ${payment.amount}, Received: ${receivedAmount}`,
        );
        return { RspCode: '04', Message: 'Invalid amount' };
      }

      // Idempotency: Kiểm tra trạng thái đơn hàng. Nếu đã khác PENDING -> đã xử lý rồi!
      if (payment.status !== 'PENDING') {
        this.logger.log(`VNPay IPN Idempotent hit: Payment ${paymentId} already in status ${payment.status}`);
        return { RspCode: '02', Message: 'Order already confirmed' };
      }

      // Kiểm tra kết quả giao dịch từ VNPay
      const isSuccess =
        query.vnp_ResponseCode === '00' &&
        (!query.vnp_TransactionStatus || query.vnp_TransactionStatus === '00');

      // 4. DB Transaction: Cập nhật Payment & Booking nguyên tử
      await this.prisma.$transaction(async (tx) => {
        if (isSuccess) {
          // Sinh mã vé QR Code
          const qrCodeData = `SMARTBUS_TICKET:${payment.bookingId}:${query.vnp_TransactionNo}:${Date.now()}`;

          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatusEnum.SUCCESS,
              transactionNo: query.vnp_TransactionNo,
              rawResponse: query as any,
            },
          });

          await tx.booking.update({
            where: { id: payment.bookingId },
            data: {
              status: 'CONFIRMED',
              qrCode: qrCodeData,
            },
          });

          this.logger.log(`VNPay Payment ${paymentId} confirmed successfully for booking ${payment.bookingId}`);
        } else {
          // Giao dịch thất bại
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatusEnum.FAILED,
              transactionNo: query.vnp_TransactionNo,
              rawResponse: query as any,
            },
          });

          await tx.booking.update({
            where: { id: payment.bookingId },
            data: {
              status: 'CANCELLED',
            },
          });

          this.logger.warn(`VNPay Payment ${paymentId} failed with code ${query.vnp_ResponseCode}. Booking cancelled.`);
        }
      });

      return { RspCode: '00', Message: 'Confirm Success' };
    } catch (error) {
      this.logger.error(`Error processing VNPay IPN for ${paymentId}: ${error.message}`);
      return { RspCode: '99', Message: 'Unknown error' };
    } finally {
      await this.redisService.releaseLock(lockKey, lockToken);
    }
  }

  /**
   * Endpoint 2B: Process MoMo IPN (Webhook POST)
   */
  async handleMoMoIpn(body: MoMoIpnDto): Promise<MoMoIpnResponseDto> {
    this.logger.log(`Received MoMo IPN for orderId: ${body.orderId}`);

    // 1. Validate chữ ký checksum HMAC-SHA256
    const isValidSignature = this.momoService.verifyChecksum(body);
    if (!isValidSignature) {
      this.logger.error(`Invalid MoMo signature for orderId: ${body.orderId}`);
      throw new BadRequestException({
        resultCode: 99,
        message: 'Invalid signature',
      });
    }

    const paymentId = body.orderId;
    const lockToken = crypto.randomUUID();
    const lockKey = `lock:payment:${paymentId}`;

    // 2. Dùng Distributed Lock (Redis) để tránh Race Condition
    const acquired = await this.redisService.acquireLock(lockKey, lockToken, 10000);
    if (!acquired) {
      this.logger.warn(`Could not acquire lock for payment ${paymentId} - concurrent MoMo IPN call`);
      return {
        partnerCode: body.partnerCode,
        requestId: body.requestId,
        orderId: body.orderId,
        resultCode: 99,
        message: 'Concurrent transaction processing',
        responseTime: Date.now(),
        extraData: body.extraData || '',
      };
    }

    try {
      // 3. Tìm giao dịch payment
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: { booking: true },
      });

      if (!payment) {
        this.logger.warn(`MoMo IPN: Payment not found for ID ${paymentId}`);
        return {
          partnerCode: body.partnerCode,
          requestId: body.requestId,
          orderId: body.orderId,
          resultCode: 1,
          message: 'Order not found',
          responseTime: Date.now(),
          extraData: body.extraData || '',
        };
      }

      // Idempotency: Nếu đã xử lý rồi -> Trả về kết quả thành công cho MoMo
      if (payment.status !== 'PENDING') {
        this.logger.log(`MoMo IPN Idempotent hit: Payment ${paymentId} already in status ${payment.status}`);
        return {
          partnerCode: body.partnerCode,
          requestId: body.requestId,
          orderId: body.orderId,
          resultCode: 0,
          message: 'Order already processed',
          responseTime: Date.now(),
          extraData: body.extraData || '',
        };
      }

      const isSuccess = body.resultCode === 0;

      // 4. DB Transaction: Cập nhật Payment & Booking nguyên tử
      await this.prisma.$transaction(async (tx) => {
        if (isSuccess) {
          const qrCodeData = `SMARTBUS_TICKET:${payment.bookingId}:${body.transId}:${Date.now()}`;

          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatusEnum.SUCCESS,
              transactionNo: String(body.transId),
              rawResponse: body as any,
            },
          });

          await tx.booking.update({
            where: { id: payment.bookingId },
            data: {
              status: BookingStatus.CONFIRMED,
              qrCode: qrCodeData,
            },
          });

          this.logger.log(`MoMo Payment ${paymentId} confirmed successfully for booking ${payment.bookingId}`);
        } else {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatusEnum.FAILED,
              transactionNo: String(body.transId),
              rawResponse: body as any,
            },
          });

          await tx.booking.update({
            where: { id: payment.bookingId },
            data: {
              status: 'CANCELLED',
            },
          });

          this.logger.warn(`MoMo Payment ${paymentId} failed with code ${body.resultCode}. Booking cancelled.`);
        }
      });

      return {
        partnerCode: body.partnerCode,
        requestId: body.requestId,
        orderId: body.orderId,
        resultCode: 0,
        message: 'Confirm Success',
        responseTime: Date.now(),
        extraData: body.extraData || '',
      };
    } catch (error) {
      this.logger.error(`Error processing MoMo IPN for ${paymentId}: ${error.message}`);
      throw error;
    } finally {
      await this.redisService.releaseLock(lockKey, lockToken);
    }
  }

  /**
   * Endpoint 3A: VNPay Return URL (Frontend Client Redirect)
   */
  async handleVNPayReturn(queryParams: Record<string, any>) {
    const isValid = this.vnpayService.verifyChecksum(queryParams);
    const paymentId = queryParams.vnp_TxnRef;

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });

    const isSuccess = isValid && queryParams.vnp_ResponseCode === '00';
    const bookingId = payment?.bookingId;

    const redirectUrl = isSuccess
      ? `${this.frontendUrl}/booking/success?bookingId=${bookingId}&txnRef=${paymentId}`
      : `${this.frontendUrl}/booking/failed?bookingId=${bookingId}&code=${queryParams.vnp_ResponseCode}`;

    return {
      isValid,
      isSuccess,
      paymentId,
      bookingId,
      transactionNo: queryParams.vnp_TransactionNo,
      responseCode: queryParams.vnp_ResponseCode,
      redirectUrl,
    };
  }

  /**
   * Endpoint 3B: MoMo Return URL (Frontend Client Redirect)
   */
  async handleMoMoReturn(queryParams: Record<string, any>) {
    const paymentId = queryParams.orderId;
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });

    const resultCode = Number(queryParams.resultCode);
    const isSuccess = resultCode === 0;
    const bookingId = payment?.bookingId;

    const redirectUrl = isSuccess
      ? `${this.frontendUrl}/booking/success?bookingId=${bookingId}&orderId=${paymentId}`
      : `${this.frontendUrl}/booking/failed?bookingId=${bookingId}&code=${resultCode}`;

    return {
      isSuccess,
      paymentId,
      bookingId,
      transactionNo: queryParams.transId,
      resultCode,
      redirectUrl,
    };
  }
}

