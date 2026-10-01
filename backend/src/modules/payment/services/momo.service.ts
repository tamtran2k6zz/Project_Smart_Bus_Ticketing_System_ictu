import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';
import { MoMoIpnDto } from '../dto/payment.dto';

export interface MoMoCreatePaymentParams {
  orderId: string;
  amount: number;
  orderInfo: string;
  requestId?: string;
  extraData?: string;
  redirectUrl?: string;
}

export interface MoMoPaymentResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  responseTime: number;
  message: string;
  resultCode: number;
  payUrl: string;
  deeplink?: string;
  qrCodeUrl?: string;
}

@Injectable()
export class MoMoService {
  private readonly logger = new Logger(MoMoService.name);
  private readonly partnerCode: string;
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly endpoint: string;
  private readonly redirectUrl: string;
  private readonly ipnUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.partnerCode = this.configService.get<string>('MOMO_PARTNER_CODE', 'MOMO');
    this.accessKey = this.configService.get<string>('MOMO_ACCESS_KEY', 'F8BBA842ECF85');
    this.secretKey = this.configService.get<string>('MOMO_SECRET_KEY', 'K951B6PE1wa8ngfBWR1nF6o0BmNipd4M');
    this.endpoint = this.configService.get<string>(
      'MOMO_ENDPOINT',
      'https://test-payment.momo.vn/v2/gateway/api/create',
    );
    this.redirectUrl = this.configService.get<string>(
      'MOMO_REDIRECT_URL',
      'http://localhost:3000/api/v1/payments/momo-return',
    );
    this.ipnUrl = this.configService.get<string>(
      'MOMO_IPN_URL',
      'http://localhost:3000/api/v1/payments/momo-ipn',
    );
  }

  /**
   * Calculate HMAC-SHA256 signature for MoMo
   */
  private generateHmacSha256(rawSignature: string): string {
    return crypto.createHmac('sha256', this.secretKey).update(rawSignature).digest('hex');
  }

  /**
   * Create MoMo payment URL by signing request and dispatching to MoMo Gateway
   */
  async createPaymentUrl(
    params: MoMoCreatePaymentParams,
  ): Promise<MoMoPaymentResponse> {
    const requestId = params.requestId || `${params.orderId}_${Date.now()}`;
    const extraData = params.extraData || '';
    const requestType = 'captureWallet';
    const redirectUrl = params.redirectUrl || this.redirectUrl;

    // MoMo raw signature parameter ordering (strictly defined by MoMo API specification)
    const rawSignature =
      `accessKey=${this.accessKey}` +
      `&amount=${params.amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${this.ipnUrl}` +
      `&orderId=${params.orderId}` +
      `&orderInfo=${params.orderInfo}` +
      `&partnerCode=${this.partnerCode}` +
      `&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;

    const signature = this.generateHmacSha256(rawSignature);

    const requestBody = {
      partnerCode: this.partnerCode,
      partnerName: 'Smart Bus Ticketing',
      storeId: 'SmartBusStore',
      requestId,
      amount: params.amount,
      orderId: params.orderId,
      orderInfo: params.orderInfo,
      redirectUrl,
      ipnUrl: this.ipnUrl,
      lang: 'vi',
      extraData,
      requestType,
      signature,
    };

    this.logger.log(`Requesting MoMo payment URL for order ${params.orderId}`);

    try {
      const response = await axios.post<MoMoPaymentResponse>(
        this.endpoint,
        requestBody,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        },
      );

      const data = response.data;

      if (!data || data.resultCode !== 0 || !data.payUrl) {
        this.logger.error(
          `MoMo Gateway rejected request for order ${params.orderId}: ${data?.message}`,
        );
        throw new BadRequestException(
          data?.message || 'Cổng thanh toán MoMo từ chối yêu cầu thanh toán',
        );
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `MoMo Gateway API call failed for order ${params.orderId}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Không thể kết nối tới cổng thanh toán MoMo',
      );
    }
  }

  /**
   * Verify MoMo Webhook / IPN signature using HMAC-SHA256
   */
  verifyChecksum(payload: MoMoIpnDto): boolean {
    const {
      amount,
      extraData = '',
      message,
      orderId,
      orderInfo,
      orderType = '',
      partnerCode,
      payType = '',
      requestId,
      responseTime,
      resultCode,
      transId,
      signature,
    } = payload;

    if (!signature) {
      this.logger.warn('MoMo checksum verification failed: missing signature');
      return false;
    }

    // MoMo IPN raw signature parameter ordering (strictly defined by MoMo API specification)
    const rawSignature =
      `accessKey=${this.accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&message=${message}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&orderType=${orderType}` +
      `&partnerCode=${partnerCode}` +
      `&payType=${payType}` +
      `&requestId=${requestId}` +
      `&responseTime=${responseTime}` +
      `&resultCode=${resultCode}` +
      `&transId=${transId}`;

    const expectedSignature = this.generateHmacSha256(rawSignature);
    const isValid = expectedSignature.toLowerCase() === signature.toLowerCase();

    if (!isValid) {
      this.logger.warn(`MoMo signature mismatch. Expected: ${expectedSignature}, Received: ${signature}`);
    }

    return isValid;
  }
}

