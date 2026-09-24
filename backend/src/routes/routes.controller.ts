import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoutesService } from './routes.service';
import { FaresService } from '../fares/fares.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { AddStopToRouteDto } from './dto/add-stop-to-route.dto';
import { ReorderStopsDto } from './dto/reorder-stops.dto';
import { ConfigureRouteFareDto } from './dto/configure-route-fare.dto';
import { UpdateFareDto } from '../fares/dto/update-fare.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Routes (Quản lý tuyến xe buýt & trạm trên tuyến)')
@ApiBearerAuth()
@Controller('api/v1/routes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoutesController {
  constructor(
    private readonly routesService: RoutesService,
    private readonly faresService: FaresService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Tạo mới tuyến xe buýt (Admin / Manager)' })
  @ApiResponse({ status: 201, description: 'Tạo tuyến thành công.' })
  @ApiResponse({ status: 409, description: 'Mã tuyến đã tồn tại.' })
  create(@Body() createRouteDto: CreateRouteDto) {
    return this.routesService.create(createRouteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả tuyến xe buýt (Hỗ trợ tìm kiếm & lọc trạng thái)' })
  @ApiQuery({ name: 'search', required: false, description: 'Từ khóa tìm kiếm theo tên hoặc mã tuyến' })
  @ApiQuery({ name: 'status', required: false, description: 'Lọc theo trạng thái (DRAFT, ACTIVE, INACTIVE)' })
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.routesService.findAll(search, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết tuyến xe buýt kèm danh sách trạm và giá vé' })
  findOne(@Param('id') id: string) {
    return this.routesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Cập nhật thông tin tuyến xe buýt (Admin / Manager)' })
  update(@Param('id') id: string, @Body() updateRouteDto: UpdateRouteDto) {
    return this.routesService.update(id, updateRouteDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Xóa tuyến xe buýt (Chặn nếu đang có chuyến xe chạy)' })
  remove(@Param('id') id: string) {
    return this.routesService.remove(id);
  }

  @Post(':id/stops')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Thêm một trạm dừng vào tuyến đường (Admin / Manager)' })
  addStop(@Param('id') id: string, @Body() dto: AddStopToRouteDto) {
    return this.routesService.addStopToRoute(id, dto);
  }

  @Delete(':id/stops/:stopId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Gỡ trạm dừng khỏi tuyến đường (Chặn nếu tuyến còn <= 2 trạm)' })
  removeStop(@Param('id') id: string, @Param('stopId') stopId: string) {
    return this.routesService.removeStopFromRoute(id, stopId);
  }

  @Patch(':id/stops/order')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Cập nhật thứ tự trạm dừng (Phục vụ kéo-thả từ Admin UI trong Transaction)' })
  reorderStops(@Param('id') id: string, @Body() dto: ReorderStopsDto) {
    return this.routesService.reorderStops(id, dto);
  }

  @Post(':id/fares')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Cấu hình giá vé mới cho tuyến xe (Admin / Manager)' })
  @ApiResponse({ status: 201, description: 'Thiết lập giá vé thành công.' })
  createRouteFare(@Param('id') id: string, @Body() dto: ConfigureRouteFareDto) {
    return this.faresService.create({ ...dto, routeId: id });
  }

  @Put(':id/fares/:fareId')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Cập nhật cấu hình giá vé của tuyến xe (Admin / Manager)' })
  updateRouteFare(
    @Param('id') id: string,
    @Param('fareId') fareId: string,
    @Body() dto: UpdateFareDto,
  ) {
    return this.faresService.updateRouteFare(id, fareId, dto);
  }

  @Get(':id/fares')
  @ApiOperation({ summary: 'Lấy danh sách bảng giá vé của một tuyến' })
  getRouteFares(@Param('id') id: string) {
    return this.faresService.findAll(id);
  }
}
