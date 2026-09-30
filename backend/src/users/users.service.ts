import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DiscountStatus, UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(role?: UserRole) {
    return this.prisma.user.findMany({
      where: role ? { role } : undefined,
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        role: true,
        status: true,
        discountType: true,
        discountStatus: true,
        discountProofUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveDiscount(id: string, status: DiscountStatus) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { discountStatus: status },
      select: {
        id: true,
        fullName: true,
        email: true,
        discountType: true,
        discountStatus: true,
      },
    });

    // Tạo thông báo đến người dùng về trạng thái xét duyệt
    await this.prisma.notification.create({
      data: {
        userId: id,
        title: status === DiscountStatus.APPROVED ? 'Xét duyệt ưu đãi thành công!' : 'Hồ sơ ưu đãi bị từ chối',
        content: status === DiscountStatus.APPROVED
          ? 'Hồ sơ đối tượng ưu tiên của bạn đã được duyệt. Bạn sẽ được áp dụng giá vé ưu đãi khi mua vé.'
          : 'Hồ sơ đối tượng ưu tiên của bạn chưa đạt yêu cầu. Vui lòng cập nhật lại ảnh minh chứng.',
        type: 'SYSTEM',
      },
    }).catch(() => null);

    return updated;
  }
}
