import { IsNumber, IsEnum, IsOptional, Min, IsBoolean, IsDateString, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FareType, TicketType } from '@prisma/client';

export class ConfigureRouteFareDto {
  @ApiPropertyOptional({ enum: FareType, example: FareType.FLAT_FARE, description: 'Loại giá vé (FLAT_FARE: Đồng giá toàn tuyến, STAGE_FARE: Theo chặng)' })
  @IsEnum(FareType)
  @IsOptional()
  fareType?: FareType;

  @ApiPropertyOptional({ enum: TicketType, example: TicketType.SINGLE, description: 'Đối tượng/Loại vé (SINGLE, MONTHLY_STUDENT, MONTHLY_REGULAR, PRIORITY)' })
  @IsEnum(TicketType)
  @IsOptional()
  ticketType?: TicketType;

  @ApiProperty({ example: 7000, description: 'Giá vé (VND), bắt buộc phải là số dương > 0' })
  @IsNumber()
  @Min(1, { message: 'Giá vé phải là số dương lớn hơn 0' })
  amount: number;

  @ApiPropertyOptional({ example: 'uuid-stop-1', description: 'Trạm đi (Bắt buộc nếu là vé chặng STAGE_FARE)' })
  @IsString()
  @IsOptional()
  fromStopId?: string;

  @ApiPropertyOptional({ example: 'uuid-stop-2', description: 'Trạm đến (Bắt buộc nếu là vé chặng STAGE_FARE)' })
  @IsString()
  @IsOptional()
  toStopId?: string;

  @ApiPropertyOptional({ example: '2026-09-24T00:00:00.000Z', description: 'Thời gian bắt đầu áp dụng giá vé' })
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2027-09-24T00:00:00.000Z', description: 'Thời gian kết thúc áp dụng giá vé' })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @ApiPropertyOptional({ example: true, description: 'Trạng thái hiệu lực của giá vé' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
