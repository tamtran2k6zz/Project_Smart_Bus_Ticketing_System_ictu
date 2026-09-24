import { IsArray, ValidateNested, IsString, IsNotEmpty, IsNumber, Min, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class StopOrderItemDto {
  @ApiProperty({ example: 'uuid-stop-1', description: 'ID trạm dừng' })
  @IsString()
  @IsNotEmpty()
  stopId: string;

  @ApiProperty({ example: 1, description: 'Thứ tự mới của trạm trên tuyến' })
  @IsNumber()
  @Min(1)
  orderIndex: number;
}

export class ReorderStopsDto {
  @ApiProperty({ type: [StopOrderItemDto], description: 'Danh sách các trạm kèm thứ tự mới (tối thiểu 2 trạm)' })
  @IsArray()
  @ArrayMinSize(2, { message: 'Một tuyến đường bắt buộc phải có tối thiểu 2 trạm dừng' })
  @ValidateNested({ each: true })
  @Type(() => StopOrderItemDto)
  stops: StopOrderItemDto[];
}
