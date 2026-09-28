import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CreateRouteDto } from './dto/create-route.dto';
import { RoutesService } from './routes.service';

@Controller('api/v1/routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get()
  findAll() {
    return this.routesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateRouteDto) {
    return this.routesService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: CreateRouteDto) {
    return this.routesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.routesService.remove(id);
  }
}
