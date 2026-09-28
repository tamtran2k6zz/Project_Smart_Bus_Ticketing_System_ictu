import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RouteStationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  address!: string;
}

export class CreateRouteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsBoolean()
  isActive!: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RouteStationDto)
  stations!: RouteStationDto[];
}
