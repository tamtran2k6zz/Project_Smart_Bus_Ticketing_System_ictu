import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SaveRouteDto } from './dto/route.dto';

@Injectable()
export class RoutesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const routes = await this.prisma.route.findMany({
      include: {
        routeStops: {
          include: { stop: true },
          orderBy: { stopOrder: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    });

    return routes.map(route => ({
      id: route.id,
      code: route.code,
      name: route.name,
      status: route.isActive ? 'ACTIVE' : 'INACTIVE',
      stations: route.routeStops.map(routeStop => ({
        id: routeStop.stop.id,
        name: routeStop.stop.name,
        address: routeStop.stop.address,
        order: routeStop.stopOrder,
      })),
    }));
  }

  async create(dto: SaveRouteDto) {
    try {
      const route = await this.prisma.$transaction(async tx => {
        const createdRoute = await tx.route.create({
          data: {
            code: dto.code.trim(),
            name: dto.name.trim(),
            isActive: dto.status === 'ACTIVE',
          },
        });
        await this.replaceStops(tx, createdRoute.id, dto);
        return createdRoute;
      });

      return this.findById(route.id);
    } catch (error) {
      this.throwRouteConflict(error);
    }
  }

  async update(id: string, dto: SaveRouteDto) {
    try {
      await this.prisma.$transaction(async tx => {
        const existing = await tx.route.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!existing) {
          throw new NotFoundException(`Route not found with ID: ${id}`);
        }

        const oldRouteStops = await tx.routeStop.findMany({
          where: { routeId: id },
          select: { stopId: true },
        });

        await tx.route.update({
          where: { id },
          data: {
            code: dto.code.trim(),
            name: dto.name.trim(),
            isActive: dto.status === 'ACTIVE',
          },
        });
        await tx.routeStop.deleteMany({ where: { routeId: id } });
        await this.replaceStops(tx, id, dto);
        await tx.busStop.deleteMany({
          where: {
            id: { in: oldRouteStops.map(routeStop => routeStop.stopId) },
            routeStops: { none: {} },
          },
        });
      });

      return this.findById(id);
    } catch (error) {
      this.throwRouteConflict(error);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.route.delete({ where: { id } });
      return { id };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Route not found with ID: ${id}`);
        }
        if (error.code === 'P2003') {
          throw new ConflictException('Route cannot be deleted because it has scheduled trips.');
        }
      }
      throw error;
    }
  }

  private async findById(id: string) {
    const route = await this.prisma.route.findUnique({
      where: { id },
      include: {
        routeStops: {
          include: { stop: true },
          orderBy: { stopOrder: 'asc' },
        },
      },
    });

    if (!route) {
      throw new NotFoundException(`Route not found with ID: ${id}`);
    }

    return {
      id: route.id,
      code: route.code,
      name: route.name,
      status: route.isActive ? 'ACTIVE' : 'INACTIVE',
      stations: route.routeStops.map(routeStop => ({
        id: routeStop.stop.id,
        name: routeStop.stop.name,
        address: routeStop.stop.address,
        order: routeStop.stopOrder,
      })),
    };
  }

  private async replaceStops(
    tx: Prisma.TransactionClient,
    routeId: string,
    dto: SaveRouteDto,
  ) {
    for (const station of [...dto.stations].sort((a, b) => a.order - b.order)) {
      const stop = await tx.busStop.create({
        data: {
          name: station.name.trim(),
          address: station.address.trim(),
          latitude: 0,
          longitude: 0,
        },
      });

      await tx.routeStop.create({
        data: {
          routeId,
          stopId: stop.id,
          stopOrder: station.order,
        },
      });
    }
  }

  private throwRouteConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('A route with this code already exists.');
    }
    throw error;
  }
}
