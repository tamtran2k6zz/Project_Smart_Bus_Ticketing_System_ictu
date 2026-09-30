import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Auth (Xác thực & Đăng nhập MySQL)')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập người dùng (Email/SĐT + Mật khẩu kết nối MySQL thật)' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công, trả về JWT Token và User Profile.' })
  @ApiResponse({ status: 401, description: 'Thông tin đăng nhập không chính xác hoặc bị khóa.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Đăng ký tài khoản hành khách mới vào MySQL' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công.' })
  @ApiResponse({ status: 409, description: 'Email hoặc số điện thoại đã tồn tại.' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin tài khoản hiện tại kèm thông báo và vé tháng' })
  getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.sub || req.user.id);
  }
}
