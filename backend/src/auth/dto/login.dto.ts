import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@smartbus.ictu.vn', description: 'Email hoặc Số điện thoại' })
  @IsNotEmpty({ message: 'Email hoặc số điện thoại không được để trống' })
  @IsString()
  identifier: string;

  @ApiProperty({ example: 'Admin@12345', description: 'Mật khẩu tài khoản' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString()
  password: string;
}
