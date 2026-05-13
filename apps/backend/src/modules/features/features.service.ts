import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FeatureEntity } from '../../database/entities/feature.entity';
import { CourtFeatureEntity } from '../../database/entities/court-feature.entity';
import { CourtEntity } from '../../database/entities/court.entity';

@Injectable()
export class FeaturesService {
  constructor(
    @InjectRepository(FeatureEntity)
    private readonly featureRepo: Repository<FeatureEntity>,
    @InjectRepository(CourtFeatureEntity)
    private readonly courtFeatureRepo: Repository<CourtFeatureEntity>,
    @InjectRepository(CourtEntity)
    private readonly courtRepo: Repository<CourtEntity>,
  ) {}

  async list() {
    return this.featureRepo.find({
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async create(payload: { name: string; icon?: string; category?: string }) {
    const existed = await this.featureRepo
      .createQueryBuilder('feature')
      .where('LOWER(feature.name) = LOWER(:name)', { name: payload.name })
      .getOne();
    if (existed) throw new ConflictException('Tiện ích đã tồn tại');
    return this.featureRepo.save(
      this.featureRepo.create({
        name: payload.name.trim(),
        icon: payload.icon ?? null,
        category: payload.category ?? null,
      }),
    );
  }

  async update(
    id: string,
    payload: { name?: string; icon?: string | null; category?: string | null },
  ) {
    const item = await this.featureRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Feature not found');
    if (payload.name) {
      const existed = await this.featureRepo
        .createQueryBuilder('feature')
        .where('LOWER(feature.name) = LOWER(:name)', { name: payload.name })
        .andWhere('feature.id != :id', { id })
        .getOne();
      if (existed) throw new ConflictException('Tiện ích đã tồn tại');
    }
    Object.assign(item, payload);
    return this.featureRepo.save(item);
  }

  async remove(id: string) {
    const item = await this.featureRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Feature not found');
    await this.featureRepo.remove(item);
    return { id };
  }

  async syncCourtFeatures(courtId: string, featureIds: string[]) {
    const court = await this.courtRepo.findOne({ where: { id: courtId } });
    if (!court) throw new NotFoundException('Court not found');

    if (featureIds.length > 0) {
      const features = await this.featureRepo.findBy({ id: In(featureIds) });
      const foundSet = new Set(features.map((f) => f.id));
      const missing = featureIds.find((id) => !foundSet.has(id));
      if (missing) throw new BadRequestException(`Feature không tồn tại: ${missing}`);
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

    return this.getCourtFeatures(courtId);
  }

  async getCourtFeatures(courtId: string) {
    const links = await this.courtFeatureRepo.find({ where: { courtId } });
    if (links.length === 0) return [];
    const featureIds = links.map((item) => item.featureId);
    return this.featureRepo.findBy({ id: In(featureIds) });
  }
}
