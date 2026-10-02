import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
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
   * Endpoint 1: Create payment URL (VNPay or MoMo Sandbox)
   *
   * Luồng nghiệp vụ:
   *  1. Kiểm tra booking tồn tại và đang ở trạng thái PENDING.
   *  2. Kiểm tra thời gian giữ chỗ (mặc định 10 phút) còn hiệu lực.
   *  3. Tạo bản ghi payment (PENDING) trong MySQL.
   *  4. Ký số và sinh URL thanh toán (VNPay HMAC-SHA512 / MoMo HMAC-SHA256).
   *  5. Lưu payment_url và trả về response chuẩn.
   */
  async createPaymentUrl(
    dto: CreatePaymentDto,
    clientIp?: string,
  ): Promise<CreatePaymentResponseDto> {
    try {
      // 1. Kiểm tra booking_id có tồn tại trong MySQL
      const booking = await this.prisma.booking.findUnique({
        where: { id: dto.booking_id },
      });

      if (!booking) {
        this.logger.warn(`createPaymentUrl: Booking not found -> ${dto.booking_id}`);
        throw new NotFoundException(
          `Không tìm thấy đơn đặt vé với mã ${dto.booking_id}`,
        );
      }

      // 2. Booking phải đang ở trạng thái PENDING (chờ thanh toán)
      if (booking.status !== 'PENDING') {
        this.logger.warn(
          `createPaymentUrl: Booking ${booking.id} không ở trạng thái PENDING (hiện tại: ${booking.status})`,
        );
        throw new BadRequestException(
          `Đơn đặt vé không ở trạng thái chờ thanh toán (hiện tại: ${booking.status})`,
        );
      }

      // 3. Kiểm tra thời hạn giữ chỗ (mặc định 10 phút) đã hết chưa
      const now = new Date();
      if (now > new Date(booking.expiresAt)) {
        this.logger.warn(
          `createPaymentUrl: Booking ${booking.id} đã hết hạn giữ chỗ (${booking.expiresAt})`,
        );
        // Tự động chuyển sang EXPIRED nếu đã hết hạn giữ chỗ
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'EXPIRED' },
        });
        throw new BadRequestException('Đơn đặt vé đã hết hạn thanh toán');
      }

      const amount = Number(booking.totalAmount);
      const orderInfo = `Thanh toan ve xe bus - Don hang ${booking.id}`;

      // 4. Tạo bản ghi payment mới với status = PENDING
      //    transactionNo: mã giao dịch nội bộ tham chiếu gửi sang cổng thanh toán
      const payment = await this.prisma.payment.create({
        data: {
          bookingId: booking.id,
          paymentMethod: dto.payment_method,
          transactionNo: `${dto.payment_method}-${Date.now()}-${booking.id.slice(0, 8)}`,
          amount,
          currency: 'VND',
          status: PaymentStatusEnum.PENDING,
        },
      });

      // 5. Sinh URL thanh toán theo từng cổng
      let paymentUrl: string;
      let qrCodeUrl: string | undefined;
      let rawResponse: Record<string, any> | undefined;

      if (dto.payment_method === PaymentMethodEnum.VNPAY) {
        // VNPay: sắp xếp tham số alphabet + ký HMAC-SHA512 -> trả về URL redirect
        paymentUrl = this.vnpayService.createPaymentUrl({
          orderId: payment.id,
          amount,
          orderInfo,
          ipAddr: clientIp,
          bankCode: dto.bank_code,
          returnUrl: dto.return_url,
        });
      } else if (dto.payment_method === PaymentMethodEnum.MOMO) {
        // MoMo: ký HMAC-SHA256 theo chuẩn v2 + gọi API Sandbox qua Axios
        const momoResponse = await this.momoService.createPaymentUrl({
          orderId: payment.id,
          amount,
          orderInfo,
          redirectUrl: dto.return_url,
        });
        paymentUrl = momoResponse.payUrl;
        qrCodeUrl = momoResponse.qrCodeUrl;
        rawResponse = momoResponse as unknown as Record<string, any>;
      } else {
        throw new BadRequestException(
          `Phương thức thanh toán không được hỗ trợ: ${dto.payment_method}`,
        );
      }

      // 6. Lưu payment_url (và raw response nếu có) vào database
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentUrl,
          ...(rawResponse ? { rawResponse } : {}),
        },
      });

      // 7. Trả về response chuẩn
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Tạo đường dẫn thanh toán thành công',
        data: {
          payment_url: paymentUrl,
          ...(qrCodeUrl ? { qr_code_url: qrCodeUrl } : {}),
          expires_at: new Date(booking.expiresAt).toISOString(),
        },
      };
    } catch (error) {
      // Các HttpException đã chuẩn (400/404) thì ném lại nguyên trạng
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `createPaymentUrl failed for booking ${dto.booking_id}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi trong quá trình tạo đường dẫn thanh toán',
      );
    }
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

      // Kiểm tra số tiền khớp (VNPay gửi amount đã nhân với 100)
      const receivedAmount = Number(query.vnp_Amount) / 100;
      if (Math.round(receivedAmount) !== Math.round(Number(payment.amount))) {
        this.logger.error(
          `VNPay IPN amount mismatch. Expected: ${payment.amount}, Received: ${receivedAmount}`,
        );
        return { RspCode: '04', Message: 'Amount invalid' };
      }

      // Idempotency: Nếu đơn đã xử lý THÀNH CÔNG trước đó -> trả kết quả thành công luôn,
      // KHÔNG cập nhật lại DB (tránh xử lý trùng khi VNPay retry IPN)
      if (payment.status === PaymentStatusEnum.SUCCESS) {
        this.logger.log(`VNPay IPN Idempotent hit: Payment ${paymentId} already SUCCESS`);
        return { RspCode: '00', Message: 'Confirm Success' };
      }

      // Các trạng thái đã xử lý khác (FAILED/REFUNDED): coi như đã xác nhận trước đó
      if (payment.status !== PaymentStatusEnum.PENDING) {
        this.logger.log(`VNPay IPN: Payment ${paymentId} không ở trạng thái PENDING (${payment.status})`);
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
      throw new BadRequestException('Invalid signature');
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
        throw new NotFoundException(`Order not found: ${paymentId}`);
      }

      // Kiểm tra số tiền khớp với dữ liệu trong DB
      if (Math.round(Number(body.amount)) !== Math.round(Number(payment.amount))) {
        this.logger.error(
          `MoMo IPN amount mismatch. Expected: ${payment.amount}, Received: ${body.amount}`,
        );
        throw new BadRequestException('Amount invalid');
      }

      // Idempotency: Nếu đơn đã xử lý THÀNH CÔNG trước đó -> trả kết quả thành công,
      // KHÔNG cập nhật lại DB (tránh xử lý trùng khi MoMo retry IPN)
      if (payment.status === PaymentStatusEnum.SUCCESS) {
        this.logger.log(`MoMo IPN Idempotent hit: Payment ${paymentId} already SUCCESS`);
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
        message: 'Success',
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

