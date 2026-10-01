import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface VNPayCreatePaymentParams {
  orderId: string;
  amount: number;
  orderInfo: string;
  ipAddr?: string;
  bankCode?: string;
  returnUrl?: string;
}

@Injectable()
export class VNPayService {
  private readonly logger = new Logger(VNPayService.name);
  private readonly tmnCode: string;
  private readonly hashSecret: string;
  private readonly vnpUrl: string;
  private readonly returnUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.tmnCode = this.configService.get<string>('VNP_TMN_CODE', 'TESTTMN01');
    this.hashSecret = this.configService.get<string>('VNP_HASH_SECRET', 'RAHDefaultSecretHashVNPayKey2026XYZ');
    this.vnpUrl = this.configService.get<string>(
      'VNP_URL',
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    );
    this.returnUrl = this.configService.get<string>(
      'VNP_RETURN_URL',
      'http://localhost:3000/api/v1/payments/vnpay-return',
    );
  }

  /**
   * Format date into YYYYMMDDHHmmss string (GMT+7)
   */
  private formatDate(date: Date): string {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const gmt7 = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const year = gmt7.getUTCFullYear();
    const month = pad(gmt7.getUTCMonth() + 1);
    const day = pad(gmt7.getUTCDate());
    const hours = pad(gmt7.getUTCHours());
    const minutes = pad(gmt7.getUTCMinutes());
    const seconds = pad(gmt7.getUTCSeconds());
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  /**
   * Alphabetically sorts an object by keys and encodes values
   */
  private sortAndEncode(params: Record<string, any>): { signData: string; sortedParams: Record<string, string> } {
    const sortedKeys = Object.keys(params).sort();
    const sortedParams: Record<string, string> = {};
    const signParts: string[] = [];

    for (const key of sortedKeys) {
      const val = params[key];
      if (val !== null && val !== undefined && val !== '') {
        const encodedKey = encodeURIComponent(key);
        const encodedVal = encodeURIComponent(String(val)).replace(/%20/g, '+');
        sortedParams[key] = String(val);
        signParts.push(`${encodedKey}=${encodedVal}`);
      }
    }

    return {
      signData: signParts.join('&'),
      sortedParams,
    };
  }

  /**
   * Generate VNPay Sandbox Redirect URL with HMAC-SHA512 signature
   */
  createPaymentUrl(params: VNPayCreatePaymentParams): string {
    const now = new Date();
    const createDate = this.formatDate(now);
    const expireDate = this.formatDate(new Date(now.getTime() + 15 * 60 * 1000)); // 15 mins expiry

    const vnpParams: Record<string, any> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: params.orderId,
      vnp_OrderInfo: params.orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: Math.round(params.amount * 100).toString(),
      vnp_ReturnUrl: params.returnUrl || this.returnUrl,
      vnp_IpAddr: params.ipAddr || '127.0.0.1',
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    if (params.bankCode) {
      vnpParams['vnp_BankCode'] = params.bankCode;
    }

    const { signData } = this.sortAndEncode(vnpParams);
    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const paymentUrl = `${this.vnpUrl}?${signData}&vnp_SecureHash=${secureHash}`;
    this.logger.log(`Generated VNPay URL for order ${params.orderId}`);
    return paymentUrl;
  }

  /**
   * Verify VNPay HMAC-SHA512 Checksum from IPN or Return query parameters
   */
  verifyChecksum(queryParams: Record<string, any>): boolean {
    const receivedHash = queryParams['vnp_SecureHash'];
    if (!receivedHash) {
      this.logger.warn('Checksum verification failed: missing vnp_SecureHash');
      return false;
    }

    // Clone params and remove hash fields
    const paramsToVerify: Record<string, any> = {};
    for (const key of Object.keys(queryParams)) {
      if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
        paramsToVerify[key] = queryParams[key];
      }
    }

    const { signData } = this.sortAndEncode(paramsToVerify);
    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const calculatedHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const isValid = calculatedHash.toLowerCase() === String(receivedHash).toLowerCase();
    if (!isValid) {
      this.logger.warn(`VNPay checksum mismatch. Expected: ${calculatedHash}, Received: ${receivedHash}`);
    }
    return isValid;
  }
}

