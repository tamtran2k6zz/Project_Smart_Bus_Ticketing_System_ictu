import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsUrl,
} from 'class-validator';
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
  @IsNotEmpty({ message: 'booking_id là bắt buộc' })
  @IsUUID('4', { message: 'booking_id phải là UUID v4 hợp lệ' })
  booking_id: string;

  @IsNotEmpty({ message: 'payment_method là bắt buộc' })
  @IsEnum(PaymentMethodEnum, {
    message: 'payment_method phải là VNPAY hoặc MOMO',
  })
  payment_method: PaymentMethodEnum;

  @IsNotEmpty({ message: 'return_url là bắt buộc' })
  @IsUrl(
    { require_tld: false, require_protocol: true },
    { message: 'return_url phải là một URL hợp lệ' },
  )
  return_url: string;

  @IsOptional()
  @IsString({ message: 'bank_code phải là chuỗi' })
  bank_code?: string;
}

export class CreatePaymentResponseDataDto {
  payment_url: string;
  qr_code_url?: string;
  expires_at: string;
}

export class CreatePaymentResponseDto {
  statusCode: number;
  message: string;
  data: CreatePaymentResponseDataDto;
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

