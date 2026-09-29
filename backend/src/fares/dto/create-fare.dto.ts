import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, Min, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FareType, TicketType } from '@prisma/client';

export class CreateFareDto {
  @ApiProperty({ example: 'uuid-route-123', description: 'ID của tuyến đường áp dụng giá vé' })
  @IsString()
  @IsNotEmpty({ message: 'ID tuyến không được để trống' })
  routeId: string;

  @ApiPropertyOptional({ enum: FareType, example: FareType.FLAT_FARE, description: 'Loại giá vé' })
  @IsEnum(FareType)
  @IsOptional()
  fareType?: FareType;

  @ApiPropertyOptional({ enum: TicketType, example: TicketType.SINGLE, description: 'Loại vé' })
  @IsEnum(TicketType)
  @IsOptional()
  ticketType?: TicketType;

  @ApiProperty({ example: 7000, description: 'Giá vé (VND), bắt buộc phải > 0' })
  @IsNumber()
  @Min(1, { message: 'Giá vé phải là số dương lớn hơn 0' })
  amount: number;

  @ApiPropertyOptional({ example: 'uuid-stop-1', description: 'Trạm đi (Bắt buộc nếu là STAGE_FARE)' })
  @IsString()
  @IsOptional()
  fromStopId?: string;

  @ApiPropertyOptional({ example: 'uuid-stop-2', description: 'Trạm đến (Bắt buộc nếu là STAGE_FARE)' })
  @IsString()
  @IsOptional()
  toStopId?: string;

  @ApiPropertyOptional({ example: '2026-09-24T00:00:00.000Z', description: 'Thời gian áp dụng từ' })
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2027-09-24T00:00:00.000Z', description: 'Thời gian áp dụng đến' })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @ApiPropertyOptional({ example: true, description: 'Trạng thái hiệu lực' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
