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
import { In, Repository } from 'typeorm';
import { FeatureEntity } from '../../database/entities/feature.entity';
import { CourtFeatureEntity } from '../../database/entities/court-feature.entity';
import { CourtEntity } from '../../database/entities/court.entity';

@Injectable()
export class FeaturesService {
  private readonly logger = new Logger(FeaturesService.name);
  private readonly CACHE_TTL_SECONDS = 300;
  private readonly PUBLIC_CACHE_KEY = 'features:public';
  private readonly COURT_CACHE_PREFIX = 'court:';
  private readonly COURTS_LIST_VERSION_KEY = 'courts:list:version';

  constructor(
    @InjectRepository(FeatureEntity)
    private readonly featureRepo: Repository<FeatureEntity>,
    @InjectRepository(CourtFeatureEntity)
    private readonly courtFeatureRepo: Repository<CourtFeatureEntity>,
    @InjectRepository(CourtEntity)
    private readonly courtRepo: Repository<CourtEntity>,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private async safeCacheGet<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      return cached ? (JSON.parse(cached) as T) : null;
    } catch {
      this.logger.warn(`Redis get failed for features cache key "${key}"`);
      return null;
    }
  }

  private async safeCacheSet(key: string, value: unknown): Promise<void> {
    try {
      await this.redis.setex(key, this.CACHE_TTL_SECONDS, JSON.stringify(value));
    } catch {
      this.logger.warn(`Redis set failed for features cache key "${key}"`);
    }
  }

  private async invalidateCaches(courtIds: string[] = []): Promise<void> {
    try {
      const multi = this.redis
        .multi()
        .del(this.PUBLIC_CACHE_KEY, 'features:admin')
        .incr(this.COURTS_LIST_VERSION_KEY);
      for (const courtId of courtIds) {
        multi.del(`${this.COURT_CACHE_PREFIX}${courtId}`);
      }
      await multi.exec();
    } catch {
      this.logger.warn('Redis invalidation failed for features caches');
    }
  }

  async list() {
    const cached = await this.safeCacheGet<FeatureEntity[]>(this.PUBLIC_CACHE_KEY);
    if (cached) return cached;

    const result = await this.featureRepo.find({
      where: { isActive: true },
      order: { category: 'ASC', name: 'ASC' },
    });
    await this.safeCacheSet(this.PUBLIC_CACHE_KEY, result);
    return result;
  }

  async listAdmin(): Promise<Array<FeatureEntity & { courtCount: number }>> {
    const features = await this.featureRepo.find({
      order: { category: 'ASC', name: 'ASC' },
    });
    const usage = await this.courtFeatureRepo
      .createQueryBuilder('cf')
      .select('cf.feature_id', 'featureId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('cf.feature_id')
      .getRawMany<{ featureId: string; count: string }>();
    const usageMap = new Map(usage.map((item) => [item.featureId, Number(item.count)]));
    return features.map((item) => ({ ...item, courtCount: usageMap.get(item.id) ?? 0 }));
  }

  async create(payload: { name: string; icon?: string; category?: string }) {
    const existed = await this.featureRepo
      .createQueryBuilder('feature')
      .where('LOWER(feature.name) = LOWER(:name)', { name: payload.name })
      .getOne();
    if (existed) throw new ConflictException('Feature already exists');
    const created = await this.featureRepo.save(
      this.featureRepo.create({
        name: payload.name.trim(),
        icon: payload.icon ?? null,
        category: payload.category ?? null,
        isActive: true,
      }),
    );
    await this.invalidateCaches();
    return created;
  }

  async update(
    id: string,
    payload: { name?: string; icon?: string | null; category?: string | null; isActive?: boolean },
  ) {
    const item = await this.featureRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Feature not found');
    if (payload.name) {
      const existed = await this.featureRepo
        .createQueryBuilder('feature')
        .where('LOWER(feature.name) = LOWER(:name)', { name: payload.name })
        .andWhere('feature.id != :id', { id })
        .getOne();
      if (existed) throw new ConflictException('Feature already exists');
    }
    Object.assign(item, payload);
    const updated = await this.featureRepo.save(item);
    const linkedCourtIds = await this.courtFeatureRepo.find({
      where: { featureId: id },
      select: ['courtId'],
    });
    await this.invalidateCaches(linkedCourtIds.map((link) => link.courtId));
    return updated;
  }

  async remove(id: string) {
    const item = await this.featureRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Feature not found');
    const usage = await this.courtFeatureRepo.count({ where: { featureId: id } });
    item.isActive = false;
    await this.featureRepo.save(item);
    const linkedCourtIds = await this.courtFeatureRepo.find({
      where: { featureId: id },
      select: ['courtId'],
    });
    await this.invalidateCaches(linkedCourtIds.map((link) => link.courtId));
    return {
      message: 'Feature has been hidden from UI',
      id,
      affectedCourts: usage,
      warning:
        usage > 0
          ? `${usage} courts are currently using this feature. It remains visible on assigned courts.`
          : null,
    };
  }

  async hardRemove(id: string) {
    const item = await this.featureRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Feature not found');
    const usage = await this.courtFeatureRepo.count({ where: { featureId: id } });
    if (usage > 0) {
      throw new ConflictException(`Cannot delete feature currently in use by ${usage} courts`);
    }
    await this.featureRepo.remove(item);
    await this.invalidateCaches();
    return { id };
  }

  async syncCourtFeatures(courtId: string, featureIds: string[]) {
    const court = await this.courtRepo.findOne({ where: { id: courtId } });
    if (!court) throw new NotFoundException('Court not found');

    if (featureIds.length > 0) {
      const features = await this.featureRepo.findBy({ id: In(featureIds), isActive: true });
      const foundSet = new Set(features.map((f) => f.id));
      const missing = featureIds.find((id) => !foundSet.has(id));
      if (missing) throw new BadRequestException(`Invalid or inactive feature ID: ${missing}`);
    }

    const current = await this.courtFeatureRepo.find({ where: { courtId } });
    const currentSet = new Set(current.map((item) => item.featureId));
    const nextSet = new Set(featureIds);

    const toDelete = current.filter((item) => !nextSet.has(item.featureId));
    const toAdd = featureIds.filter((id) => !currentSet.has(id));

    if (toDelete.length > 0) await this.courtFeatureRepo.remove(toDelete);
    if (toAdd.length > 0) {
      await this.courtFeatureRepo.save(
        toAdd.map((featureId) => this.courtFeatureRepo.create({ courtId, featureId })),
      );
    }

    await this.invalidateCaches([courtId]);
    return this.getCourtFeatures(courtId);
  }

  async getCourtFeatures(courtId: string) {
    const links = await this.courtFeatureRepo.find({ where: { courtId } });
    if (links.length === 0) return [];
    const featureIds = links.map((item) => item.featureId);
    return this.featureRepo.findBy({ id: In(featureIds) });
  }
}
