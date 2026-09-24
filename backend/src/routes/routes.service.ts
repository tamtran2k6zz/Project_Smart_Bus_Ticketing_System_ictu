import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { AddStopToRouteDto } from './dto/add-stop-to-route.dto';
import { ReorderStopsDto } from './dto/reorder-stops.dto';
import { RouteStatus } from '@prisma/client';

@Injectable()
export class RoutesService {
  constructor(private prisma: PrismaService) {}

  async create(createRouteDto: CreateRouteDto) {
    const existingCode = await this.prisma.route.findUnique({
      where: { code: createRouteDto.code },
    });
    if (existingCode) {
      throw new ConflictException(`Mã tuyến "${createRouteDto.code}" đã tồn tại!`);
    }

    return this.prisma.route.create({
      data: createRouteDto,
    });
  }

  async findAll(search?: string, status?: string) {
    return this.prisma.route.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status: status as any } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        routeStops: {
          include: { stop: true },
          orderBy: { orderIndex: 'asc' },
        },
        fares: {
          where: { deletedAt: null },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const route = await this.prisma.route.findFirst({
      where: { id, deletedAt: null },
      include: {
        routeStops: {
          include: { stop: true },
          orderBy: { orderIndex: 'asc' },
        },
        fares: {
          where: { deletedAt: null },
          include: { fromStop: true, toStop: true },
        },
        tripSchedules: true,
      },
    });

    if (!route) {
      throw new NotFoundException(`Không tìm thấy tuyến đường với ID: ${id}`);
    }

    return route;
  }

  async update(id: string, updateRouteDto: UpdateRouteDto) {
    const route = await this.findOne(id);

    if (updateRouteDto.code && updateRouteDto.code !== route.code) {
      const existingCode = await this.prisma.route.findUnique({
        where: { code: updateRouteDto.code },
      });
      if (existingCode) {
        throw new ConflictException(`Mã tuyến "${updateRouteDto.code}" đã tồn tại!`);
      }
    }

    if (updateRouteDto.status === RouteStatus.ACTIVE) {
      const stopsCount = await this.prisma.routeStop.count({
        where: { routeId: id },
      });
      if (stopsCount < 2) {
        throw new BadRequestException(
          `Không thể kích hoạt tuyến vì tuyến xe bắt buộc phải có tối thiểu 2 trạm dừng (hiện tại có ${stopsCount} trạm)!`,
        );
      }
    }

    return this.prisma.route.update({
      where: { id },
      data: updateRouteDto,
      include: {
        routeStops: {
          include: { stop: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  async remove(id: string) {
    const route = await this.findOne(id);

    const activeTripsCount = await this.prisma.tripSchedule.count({
      where: {
        routeId: id,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
    });

    if (activeTripsCount > 0) {
      throw new BadRequestException(
        `Không thể xóa tuyến "${route.name}" vì đang có ${activeTripsCount} chuyến xe/lịch trình đang hoạt động!`,
      );
    }

    return this.prisma.route.update({
      where: { id },
      data: { deletedAt: new Date(), status: RouteStatus.INACTIVE },
    });
  }

  async addStopToRoute(routeId: string, dto: AddStopToRouteDto) {
    await this.findOne(routeId);

    const stop = await this.prisma.busStop.findFirst({
      where: { id: dto.stopId, deletedAt: null, isActive: true },
    });
    if (!stop) {
      throw new NotFoundException(`Không tìm thấy trạm dừng hợp lệ với ID: ${dto.stopId}`);
    }

    const existingRouteStop = await this.prisma.routeStop.findFirst({
      where: { routeId, stopId: dto.stopId },
    });
    if (existingRouteStop) {
      throw new ConflictException(`Trạm dừng này đã có trong tuyến đường!`);
    }

    const existingOrder = await this.prisma.routeStop.findFirst({
      where: { routeId, orderIndex: dto.orderIndex },
    });
    if (existingOrder) {
      throw new BadRequestException(`Thứ tự trạm (orderIndex = ${dto.orderIndex}) đã tồn tại trong tuyến này!`);
    }

    return this.prisma.routeStop.create({
      data: {
        routeId,
        stopId: dto.stopId,
        orderIndex: dto.orderIndex,
        distanceFromStartKm: dto.distanceFromStartKm ?? 0.0,
        estimatedMinutesFromStart: dto.estimatedMinutesFromStart ?? 0,
        isTerminal: dto.isTerminal ?? false,
      },
      include: {
        stop: true,
      },
    });
  }

  async removeStopFromRoute(routeId: string, stopId: string) {
    await this.findOne(routeId);

    const routeStop = await this.prisma.routeStop.findFirst({
      where: { routeId, stopId },
    });
    if (!routeStop) {
      throw new NotFoundException(`Không tìm thấy trạm dừng này trong tuyến đường!`);
    }

    const totalStops = await this.prisma.routeStop.count({
      where: { routeId },
    });
    if (totalStops <= 2) {
      throw new BadRequestException(
        `Không thể xóa trạm vì một tuyến xe bắt buộc phải có tối thiểu 2 trạm dừng (hiện tại có ${totalStops} trạm)!`,
      );
    }

    return this.prisma.routeStop.delete({
      where: { id: routeStop.id },
    });
  }

  async reorderStops(routeId: string, dto: ReorderStopsDto) {
    await this.findOne(routeId);

    if (dto.stops.length < 2) {
      throw new BadRequestException('Một tuyến đường bắt buộc phải có tối thiểu 2 trạm dừng!');
    }

    const orderIndexes = new Set(dto.stops.map((s) => s.orderIndex));
    if (orderIndexes.size !== dto.stops.length) {
      throw new BadRequestException('Thứ tự trạm (orderIndex) không được trùng lặp giữa các trạm!');
    }

    const currentRouteStops = await this.prisma.routeStop.findMany({
      where: { routeId },
    });

    const currentStopIds = new Set(currentRouteStops.map((rs) => rs.stopId));
    const newStopIds = new Set(dto.stops.map((s) => s.stopId));

    if (currentStopIds.size !== newStopIds.size || ![...newStopIds].every((id) => currentStopIds.has(id))) {
      throw new BadRequestException('Danh sách trạm khi sắp xếp lại phải khớp chính xác với các trạm hiện có trong tuyến!');
    }

    const sortedStops = [...dto.stops].sort((a, b) => a.orderIndex - b.orderIndex);

    return this.prisma.$transaction(async (tx) => {
      // Step 1: Temporarily set negative orderIndex to prevent unique constraint conflict
      for (const item of sortedStops) {
        await tx.routeStop.update({
          where: {
            unique_route_stop: {
              routeId,
              stopId: item.stopId,
            },
          },
          data: {
            orderIndex: -item.orderIndex,
          },
        });
      }

      // Step 2: Assign final orderIndex and set isTerminal for head & tail stops
      for (let i = 0; i < sortedStops.length; i++) {
        const item = sortedStops[i];
        const isTerminal = i === 0 || i === sortedStops.length - 1;
        await tx.routeStop.update({
          where: {
            unique_route_stop: {
              routeId,
              stopId: item.stopId,
            },
          },
          data: {
            orderIndex: item.orderIndex,
            isTerminal,
          },
        });
      }

      return tx.route.findFirst({
        where: { id: routeId, deletedAt: null },
        include: {
          routeStops: {
            include: { stop: true },
            orderBy: { orderIndex: 'asc' },
          },
          fares: {
            where: { deletedAt: null },
          },
        },
      });
    });
  }
}
