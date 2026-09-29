import { IsString, IsNotEmpty, IsNumber, Min, Max, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBusStopDto {
  @ApiProperty({ example: 'BS-101', description: 'Mã trạm dừng duy nhất' })
  @IsString()
  @IsNotEmpty({ message: 'Mã trạm không được để trống' })
  code: string;

  @ApiProperty({ example: 'Bến xe trung tâm Thái Nguyên', description: 'Tên trạm dừng' })
  @IsString()
  @IsNotEmpty({ message: 'Tên trạm không được để trống' })
  name: string;

  @ApiProperty({ example: 'Đường Hoàng Văn Thụ, Phường Trưng Vương, TP. Thái Nguyên', description: 'Địa chỉ trạm' })
  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ trạm không được để trống' })
  address: string;

  @ApiProperty({ example: 21.5932, description: 'Vĩ độ (Latitude) -90 đến 90' })
  @IsNumber()
  @Min(-90, { message: 'Vĩ độ tối thiểu là -90' })
  @Max(90, { message: 'Vĩ độ tối đa là 90' })
  latitude: number;

  @ApiProperty({ example: 105.8456, description: 'Kinh độ (Longitude) -180 đến 180' })
  @IsNumber()
  @Min(-180, { message: 'Kinh độ tối thiểu là -180' })
  @Max(180, { message: 'Kinh độ tối đa là 180' })
  longitude: number;

  @ApiPropertyOptional({ example: true, description: 'Trạng thái hoạt động của trạm' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
