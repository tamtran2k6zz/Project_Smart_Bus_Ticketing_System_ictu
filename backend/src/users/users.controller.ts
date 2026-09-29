import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { DiscountStatus, UserRole } from '@prisma/client';

@ApiTags('Users (Quản lý tài khoản & Xét duyệt đối tượng ưu đãi)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Lấy danh sách người dùng trong MySQL' })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  findAll(@Query('role') role?: UserRole) {
    return this.usersService.findAll(role);
  }

  @Patch(':id/discount-approval')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Duyệt hoặc từ chối ưu đãi HSSV / người cao tuổi (US 17)' })
  approveDiscount(
    @Param('id') id: string,
    @Body('status') status: DiscountStatus,
  ) {
    return this.usersService.approveDiscount(id, status);
  }
}
