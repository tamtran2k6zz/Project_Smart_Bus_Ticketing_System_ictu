import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { getGatewayCallbacks, readGatewayEnv, readEnv } from '../config/env';
import { appLogger } from '../config/logger';

const logger = appLogger.child('gateway');

export type OnlinePaymentMethod = 'VNPAY' | 'MOMO';

export class PaymentGatewayService {
  async createPaymentUrl(
    method: OnlinePaymentMethod,
    orderId: string,
    amount: number,
    clientIp: string
  ): Promise<string> {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new Error('Số tiền thanh toán không hợp lệ.');
    }

    if (method === 'VNPAY') {
      return this.createVnpayUrl(orderId, amount, clientIp);
    }
    return this.createMomoPayment(orderId, amount);
  }

  verifyVnpayCallback(params: Record<string, string>): boolean {
    const secureHash = params.vnp_SecureHash;
    const hashSecret = readGatewayEnv('VNPAY_HASH_SECRET');
    if (!secureHash || !hashSecret) {
      logger.warn('vnpay_signature_missing_config', {
        has_secure_hash: Boolean(secureHash),
        has_hash_secret: Boolean(hashSecret),
      });
      return false;
    }

    const signedParams = Object.fromEntries(
      Object.entries(params).filter(
        ([key]) => key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType'
      )
    );
    const expected = this.hmac('sha512', hashSecret, this.encodeSortedParams(signedParams));
    return this.safeEqual(secureHash.toLowerCase(), expected.toLowerCase());
  }

  verifyMomoCallback(payload: Record<string, unknown>): boolean {
    const accessKey = readGatewayEnv('MOMO_ACCESS_KEY');
    const secretKey = readGatewayEnv('MOMO_SECRET_KEY');
    const signature = payload.signature;
    if (!accessKey || !secretKey || typeof signature !== 'string') {
      return false;
    }

    const signedFields = [
      ['accessKey', accessKey],
      ['amount', payload.amount],
      ['extraData', payload.extraData],
      ['message', payload.message],
      ['orderId', payload.orderId],
      ['orderInfo', payload.orderInfo],
      ['orderType', payload.orderType],
      ['partnerCode', payload.partnerCode],
      ['payType', payload.payType],
      ['requestId', payload.requestId],
      ['responseTime', payload.responseTime],
      ['resultCode', payload.resultCode],
      ['transId', payload.transId],
    ];
    const rawSignature = signedFields
      .map(([key, value]) => `${key}=${String(value ?? '')}`)
      .join('&');
    const expected = this.hmac('sha256', secretKey, rawSignature);
    return this.safeEqual(signature.toLowerCase(), expected.toLowerCase());
  }

  private createVnpayUrl(orderId: string, amount: number, clientIp: string): string {
    const tmnCode = this.requiredEnv('VNPAY_TMN_CODE');
    const hashSecret = this.requiredEnv('VNPAY_HASH_SECRET');
    const { vnpayReturnUrl } = getGatewayCallbacks();
    const now = new Date();
    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: String(amount * 100),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh toan ve xe ${orderId}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: vnpayReturnUrl,
      vnp_IpAddr: clientIp,
      vnp_CreateDate: this.toVnpayDate(now),
      vnp_ExpireDate: this.toVnpayDate(new Date(now.getTime() + 10 * 60 * 1000)),
    };
    const queryString = this.encodeSortedParams(params);
    const secureHash = this.hmac('sha512', hashSecret, queryString);
    const endpoint =
      readGatewayEnv('VNPAY_PAYMENT_URL') || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    logger.info('vnpay_payment_url_created', {
      order_id: orderId,
      amount_vnd: amount,
      return_url: vnpayReturnUrl,
      gateway: endpoint,
    });
    return `${endpoint}?${queryString}&vnp_SecureHash=${secureHash}`;
  }

  private async createMomoPayment(orderId: string, amount: number): Promise<string> {
    const partnerCode = this.requiredEnv('MOMO_PARTNER_CODE');
    const accessKey = this.requiredEnv('MOMO_ACCESS_KEY');
    const secretKey = this.requiredEnv('MOMO_SECRET_KEY');
    const { momoIpnUrl, paymentResultUrl } = getGatewayCallbacks();
    const requestId = randomUUID();
    const orderInfo = `Thanh toan ve xe ${orderId}`;
    const extraData = '';
    const requestType = 'captureWallet';
    const redirectUrl = new URL(paymentResultUrl);
    redirectUrl.searchParams.set('paymentOrder', orderId);
    const rawSignature = [
      `accessKey=${accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData}`,
      `ipnUrl=${momoIpnUrl}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${partnerCode}`,
      `redirectUrl=${redirectUrl.toString()}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`,
    ].join('&');
    const payload = {
      partnerCode,
      accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: redirectUrl.toString(),
      ipnUrl: momoIpnUrl,
      extraData,
      requestType,
      lang: 'vi',
      signature: this.hmac('sha256', secretKey, rawSignature),
    };
    const createUrl =
      readGatewayEnv('MOMO_CREATE_URL') || 'https://test-payment.momo.vn/v2/gateway/api/create';
    const response = await this.postJson(createUrl, payload);
    if (Number(response.resultCode) !== 0 || typeof response.payUrl !== 'string') {
      logger.error('momo_create_rejected', {
        order_id: orderId,
        result_code: String(response.resultCode ?? 'unknown'),
        ipn_url: momoIpnUrl,
        gateway: createUrl,
      });
      throw new Error(
        `MoMo không tạo được giao dịch (mã ${response.resultCode ?? 'không xác định'}).`
      );
    }
    logger.info('momo_payment_url_created', {
      order_id: orderId,
      amount_vnd: amount,
      ipn_url: momoIpnUrl,
      redirect_url: redirectUrl.toString(),
    });
    return response.payUrl;
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
      if (!response.ok) {
        throw new Error(`Cổng thanh toán trả về HTTP ${response.status}.`);
      }
      const body: unknown = await response.json();
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new Error('Cổng thanh toán trả về phản hồi không hợp lệ.');
      }
      return body as Record<string, unknown>;
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        logger.error('gateway_request_failed', { gateway_url: url, error });
        throw error;
      }
      logger.error('gateway_request_timeout', { gateway_url: url, timeout_ms: 15_000 });
      throw new Error('Không thể kết nối cổng thanh toán hoặc đã hết thời gian chờ.');
    } finally {
      clearTimeout(timeout);
    }
  }

  private requiredEnv(name: string): string {
    const value = readGatewayEnv(name);
    if (!value) {
      logger.error('missing_required_configuration', { variable: name });
      throw new Error(`Thiếu cấu hình bắt buộc ${name}.`);
    }
    return value;
  }

  private encodeSortedParams(params: Record<string, string>): string {
    const searchParams = new URLSearchParams();
    Object.keys(params)
      .sort()
      .forEach(key => searchParams.append(key, params[key]));
    return searchParams.toString();
  }

  private hmac(algorithm: 'sha256' | 'sha512', key: string, value: string): string {
    return createHmac(algorithm, key).update(value).digest('hex');
  }

  private safeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }

  private toVnpayDate(date: Date): string {
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
