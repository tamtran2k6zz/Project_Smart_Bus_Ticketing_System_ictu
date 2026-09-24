import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RouteStatus } from '@prisma/client';

export class CreateRouteDto {
  @ApiProperty({ example: 'BUS-01', description: 'Mã số tuyến xe buýt duy nhất' })
  @IsString()
  @IsNotEmpty({ message: 'Mã tuyến không được để trống' })
  code: string;

  @ApiProperty({ example: 'Bến xe trung tâm - Đại học CNTT&TT', description: 'Tên tuyến đường' })
  @IsString()
  @IsNotEmpty({ message: 'Tên tuyến không được để trống' })
  name: string;

  @ApiPropertyOptional({ example: 'Tuyến chính phục vụ sinh viên và giảng viên', description: 'Mô tả tuyến' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 12.5, description: 'Tổng chiều dài tuyến (km)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  distanceKm?: number;

  @ApiPropertyOptional({ example: 45, description: 'Thời gian di chuyển dự kiến (phút)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedDurationMin?: number;

  @ApiPropertyOptional({ enum: RouteStatus, example: RouteStatus.DRAFT, description: 'Trạng thái tuyến' })
  @IsEnum(RouteStatus)
  @IsOptional()
  status?: RouteStatus;
}
