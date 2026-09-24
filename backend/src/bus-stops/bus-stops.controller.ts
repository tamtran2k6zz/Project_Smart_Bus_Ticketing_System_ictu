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
import { BusStopsService } from './bus-stops.service';
import { CreateBusStopDto } from './dto/create-bus-stop.dto';
import { UpdateBusStopDto } from './dto/update-bus-stop.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Bus Stops (Quản lý trạm dừng)')
@ApiBearerAuth()
@Controller('api/v1/bus-stops')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BusStopsController {
  constructor(private readonly busStopsService: BusStopsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Tạo mới trạm dừng xe buýt (Admin / Manager)' })
  @ApiResponse({ status: 201, description: 'Tạo trạm dừng thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc khoảng cách < 10m.' })
  @ApiResponse({ status: 409, description: 'Mã trạm đã tồn tại.' })
  create(@Body() createBusStopDto: CreateBusStopDto) {
    return this.busStopsService.create(createBusStopDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả trạm dừng (Hỗ trợ tìm kiếm & lọc trạng thái)' })
  @ApiQuery({ name: 'search', required: false, description: 'Từ khóa tìm kiếm theo tên, mã hoặc địa chỉ' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Lọc theo trạng thái hoạt động' })
  findAll(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    const isActiveBool = isActive !== undefined ? isActive === 'true' : undefined;
    return this.busStopsService.findAll(search, isActiveBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một trạm dừng theo ID kèm danh sách tuyến đi qua' })
  findOne(@Param('id') id: string) {
    return this.busStopsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Cập nhật thông tin trạm dừng (Admin / Manager)' })
  update(@Param('id') id: string, @Body() updateBusStopDto: UpdateBusStopDto) {
    return this.busStopsService.update(id, updateBusStopDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Xóa mềm trạm dừng (Admin / Manager, chặn nếu đang thuộc tuyến)' })
  remove(@Param('id') id: string) {
    return this.busStopsService.remove(id);
  }
}
