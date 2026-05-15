import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { SportTypeEntity } from '../../database/entities/sport-type.entity';
import { CourtEntity } from '../../database/entities/court.entity';

@Injectable()
export class SportTypesService {
  constructor(
    @InjectRepository(SportTypeEntity)
    private readonly sportTypeRepo: Repository<SportTypeEntity>,
    @InjectRepository(CourtEntity)
    private readonly courtRepo: Repository<CourtEntity>,
  ) {}

  async listPublic() {
    return this.sportTypeRepo.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async listAdmin() {
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
      throw new ConflictException('Loai the thao da ton tai');
    }
  }

  async create(payload: { name: string; icon?: string; color?: string; displayOrder?: number }) {
    await this.ensureUniqueName(payload.name);
    if (payload.color && !/^#[0-9A-Fa-f]{6}$/.test(payload.color)) {
      throw new BadRequestException('Mau sac phai theo dinh dang #RRGGBB');
    }
    return this.sportTypeRepo.save(
      this.sportTypeRepo.create({
        name: payload.name.trim(),
        icon: payload.icon ?? null,
        color: payload.color ?? null,
        displayOrder: payload.displayOrder ?? 0,
      }),
    );
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
      throw new BadRequestException('Mau sac phai theo dinh dang #RRGGBB');
    }
    Object.assign(item, payload);
    return this.sportTypeRepo.save(item);
  }

  async remove(id: string) {
    const item = await this.sportTypeRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Sport type not found');
    item.isActive = false;
    await this.sportTypeRepo.save(item);
    const affectedCourts = await this.courtRepo.count({
      where: { sportTypeId: id, deletedAt: IsNull() },
    });
    return {
      message: 'Sport type da bi an khoi danh sach',
      id,
      affectedCourts,
      warning:
        affectedCourts > 0 ? `${affectedCourts} san hien tai van hoat dong binh thuong` : null,
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
        `Khong the xoa - co ${usage} san dang dung sport type nay. Hay chuyen san sang sport type khac hoac an sport type.`,
      );
    }
    await this.sportTypeRepo.remove(item);
    return { id };
  }
}
