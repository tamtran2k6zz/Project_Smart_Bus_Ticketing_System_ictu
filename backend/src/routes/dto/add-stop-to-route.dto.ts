import { IsString, IsNotEmpty, IsNumber, Min, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddStopToRouteDto {
  @ApiProperty({ example: 'uuid-stop-id-123', description: 'ID của trạm dừng' })
  @IsString()
  @IsNotEmpty({ message: 'ID trạm không được để trống' })
  stopId: string;

  @ApiProperty({ example: 1, description: 'Thứ tự trạm trên tuyến (1, 2, 3...)' })
  @IsNumber()
  @Min(1, { message: 'Thứ tự trạm phải từ 1 trở lên' })
  orderIndex: number;

  @ApiPropertyOptional({ example: 0.0, description: 'Khoảng cách tích lũy từ điểm xuất phát (km)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  distanceFromStartKm?: number;

  @ApiPropertyOptional({ example: 0, description: 'Thời gian di chuyển tích lũy từ điểm xuất phát (phút)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedMinutesFromStart?: number;

  @ApiPropertyOptional({ example: true, description: 'Có phải là trạm đầu/cuối tuyến không' })
  @IsBoolean()
  @IsOptional()
  isTerminal?: boolean;
}
