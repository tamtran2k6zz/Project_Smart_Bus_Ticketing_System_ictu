import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateFareDto } from './dto/create-fare.dto';
import { UpdateFareDto } from './dto/update-fare.dto';
import { FareType } from '@prisma/client';

@Injectable()
export class FaresService {
  constructor(private prisma: PrismaService) {}

  async create(createFareDto: CreateFareDto) {
    const route = await this.prisma.route.findUnique({
      where: { id: createFareDto.routeId, deletedAt: null },
    });
    if (!route) {
      throw new NotFoundException(`Không tìm thấy tuyến đường với ID: ${createFareDto.routeId}`);
    }

    if (createFareDto.amount <= 0) {
      throw new BadRequestException('Giá vé phải là số dương lớn hơn 0!');
    }

    if (createFareDto.fareType === FareType.STAGE_FARE) {
      if (!createFareDto.fromStopId || !createFareDto.toStopId) {
        throw new BadRequestException('Vé chặng (STAGE_FARE) bắt buộc phải chỉ định trạm đi và trạm đến!');
      }
      if (createFareDto.fromStopId === createFareDto.toStopId) {
        throw new BadRequestException('Trạm đi và trạm đến không được trùng nhau trong vé chặng!');
      }

      const [fromStopCheck, toStopCheck] = await Promise.all([
        this.prisma.routeStop.findFirst({ where: { routeId: createFareDto.routeId, stopId: createFareDto.fromStopId } }),
        this.prisma.routeStop.findFirst({ where: { routeId: createFareDto.routeId, stopId: createFareDto.toStopId } }),
      ]);

      if (!fromStopCheck || !toStopCheck) {
        throw new BadRequestException('Cả trạm đi và trạm đến đều phải thuộc tuyến đường này!');
      }
    }

    return this.prisma.fare.create({
      data: {
        routeId: createFareDto.routeId,
        fareType: createFareDto.fareType ?? FareType.FLAT_FARE,
        ticketType: createFareDto.ticketType ?? 'SINGLE',
        amount: createFareDto.amount,
        fromStopId: createFareDto.fareType === FareType.STAGE_FARE ? createFareDto.fromStopId : null,
        toStopId: createFareDto.fareType === FareType.STAGE_FARE ? createFareDto.toStopId : null,
        effectiveFrom: createFareDto.effectiveFrom ? new Date(createFareDto.effectiveFrom) : new Date(),
        effectiveTo: createFareDto.effectiveTo ? new Date(createFareDto.effectiveTo) : null,
        isActive: createFareDto.isActive ?? true,
      },
      include: {
        route: true,
        fromStop: true,
        toStop: true,
      },
    });
  }

  async findAll(routeId?: string) {
    return this.prisma.fare.findMany({
      where: {
        deletedAt: null,
        ...(routeId ? { routeId } : {}),
      },
      include: {
        route: true,
        fromStop: true,
        toStop: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const fare = await this.prisma.fare.findFirst({
      where: { id, deletedAt: null },
      include: {
        route: true,
        fromStop: true,
        toStop: true,
      },
    });

    if (!fare) {
      throw new NotFoundException(`Không tìm thấy giá vé với ID: ${id}`);
    }

    return fare;
  }

  async update(id: string, updateFareDto: UpdateFareDto) {
    await this.findOne(id);

    if (updateFareDto.amount !== undefined && updateFareDto.amount <= 0) {
      throw new BadRequestException('Giá vé phải là số dương lớn hơn 0!');
    }

    return this.prisma.fare.update({
      where: { id },
      data: {
        ...(updateFareDto.fareType ? { fareType: updateFareDto.fareType } : {}),
        ...(updateFareDto.ticketType ? { ticketType: updateFareDto.ticketType } : {}),
        ...(updateFareDto.amount !== undefined ? { amount: updateFareDto.amount } : {}),
        ...(updateFareDto.fromStopId !== undefined ? { fromStopId: updateFareDto.fromStopId } : {}),
        ...(updateFareDto.toStopId !== undefined ? { toStopId: updateFareDto.toStopId } : {}),
        ...(updateFareDto.effectiveFrom ? { effectiveFrom: new Date(updateFareDto.effectiveFrom) } : {}),
        ...(updateFareDto.effectiveTo !== undefined ? { effectiveTo: updateFareDto.effectiveTo ? new Date(updateFareDto.effectiveTo) : null } : {}),
        ...(updateFareDto.isActive !== undefined ? { isActive: updateFareDto.isActive } : {}),
      },
      include: {
        route: true,
        fromStop: true,
        toStop: true,
      },
    });
  }

  async updateRouteFare(routeId: string, fareId: string, updateFareDto: UpdateFareDto) {
    const fare = await this.prisma.fare.findFirst({
      where: { id: fareId, routeId, deletedAt: null },
    });
    if (!fare) {
      throw new NotFoundException(`Không tìm thấy cấu hình giá vé ID ${fareId} thuộc tuyến ${routeId}`);
    }
    return this.update(fareId, updateFareDto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.fare.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
