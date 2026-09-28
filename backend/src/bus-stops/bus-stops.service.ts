import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateBusStopDto } from './dto/create-bus-stop.dto';
import { UpdateBusStopDto } from './dto/update-bus-stop.dto';
import { calculateDistanceMeters, MIN_BUS_STOP_DISTANCE_METERS } from '../common/utils/geo.util';

@Injectable()
export class BusStopsService {
  constructor(private prisma: PrismaService) {}

  async create(createBusStopDto: CreateBusStopDto) {
    const existingCode = await this.prisma.busStop.findUnique({
      where: { code: createBusStopDto.code },
    });
    if (existingCode) {
      throw new ConflictException(`Mã trạm "${createBusStopDto.code}" đã tồn tại trong hệ thống!`);
    }

    const allStops = await this.prisma.busStop.findMany({
      where: { deletedAt: null },
    });

    for (const stop of allStops) {
      const distance = calculateDistanceMeters(
        createBusStopDto.latitude,
        createBusStopDto.longitude,
        stop.latitude,
        stop.longitude,
      );
      if (distance < MIN_BUS_STOP_DISTANCE_METERS) {
        throw new BadRequestException(
          `Trạm dừng quá gần trạm "${stop.name}" (${stop.code}), khoảng cách là ${distance.toFixed(2)}m (Tối thiểu phải cách nhau ${MIN_BUS_STOP_DISTANCE_METERS}m).`,
        );
      }
    }

    return this.prisma.busStop.create({
      data: createBusStopDto,
    });
  }

  async findAll(search?: string, isActive?: boolean) {
    return this.prisma.busStop.findMany({
      where: {
        deletedAt: null,
        ...(isActive !== undefined ? { isActive } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const busStop = await this.prisma.busStop.findFirst({
      where: { id, deletedAt: null },
      include: {
        routeStops: {
          include: {
            route: true,
          },
        },
      },
    });

    if (!busStop) {
      throw new NotFoundException(`Không tìm thấy trạm dừng với ID: ${id}`);
    }

    return busStop;
  }

  async update(id: string, updateBusStopDto: UpdateBusStopDto) {
    const busStop = await this.findOne(id);

    if (updateBusStopDto.code && updateBusStopDto.code !== busStop.code) {
      const existingCode = await this.prisma.busStop.findUnique({
        where: { code: updateBusStopDto.code },
      });
      if (existingCode) {
        throw new ConflictException(`Mã trạm "${updateBusStopDto.code}" đã tồn tại!`);
      }
    }

    const newLat = updateBusStopDto.latitude ?? busStop.latitude;
    const newLon = updateBusStopDto.longitude ?? busStop.longitude;

    if (updateBusStopDto.latitude !== undefined || updateBusStopDto.longitude !== undefined) {
      const allStops = await this.prisma.busStop.findMany({
        where: {
          deletedAt: null,
          id: { not: id },
        },
      });

      for (const stop of allStops) {
        const distance = calculateDistanceMeters(newLat, newLon, stop.latitude, stop.longitude);
        if (distance < MIN_BUS_STOP_DISTANCE_METERS) {
          throw new BadRequestException(
            `Tọa độ mới quá gần trạm "${stop.name}" (${stop.code}), khoảng cách là ${distance.toFixed(2)}m (Tối thiểu ${MIN_BUS_STOP_DISTANCE_METERS}m).`,
          );
        }
      }
    }

    return this.prisma.busStop.update({
      where: { id },
      data: updateBusStopDto,
    });
  }

  async remove(id: string) {
    const busStop = await this.findOne(id);

    const routeStopsCount = await this.prisma.routeStop.count({
      where: { stopId: id },
    });

    if (routeStopsCount > 0) {
      throw new BadRequestException(
        `Không thể xóa trạm "${busStop.name}" vì đang được sử dụng trong ${routeStopsCount} tuyến đường! Vui lòng gỡ trạm khỏi tuyến trước khi xóa.`,
      );
    }

    return this.prisma.busStop.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
