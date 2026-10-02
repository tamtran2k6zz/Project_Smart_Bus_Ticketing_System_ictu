import { createHmac } from 'crypto';
import { readEnv } from '../config/env';
import { appLogger } from '../config/logger';

const logger = appLogger.child('refund');

export type RefundPaymentMethod = 'VNPAY' | 'MOMO';

export interface RefundPayment {
  paymentMethod: RefundPaymentMethod;
  amount: number;
  gatewayTransactionId: string | null;
  refundRequestId: string;
  paidAt: Date | null;
  bookingCode: string;
}

export class PaymentRefundError extends Error {
  constructor(
    message: string,
    public statusCode = 503
  ) {
    super(message);
    this.name = 'PaymentRefundError';
  }
}

export class PaymentRefundService {
  async refund(payment: RefundPayment): Promise<void> {
    if (!payment.gatewayTransactionId) {
      throw new PaymentRefundError('Giao dịch chưa có mã giao dịch thực từ cổng thanh toán.', 400);
    }
    if (!Number.isSafeInteger(payment.amount) || payment.amount <= 0) {
      throw new PaymentRefundError('Số tiền hoàn phải là số nguyên dương VND.', 400);
    }
    if (payment.paymentMethod === 'VNPAY') return this.refundVnpay(payment);
    if (payment.paymentMethod === 'MOMO') return this.refundMomo(payment);
    throw new PaymentRefundError('Chưa hỗ trợ hoàn tiền cho cổng này.', 400);
  }

  private async refundVnpay(payment: RefundPayment): Promise<void> {
    const request: Record<string, string> = {
      vnp_RequestId: payment.refundRequestId,
      vnp_Version: '2.1.0',
      vnp_Command: 'refund',
      vnp_TmnCode: this.requiredEnv('VNPAY_TMN_CODE'),
      vnp_TransactionType: '02',
      vnp_TxnRef: payment.bookingCode,
      vnp_Amount: String(payment.amount * 100),
      vnp_TransactionNo: payment.gatewayTransactionId!,
      vnp_TransactionDate: this.toVnpayDate(payment.paidAt),
      vnp_CreateBy: readEnv('PAYMENT_REFUND_OPERATOR') || 'smartbus-system',
      vnp_CreateDate: this.toVnpayDate(new Date()),
      vnp_IpAddr: readEnv('PAYMENT_REFUND_IP') || '127.0.0.1',
      vnp_OrderInfo: `Hoan tien ve ${payment.bookingCode}`,
    };
    const fields = [
      'vnp_RequestId',
      'vnp_Version',
      'vnp_Command',
      'vnp_TmnCode',
      'vnp_TransactionType',
      'vnp_TxnRef',
      'vnp_Amount',
      'vnp_TransactionNo',
      'vnp_TransactionDate',
      'vnp_CreateBy',
      'vnp_CreateDate',
      'vnp_IpAddr',
      'vnp_OrderInfo',
    ];
    request.vnp_SecureHash = createHmac('sha512', this.requiredEnv('VNPAY_HASH_SECRET'))
      .update(fields.map(field => request[field]).join('|'))
      .digest('hex');
    const response = await this.postJson(
      readEnv('VNPAY_REFUND_URL') ||
        'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
      request
    );
    if (response.vnp_ResponseCode !== '00') {
      logger.error('vnpay_refund_rejected', {
        order_id: payment.bookingCode,
        gateway_transaction_id: payment.gatewayTransactionId,
        response_code: String(response.vnp_ResponseCode || 'unknown'),
      });
      throw new PaymentRefundError(
        `VNPay từ chối hoàn tiền (mã ${response.vnp_ResponseCode || 'không xác định'}).`
      );
    }
  }

  private async refundMomo(payment: RefundPayment): Promise<void> {
    const partnerCode = this.requiredEnv('MOMO_PARTNER_CODE');
    const accessKey = this.requiredEnv('MOMO_ACCESS_KEY');
    const secretKey = this.requiredEnv('MOMO_SECRET_KEY');
    const transId = Number(payment.gatewayTransactionId);
    if (!Number.isSafeInteger(transId) || transId <= 0) {
      throw new PaymentRefundError('Mã giao dịch MoMo không hợp lệ.', 400);
    }
    const description = `Hoan tien ve ${payment.bookingCode}`;
    const signature = createHmac('sha256', secretKey)
      .update(
        [
          `accessKey=${accessKey}`,
          `amount=${payment.amount}`,
          `description=${description}`,
          `orderId=${payment.bookingCode}`,
          `partnerCode=${partnerCode}`,
          `requestId=${payment.refundRequestId}`,
          `transId=${transId}`,
        ].join('&')
      )
      .digest('hex');
    const response = await this.postJson(
      readEnv('MOMO_REFUND_URL') || 'https://test-payment.momo.vn/v2/gateway/api/refund',
      {
        partnerCode,
        orderId: payment.bookingCode,
        requestId: payment.refundRequestId,
        amount: payment.amount,
        transId,
        lang: 'vi',
        description,
        signature,
      }
    );
    if (Number(response.resultCode) !== 0) {
      logger.error('momo_refund_rejected', {
        order_id: payment.bookingCode,
        gateway_transaction_id: payment.gatewayTransactionId,
        result_code: String(response.resultCode ?? 'unknown'),
      });
      throw new PaymentRefundError(
        `MoMo từ chối hoàn tiền (mã ${response.resultCode ?? 'không xác định'}).`
      );
    }
  }

  private requiredEnv(name: string): string {
    const value = readEnv(name);
    if (!value) {
      logger.error('missing_required_configuration', { variable: name, operation: 'refund' });
      throw new PaymentRefundError(`Thiếu cấu hình ${name} để gửi yêu cầu hoàn tiền.`);
    }
    return value;
  }

  private async postJson(
    url: string,
    payload: Record<string, string | number>
  ): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok)
        throw new PaymentRefundError(`Cổng thanh toán trả về HTTP ${response.status}.`);
      const body: unknown = await response.json();
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new PaymentRefundError('Cổng thanh toán trả về phản hồi không hợp lệ.');
      }
      return body as Record<string, unknown>;
    } catch (error) {
      if (error instanceof PaymentRefundError) throw error;
      throw new PaymentRefundError('Không thể kết nối cổng thanh toán để hoàn tiền.');
    } finally {
      clearTimeout(timeout);
    }
  }

  private toVnpayDate(date: Date | null): string {
    if (!date || Number.isNaN(date.getTime())) {
      throw new PaymentRefundError('Thiếu thời điểm thanh toán gốc để hoàn tiền VNPay.', 400);
    }
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`;
  }
}
