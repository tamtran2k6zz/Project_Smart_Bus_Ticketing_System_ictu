import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethodEnum {
  VNPAY = 'VNPAY',
  MOMO = 'MOMO',
}

export enum PaymentStatusEnum {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export class CreatePaymentDto {
  @IsNotEmpty({ message: 'booking_id is required' })
  @IsUUID('4', { message: 'booking_id must be a valid UUID v4' })
  booking_id: string;

  @IsNotEmpty({ message: 'payment_method is required' })
  @IsEnum(PaymentMethodEnum, { message: 'payment_method must be either VNPAY or MOMO' })
  payment_method: PaymentMethodEnum;

  @IsOptional()
  @IsString({ message: 'bank_code must be a string' })
  bank_code?: string;
}

export class CreatePaymentResponseDto {
  payment_id: string;
  booking_id: string;
  payment_method: PaymentMethodEnum;
  amount: number;
  currency: string;
  payment_url: string;
  expires_at: Date;
}

export class VNPayIpnDto {
  @IsNotEmpty()
  @IsString()
  vnp_TmnCode: string;

  @IsNotEmpty()
  @IsString()
  vnp_Amount: string;

  @IsOptional()
  @IsString()
  vnp_BankCode?: string;

  @IsOptional()
  @IsString()
  vnp_BankTranNo?: string;

  @IsOptional()
  @IsString()
  vnp_CardType?: string;

  @IsOptional()
  @IsString()
  vnp_PayDate?: string;

  @IsNotEmpty()
  @IsString()
  vnp_OrderInfo: string;

  @IsNotEmpty()
  @IsString()
  vnp_TransactionNo: string;

  @IsNotEmpty()
  @IsString()
  vnp_ResponseCode: string;

  @IsOptional()
  @IsString()
  vnp_TransactionStatus?: string;

  @IsNotEmpty()
  @IsString()
  vnp_TxnRef: string;

  @IsNotEmpty()
  @IsString()
  vnp_SecureHash: string;

  @IsOptional()
  @IsString()
  vnp_SecureHashType?: string;

  [key: string]: any;
}

export class VNPayIpnResponseDto {
  RspCode: string;
  Message: string;
}

export class MoMoIpnDto {
  @IsNotEmpty()
  @IsString()
  partnerCode: string;

  @IsNotEmpty()
  @IsString()
  orderId: string;

  @IsNotEmpty()
  @IsString()
  requestId: string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsNotEmpty()
  @IsString()
  orderInfo: string;

  @IsOptional()
  @IsString()
  orderType?: string;

  @IsNotEmpty()
  transId: number | string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  resultCode: number;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  payType?: string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  responseTime: number;

  @IsOptional()
  @IsString()
  extraData?: string;

  @IsNotEmpty()
  @IsString()
  signature: string;
}

export class MoMoIpnResponseDto {
  partnerCode: string;
  requestId: string;
  orderId: string;
  resultCode: number;
  message: string;
  responseTime: number;
  extraData: string;
}

