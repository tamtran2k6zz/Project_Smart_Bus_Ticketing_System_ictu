import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';

const routeInclude = {
  routeStops: {
    orderBy: { stopOrder: 'asc' as const },
    include: { stop: true },
  },
};

@Injectable()
export class RoutesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const routes = await this.prisma.route.findMany({
      orderBy: { code: 'asc' },
      include: routeInclude,
    });

    return routes.map(route => this.toResponse(route));
  }

  async create(dto: CreateRouteDto) {
    try {
      const route = await this.prisma.route.create({
        data: {
          code: dto.code.trim(),
          name: dto.name.trim(),
          isActive: dto.isActive,
          routeStops: {
            create: dto.stations.map((station, index) => ({
              stopOrder: index + 1,
              stop: {
                connectOrCreate: {
                  where: {
                    name_address: {
                      name: station.name.trim(),
                      address: station.address.trim(),
                    },
                  },
                  create: {
                    name: station.name.trim(),
                    address: station.address.trim(),
                  },
                },
              },
            })),
          },
        },
        include: routeInclude,
      });

      return this.toResponse(route);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(id: string, dto: CreateRouteDto) {
    try {
      const route = await this.prisma.$transaction(async transaction => {
        const existing = await transaction.route.findUnique({ where: { id } });
        if (!existing) {
          throw new NotFoundException('Không tìm thấy tuyến xe.');
        }

        return transaction.route.update({
          where: { id },
          data: {
            code: dto.code.trim(),
            name: dto.name.trim(),
            isActive: dto.isActive,
            routeStops: {
              deleteMany: {},
              create: dto.stations.map((station, index) => ({
                stopOrder: index + 1,
                stop: {
                  connectOrCreate: {
                    where: {
                      name_address: {
                        name: station.name.trim(),
                        address: station.address.trim(),
                      },
                    },
                    create: {
                      name: station.name.trim(),
                      address: station.address.trim(),
                    },
                  },
                },
              })),
            },
          },
          include: routeInclude,
        });
      });

      return this.toResponse(route);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.route.delete({ where: { id } });
      return { id };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Không tìm thấy tuyến xe.');
        }
        if (error.code === 'P2003') {
          throw new ConflictException('Không thể xóa tuyến đang được chuyến xe sử dụng.');
        }
      }
      throw error;
    }
  }

  private toResponse(route: Prisma.RouteGetPayload<{ include: typeof routeInclude }>) {
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

  private handleWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Mã tuyến hoặc trạm đã tồn tại.');
    }
    throw error;
  }
}
