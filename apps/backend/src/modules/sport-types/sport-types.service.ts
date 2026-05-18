import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { IsNull, Repository } from 'typeorm';
import { SportTypeEntity } from '../../database/entities/sport-type.entity';
import { CourtEntity } from '../../database/entities/court.entity';

@Injectable()
export class SportTypesService {
  private readonly logger = new Logger(SportTypesService.name);
  private readonly CACHE_TTL_SECONDS = 300;
  private readonly PUBLIC_CACHE_KEY = 'sport-types:public';
  private readonly COURT_CACHE_PREFIX = 'court:';
  private readonly COURTS_LIST_VERSION_KEY = 'courts:list:version';

  constructor(
    @InjectRepository(SportTypeEntity)
    private readonly sportTypeRepo: Repository<SportTypeEntity>,
    @InjectRepository(CourtEntity)
    private readonly courtRepo: Repository<CourtEntity>,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private async safeCacheGet<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      return cached ? (JSON.parse(cached) as T) : null;
    } catch {
      this.logger.warn(`Redis get failed for sport types cache key "${key}"`);
      return null;
    }
  }

  private async safeCacheSet(key: string, value: unknown): Promise<void> {
    try {
      await this.redis.setex(key, this.CACHE_TTL_SECONDS, JSON.stringify(value));
    } catch {
      this.logger.warn(`Redis set failed for sport types cache key "${key}"`);
    }
  }

  private async invalidateCaches(sportTypeId?: string): Promise<void> {
    try {
      const multi = this.redis
        .multi()
        .del(this.PUBLIC_CACHE_KEY, 'sport-types:admin')
        .incr(this.COURTS_LIST_VERSION_KEY);

      if (sportTypeId) {
        const courts = await this.courtRepo.find({
          where: { sportTypeId, deletedAt: IsNull() },
          select: ['id'],
        });
        for (const court of courts) {
          multi.del(`${this.COURT_CACHE_PREFIX}${court.id}`);
        }
      }

      await multi.exec();
    } catch {
      this.logger.warn('Redis invalidation failed for sport types caches');
    }
  }

  async listPublic() {
    const cached = await this.safeCacheGet<SportTypeEntity[]>(this.PUBLIC_CACHE_KEY);
    if (cached) return cached;

    const result = await this.sportTypeRepo.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
    await this.safeCacheSet(this.PUBLIC_CACHE_KEY, result);
    return result;
  }

  async listAdmin(): Promise<Array<SportTypeEntity & { courtCount: number }>> {
    const sportTypes = await this.sportTypeRepo.find({
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
    const usage = await this.courtRepo
      .createQueryBuilder('court')
      .select('court.sport_type_id', 'sportTypeId')
      .addSelect('COUNT(*)', 'count')
      .where('court.sport_type_id IS NOT NULL')
      .andWhere('court.deleted_at IS NULL')
      .groupBy('court.sport_type_id')
      .getRawMany<{ sportTypeId: string; count: string }>();
    const usageMap = new Map(usage.map((item) => [item.sportTypeId, Number(item.count)]));
    return sportTypes.map((item) => ({ ...item, courtCount: usageMap.get(item.id) ?? 0 }));
  }

  private async ensureUniqueName(name: string, excludeId?: string) {
    const qb = this.sportTypeRepo
      .createQueryBuilder('sportType')
      .where('LOWER(sportType.name) = LOWER(:name)', { name });
    if (excludeId) qb.andWhere('sportType.id != :excludeId', { excludeId });
    const existed = await qb.getOne();
    if (existed) {
      throw new ConflictException('Sport type already exists');
    }
  }

  async create(payload: { name: string; icon?: string; color?: string; displayOrder?: number }) {
    await this.ensureUniqueName(payload.name);
    if (payload.color && !/^#[0-9A-Fa-f]{6}$/.test(payload.color)) {
      throw new BadRequestException('Color must be in #RRGGBB format');
    }
    const created = await this.sportTypeRepo.save(
      this.sportTypeRepo.create({
        name: payload.name.trim(),
        icon: payload.icon ?? null,
        color: payload.color ?? null,
        displayOrder: payload.displayOrder ?? 0,
      }),
    );
    await this.invalidateCaches();
    return created;
  }

  async update(
    id: string,
    payload: {
      name?: string;
      icon?: string | null;
      color?: string | null;
      displayOrder?: number;
      isActive?: boolean;
    },
  ) {
    const item = await this.sportTypeRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Sport type not found');
    if (payload.name) await this.ensureUniqueName(payload.name, id);
    if (payload.color && !/^#[0-9A-Fa-f]{6}$/.test(payload.color)) {
      throw new BadRequestException('Color must be in #RRGGBB format');
    }
    Object.assign(item, payload);
    const updated = await this.sportTypeRepo.save(item);
    await this.invalidateCaches(id);
    return updated;
  }

  async remove(id: string) {
    const item = await this.sportTypeRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Sport type not found');
    item.isActive = false;
    await this.sportTypeRepo.save(item);
    const affectedCourts = await this.courtRepo.count({
      where: { sportTypeId: id, deletedAt: IsNull() },
    });
    await this.invalidateCaches(id);
    return {
      message: 'Sport type has been hidden from list',
      id,
      affectedCourts,
      warning: affectedCourts > 0 ? `${affectedCourts} courts are still active normally` : null,
    };
  }

  async hardRemove(id: string) {
    const item = await this.sportTypeRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Sport type not found');
    const usage = await this.courtRepo.count({
      where: { sportTypeId: id, deletedAt: IsNull() },
    });
    if (usage > 0) {
      throw new ConflictException(
        `Cannot delete - there are ${usage} courts currently using this sport type. Please assign those courts to another sport type or hide this sport type instead.`,
      );
    }
    await this.sportTypeRepo.remove(item);
    await this.invalidateCaches(id);
    return { id };
  }
}
