import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../database/entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { BookingEntity } from '../../database/entities/booking.entity';
import { BookingStatus } from '@court-booking/shared';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    private readonly settingsService: SettingsService,
  ) {}

  async findMe(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateMe(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findMe(id);
    await this.assertProfileUpdateAllowed(user);

    Object.assign(user, updateUserDto);
    user.updatedAt = new Date();
    return this.userRepository.save(user);
  }

  async listAdminUsers(params: { page: number; limit: number; search?: string }) {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));
    const qb = this.userRepository.createQueryBuilder('u');

    if (params.search?.trim()) {
      const s = `%${params.search.trim().toLowerCase()}%`;
      qb.andWhere('(LOWER(u.name) LIKE :s OR LOWER(u.email) LIKE :s)', { s });
    }

    qb.orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [users, total] = await qb.getManyAndCount();

    const userIds = users.map((u) => u.id);
    const statsMap = new Map<
      string,
      {
        successfulBookings: number;
        totalBookings: number;
        lifetimeValue: number;
        lastActiveAt: Date | null;
      }
    >();

    if (userIds.length > 0) {
      const rows = await this.bookingRepository
        .createQueryBuilder('b')
        .select('b.userId', 'userId')
        .addSelect(
          `SUM(CASE WHEN b.status IN (:...successfulStatuses) THEN 1 ELSE 0 END)`,
          'successfulBookings',
        )
        .addSelect('COUNT(*)', 'totalBookings')
        .addSelect(
          `COALESCE(SUM(CASE WHEN b.status IN (:...paidStatuses) THEN b.totalPrice ELSE 0 END), 0)`,
          'lifetimeValue',
        )
        .addSelect('MAX(b.updatedAt)', 'lastActiveAt')
        .where('b.userId IN (:...userIds)', { userIds })
        .setParameter('paidStatuses', [BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
        .setParameter('successfulStatuses', [BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
        .groupBy('b.userId')
        .getRawMany();

      rows.forEach((r) => {
        statsMap.set(r.userId, {
          successfulBookings: Number(r.successfulBookings ?? 0),
          totalBookings: Number(r.totalBookings ?? 0),
          lifetimeValue: Number(r.lifetimeValue ?? 0),
          lastActiveAt: r.lastActiveAt ? new Date(r.lastActiveAt) : null,
        });
      });
    }

    const now = new Date();
    const new30dStart = new Date(now);
    new30dStart.setDate(new30dStart.getDate() - 30);

    const [newCustomers30d, activeMembers] = await Promise.all([
      this.userRepository
        .createQueryBuilder('u')
        .where('u.createdAt >= :from', { from: new30dStart })
        .getCount(),
      this.bookingRepository
        .createQueryBuilder('b')
        .select('COUNT(DISTINCT b.userId)', 'cnt')
        .where('b.status IN (:...successfulStatuses)', {
          successfulStatuses: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
        })
        .getRawOne()
        .then((r) => Number(r?.cnt ?? 0)),
    ]);

    return {
      data: users.map((u) => {
        const s = statsMap.get(u.id);
        return {
          ...u,
          successfulBookings: s?.successfulBookings ?? 0,
          totalBookings: s?.totalBookings ?? 0,
          lifetimeValue: s?.lifetimeValue ?? 0,
          lastActiveAt: s?.lastActiveAt ?? null,
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalCustomers: total,
        newCustomers30d,
        activeMembers,
      },
    };
  }

  async updateByAdmin(
    id: string,
    payload: UpdateUserDto & { email?: string; role?: 'USER' | 'ADMIN' },
  ): Promise<UserEntity> {
    const user = await this.findMe(id);

    if (payload.email && payload.email !== user.email) {
      const existing = await this.userRepository.findOne({ where: { email: payload.email } });
      if (existing && existing.id !== id) {
        throw new ConflictException('Email already exists');
      }
    }

    Object.assign(user, payload);
    return this.userRepository.save(user);
  }

  private async assertProfileUpdateAllowed(user: UserEntity) {
    if (!user.updatedAt) return;

    const cooldownDays = await this.settingsService.getNumber('profile_update_cooldown_days', 30);
    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
    const nextAllowedAt = new Date(user.updatedAt.getTime() + cooldownMs);

    if (Date.now() < nextAllowedAt.getTime()) {
      throw new HttpException(
        `Ban chi duoc cap nhat ho so ${cooldownDays} ngay 1 lan. Thu lai sau: ${nextAllowedAt.toISOString()}`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
