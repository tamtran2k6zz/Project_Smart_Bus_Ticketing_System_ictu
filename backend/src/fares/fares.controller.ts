import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FaresService } from './fares.service';
import { CreateFareDto } from './dto/create-fare.dto';
import { UpdateFareDto } from './dto/update-fare.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Fares (Quản lý giá vé)')
@ApiBearerAuth()
@Controller('api/v1/fares')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FaresController {
  constructor(private readonly faresService: FaresService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Cấu hình giá vé cho tuyến (Admin / Manager)' })
  @ApiResponse({ status: 201, description: 'Tạo giá vé thành công.' })
  @ApiResponse({ status: 400, description: 'Giá vé <= 0 hoặc thiếu thông tin chặng.' })
  create(@Body() createFareDto: CreateFareDto) {
    return this.faresService.create(createFareDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách giá vé (Hỗ trợ lọc theo routeId)' })
  @ApiQuery({ name: 'routeId', required: false, description: 'Lọc giá vé theo ID tuyến đường' })
  findAll(@Query('routeId') routeId?: string) {
    return this.faresService.findAll(routeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết cấu hình giá vé theo ID' })
  findOne(@Param('id') id: string) {
    return this.faresService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Cập nhật cấu hình giá vé (Admin / Manager)' })
  update(@Param('id') id: string, @Body() updateFareDto: UpdateFareDto) {
    return this.faresService.update(id, updateFareDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Xóa mềm cấu hình giá vé (Admin / Manager)' })
  remove(@Param('id') id: string) {
    return this.faresService.remove(id);
  }
}
