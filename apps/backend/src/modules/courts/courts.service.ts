import { Injectable, NotFoundException, Inject, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource, In } from 'typeorm';
import Redis from 'ioredis';
import { CourtEntity } from '../../database/entities/court.entity';
import { CourtImageEntity } from '../../database/entities/court-image.entity';
import { CourtTimeSlotEntity } from '../../database/entities/court-time-slot.entity';
import { CourtFeatureEntity } from '../../database/entities/court-feature.entity';
import { FeatureEntity } from '../../database/entities/feature.entity';
import { SportTypeEntity } from '../../database/entities/sport-type.entity';
import { CreateCourtDto } from './dto/create-court.dto';
import { GetCourtsDto } from './dto/get-courts.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { GetCourtStatsDto } from './dto/get-court-stats.dto';
import { UpsertTimeSlotsDto } from './dto/upsert-time-slots.dto';
import { AddCourtImageDto } from './dto/add-court-image.dto';
import { ReorderCourtImagesDto } from './dto/reorder-court-images.dto';
import { BookingEntity } from '../../database/entities/booking.entity';
import { BookingStatus, CancelledBy } from '@court-booking/shared';
import { CourtStatus } from '../../database/entities/court.entity';

@Injectable()
export class CourtsService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly COURT_CACHE_PREFIX = 'court:';
  private readonly COURTS_LIST_PREFIX = 'courts:list:';

  constructor(
    @InjectRepository(CourtEntity)
    private readonly courtRepository: Repository<CourtEntity>,
    @InjectRepository(CourtTimeSlotEntity)
    private readonly timeSlotRepository: Repository<CourtTimeSlotEntity>,
    @InjectRepository(CourtImageEntity)
    private readonly courtImageRepository: Repository<CourtImageEntity>,
    @InjectRepository(CourtFeatureEntity)
    private readonly courtFeatureRepository: Repository<CourtFeatureEntity>,
    @InjectRepository(FeatureEntity)
    private readonly featureRepository: Repository<FeatureEntity>,
    @InjectRepository(SportTypeEntity)
    private readonly sportTypeRepository: Repository<SportTypeEntity>,
    private readonly dataSource: DataSource,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private async resolveSportTypeId(sportTypeId: string): Promise<string> {
    const existingById = await this.sportTypeRepository.findOne({ where: { id: sportTypeId } });
    if (!existingById) {
      throw new BadRequestException('Invalid sportTypeId');
    }
    return sportTypeId;
  }

  private async safeCacheGet(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch {
      return null;
    }
  }

  private async safeCacheSet(key: string, ttlSeconds: number, value: string): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, value);
    } catch {
      // no-op: cache failure must not break API response
    }
  }

  private async safeCacheDel(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.redis.del(...keys);
    } catch {
      // no-op
    }
  }

  async create(createCourtDto: CreateCourtDto): Promise<CourtEntity> {
    const sportTypeId = await this.resolveSportTypeId(createCourtDto.sportTypeId);
    const court = this.courtRepository.create({
      ...createCourtDto,
      sportTypeId,
    });
    const savedCourt = await this.courtRepository.save(court);

    // Invalidate courts list cache
    await this.invalidateCourtsListCache();

    return savedCourt;
  }

  async findAll(query: GetCourtsDto) {
    const {
      page,
      limit,
      name,
      sportTypeId,
      courtType,
      address,
      district,
      location,
      featureIds,
      minPrice,
      maxPrice,
      minPlayers,
      maxPlayers,
      availableToday,
    } = query;

    // Generate cache key based on query params
    const cacheKey = `${this.COURTS_LIST_PREFIX}${JSON.stringify(query)}`;

    // Try to get from cache
    const cached = await this.safeCacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const skip = (page - 1) * limit;

    const qb = this.courtRepository
      .createQueryBuilder('court')
      .leftJoinAndSelect('court.images', 'images')
      .where('court.deletedAt IS NULL')
      .skip(skip)
      .take(limit)
      .orderBy('court.isFeatured', 'DESC')
      .addOrderBy('court.createdAt', 'DESC');

    if (name) {
      qb.andWhere('court.name ILIKE :name', { name: `%${name}%` });
    }
    if (sportTypeId?.length) {
      qb.andWhere('court.sportTypeId IN (:...sportTypeId)', { sportTypeId });
    }
    if (courtType) {
      qb.andWhere('court.courtType = :courtType', { courtType });
    }
    if (address) {
      qb.andWhere('court.address ILIKE :address', { address: `%${address}%` });
    }
    if (district?.length) {
      qb.andWhere('LOWER(court.district) IN (:...district)', {
        district: district.map((d) => d.toLowerCase()),
      });
    }
    if (location) {
      qb.andWhere('court.address ILIKE :location', { location: `%${location}%` });
    }
    if (featureIds?.length) {
      qb.andWhere(
        `court.id IN (
          SELECT cf.court_id
          FROM court_features cf
          WHERE cf.feature_id IN (:...featureIds)
          GROUP BY cf.court_id
          HAVING COUNT(DISTINCT cf.feature_id) = :featureCount
        )`,
        { featureIds, featureCount: featureIds.length },
      );
    }
    if (minPrice !== undefined) {
      qb.andWhere('court.pricePerHour >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      qb.andWhere('court.pricePerHour <= :maxPrice', { maxPrice });
    }
    if (minPlayers !== undefined) {
      qb.andWhere('court.maxPlayers IS NOT NULL AND court.maxPlayers >= :minPlayers', {
        minPlayers,
      });
    }
    if (maxPlayers !== undefined) {
      qb.andWhere('court.maxPlayers IS NOT NULL AND court.maxPlayers <= :maxPlayers', {
        maxPlayers,
      });
    }
    if (availableToday) {
      const now = new Date();
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM court_time_slots cts
          WHERE cts.court_id = court.id
            AND cts.day_of_week = EXTRACT(DOW FROM :now::timestamp)
            AND cts.end_hour > EXTRACT(HOUR FROM :now::timestamp)
            AND NOT EXISTS (
              SELECT 1
              FROM bookings b
              WHERE b.court_id = court.id
                AND b.start_time < (DATE(:now::timestamp) + (cts.end_hour || ' hours')::interval)
                AND b.end_time > (DATE(:now::timestamp) + (cts.start_hour || ' hours')::interval)
                AND (
                  b.status = :confirmedStatus
                  OR (
                    b.status = :pendingStatus
                    AND b.payment_deadline IS NOT NULL
                    AND b.payment_deadline > :now
                  )
                )
            )
        )`,
        {
          now,
          confirmedStatus: BookingStatus.CONFIRMED,
          pendingStatus: BookingStatus.PENDING_PAYMENT,
        },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    const courtIds = data.map((court) => court.id);
    const featureByCourt = new Map<string, FeatureEntity[]>();
    if (courtIds.length > 0) {
      const links = await this.courtFeatureRepository
        .createQueryBuilder('cf')
        .where('cf.court_id IN (:...courtIds)', { courtIds })
        .getMany();
      const featureIdsInUse = [...new Set(links.map((item) => item.featureId))];
      const featureList =
        featureIdsInUse.length > 0
          ? await this.featureRepository.findBy({ id: In(featureIdsInUse) })
          : [];
      const featureMap = new Map(featureList.map((item) => [item.id, item]));
      for (const link of links) {
        const feature = featureMap.get(link.featureId);
        if (!feature) continue;
        if (!featureByCourt.has(link.courtId)) {
          featureByCourt.set(link.courtId, []);
        }
        featureByCourt.get(link.courtId)!.push(feature);
      }
    }

    const result = {
      data: data.map((court) => ({
        ...court,
        featureItems: featureByCourt.get(court.id) ?? [],
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache the result
    await this.safeCacheSet(cacheKey, this.CACHE_TTL, JSON.stringify(result));

    return result;
  }

  async findOne(id: string): Promise<CourtEntity> {
    // Try to get from cache
    const cacheKey = `${this.COURT_CACHE_PREFIX}${id}`;
    const cached = await this.safeCacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const court = await this.courtRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['images'],
      order: { images: { displayOrder: 'ASC' } },
    });

    if (!court) {
      throw new NotFoundException(`Court with ID ${id} not found`);
    }

    const links = await this.courtFeatureRepository
      .createQueryBuilder('cf')
      .where('cf.court_id = :courtId', { courtId: court.id })
      .getMany();
    const featureIds = [...new Set(links.map((item) => item.featureId))];
    const featureItems =
      featureIds.length > 0 ? await this.featureRepository.findBy({ id: In(featureIds) }) : [];

    const result = {
      ...court,
      featureItems,
    };

    // Cache the court
    await this.safeCacheSet(cacheKey, this.CACHE_TTL, JSON.stringify(result));

    return result as CourtEntity;
  }

  async update(
    id: string,
    updateCourtDto: UpdateCourtDto,
  ): Promise<{
    court: CourtEntity;
    autoCancelledBookings: number;
  }> {
    const court = await this.findOne(id);
    const wasActive = court.status === CourtStatus.ACTIVE;
    let normalized = updateCourtDto;
    if (updateCourtDto.sportTypeId) {
      const resolvedSportTypeId = await this.resolveSportTypeId(updateCourtDto.sportTypeId);
      normalized = { ...updateCourtDto, sportTypeId: resolvedSportTypeId };
    }
    Object.assign(court, normalized);
    const updated = await this.courtRepository.save(court);

    let autoCancelledBookings = 0;
    if (wasActive && updated.status === CourtStatus.INACTIVE) {
      autoCancelledBookings = await this.cancelFutureBookingsForUnavailableCourt(
        id,
        'Court temporarily unavailable (inactive by admin)',
      );
    }

    // Invalidate cache
    await this.invalidateCourtCache(id);
    await this.invalidateCourtsListCache();

    return { court: updated, autoCancelledBookings };
  }

  async updateFeatured(id: string, isFeatured: boolean): Promise<CourtEntity> {
    const court = await this.findOne(id);
    court.isFeatured = isFeatured;
    const updated = await this.courtRepository.save(court);
    await this.invalidateCourtCache(id);
    await this.invalidateCourtsListCache();
    return updated;
  }

  async softDelete(id: string): Promise<number> {
    await this.findOne(id);
    const autoCancelledBookings = await this.cancelFutureBookingsForUnavailableCourt(
      id,
      'Court temporarily unavailable (deleted by admin)',
    );
    await this.courtRepository.softDelete(id);

    // Invalidate cache
    await this.invalidateCourtCache(id);
    await this.invalidateCourtsListCache();
    return autoCancelledBookings;
  }

  private async cancelFutureBookingsForUnavailableCourt(
    courtId: string,
    cancellationNote: string,
  ): Promise<number> {
    const now = new Date();
    const targets = await this.dataSource.getRepository(BookingEntity).find({
      where: [
        { courtId, status: BookingStatus.PENDING_PAYMENT },
        { courtId, status: BookingStatus.CONFIRMED },
      ],
    });

    const futureTargets = targets.filter((b) => new Date(b.startTime) > now);
    if (futureTargets.length === 0) return 0;

    for (const booking of futureTargets) {
      const prevStatus = booking.status;
      booking.status = BookingStatus.CANCELLED;
      booking.cancelledAt = now;
      booking.cancelledBy = CancelledBy.SYSTEM;
      booking.cancelledReason = 'system_policy';
      booking.cancellationNote = cancellationNote;
      if (prevStatus === BookingStatus.CONFIRMED) {
        booking.paidAt = booking.paidAt ?? now;
        booking.paymentMethod = booking.paymentMethod ?? 'AUTO';
        booking.refundAmount = Number(booking.totalPrice);
      } else if (booking.paidAt) {
        booking.refundAmount = booking.totalPrice;
      }
    }
    await this.dataSource.getRepository(BookingEntity).save(futureTargets);
    return futureTargets.length;
  }

  async findDeleted(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [deletedOnly, total] = await this.courtRepository
      .createQueryBuilder('court')
      .withDeleted()
      .where('court.deletedAt IS NOT NULL')
      .orderBy('court.deletedAt', 'DESC')
      .addOrderBy('court.updatedAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
    return {
      data: deletedOnly,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async restoreCourt(id: string): Promise<void> {
    const found = await this.courtRepository.findOne({ where: { id }, withDeleted: true });
    if (!found) throw new NotFoundException(`Court with ID ${id} not found`);
    await this.courtRepository.restore(id);
    await this.invalidateCourtCache(id);
    await this.invalidateCourtsListCache();
  }

  async hardDelete(id: string): Promise<void> {
    const found = await this.courtRepository.findOne({ where: { id }, withDeleted: true });
    if (!found) throw new NotFoundException(`Court with ID ${id} not found`);
    await this.courtRepository.delete(id);
    await this.invalidateCourtCache(id);
    await this.invalidateCourtsListCache();
  }

  /**
   * REQ-21.4: GET /courts/districts — distinct districts of ACTIVE courts
   */
  async getDistricts(): Promise<string[]> {
    const rows = await this.courtRepository
      .createQueryBuilder('c')
      .select('DISTINCT c.district', 'district')
      .where('c.deleted_at IS NULL')
      .andWhere('c.district IS NOT NULL')
      .andWhere("c.status = 'ACTIVE'")
      .orderBy('district', 'ASC')
      .getRawMany();

    return rows.map((r) => r.district as string);
  }

  async getStats(id: string, query: GetCourtStatsDto) {
    const court = await this.findOne(id);
    const { fromDate, toDate } = query;

    const stats = await this.dataSource
      .createQueryBuilder(BookingEntity, 'booking')
      .select('COUNT(booking.id)', 'bookingCount')
      .addSelect(
        'SUM(EXTRACT(EPOCH FROM (booking.end_time - booking.start_time))/3600)',
        'totalHours',
      )
      .where('booking.courtId = :courtId', { courtId: id })
      .andWhere('booking.status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere('booking.startTime >= :fromDate', { fromDate: new Date(fromDate) })
      .andWhere('booking.startTime <= :toDate', { toDate: new Date(toDate) })
      .getRawOne();

    // Calculate total possible hours based on time slots
    const totalPossibleHours = await this.calculateAvailableHours(id, fromDate, toDate);

    const totalHours = Number(stats.totalHours) || 0;
    const utilizationPercentage =
      totalPossibleHours > 0 ? (totalHours / totalPossibleHours) * 100 : 0;

    return {
      courtId: id,
      courtName: court.name,
      period: {
        from: fromDate,
        to: toDate,
      },
      totalBookings: Number(stats.bookingCount) || 0,
      totalHours: Number(totalHours.toFixed(2)),
      utilizationPercentage: Number(utilizationPercentage.toFixed(2)),
      totalAvailableHours: Number(totalPossibleHours.toFixed(2)),
    };
  }

  /**
   * Calculate total available hours for a court based on time slots
   * within a date range
   */
  private async calculateAvailableHours(
    courtId: string,
    fromDate: string,
    toDate: string,
  ): Promise<number> {
    const timeSlots = await this.timeSlotRepository.find({
      where: { courtId },
    });

    // If no time slots defined, fallback to 24h/day
    if (timeSlots.length === 0) {
      const daysDifference =
        (new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 3600 * 24) || 1;
      return daysDifference * 24;
    }

    // Calculate hours per day of week
    const hoursPerDayOfWeek = new Map<number, number>();
    for (const slot of timeSlots) {
      const hours = slot.endHour - slot.startHour;
      const currentHours = hoursPerDayOfWeek.get(slot.dayOfWeek) || 0;
      hoursPerDayOfWeek.set(slot.dayOfWeek, currentHours + hours);
    }

    // Count days in range and sum available hours
    let totalHours = 0;
    const start = new Date(fromDate);
    const end = new Date(toDate);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const hoursForDay = hoursPerDayOfWeek.get(dayOfWeek) || 0;
      totalHours += hoursForDay;
    }

    return totalHours;
  }

  // ── Time Slots ─────────────────────────────────────────────────────────────

  async getTimeSlots(courtId: string): Promise<CourtTimeSlotEntity[]> {
    await this.findOne(courtId);
    return this.timeSlotRepository.find({
      where: { courtId },
      order: { dayOfWeek: 'ASC', startHour: 'ASC' },
    });
  }

  async upsertTimeSlots(courtId: string, dto: UpsertTimeSlotsDto): Promise<CourtTimeSlotEntity[]> {
    await this.findOne(courtId);

    // Replace all slots for this court atomically
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(CourtTimeSlotEntity, { courtId });
      const entities = dto.slots.map((slot) =>
        manager.create(CourtTimeSlotEntity, { ...slot, courtId }),
      );
      await manager.save(entities);
    });

    // Invalidate cache since time slots affect court data
    await this.invalidateCourtCache(courtId);

    return this.getTimeSlots(courtId);
  }

  async addImage(courtId: string, dto: AddCourtImageDto): Promise<CourtImageEntity> {
    await this.findOne(courtId);
    const image = this.courtImageRepository.create({ ...dto, courtId });
    const saved = await this.courtImageRepository.save(image);
    await this.invalidateCourtCache(courtId);
    await this.invalidateCourtsListCache();
    return saved;
  }

  async removeImage(courtId: string, imageId: string): Promise<void> {
    await this.findOne(courtId);
    const image = await this.courtImageRepository.findOne({ where: { id: imageId, courtId } });
    if (!image) {
      throw new NotFoundException(`Image with ID ${imageId} not found`);
    }
    await this.courtImageRepository.remove(image);
    await this.invalidateCourtCache(courtId);
    await this.invalidateCourtsListCache();
  }

  async updateImageAltText(
    courtId: string,
    imageId: string,
    altText?: string,
  ): Promise<CourtImageEntity> {
    await this.findOne(courtId);
    const image = await this.courtImageRepository.findOne({ where: { id: imageId, courtId } });
    if (!image) {
      throw new NotFoundException(`Image with ID ${imageId} not found`);
    }
    image.altText = altText?.trim() ? altText.trim() : null;
    const saved = await this.courtImageRepository.save(image);
    await this.invalidateCourtCache(courtId);
    await this.invalidateCourtsListCache();
    return saved;
  }

  async reorderImages(courtId: string, dto: ReorderCourtImagesDto): Promise<CourtImageEntity[]> {
    await this.findOne(courtId);
    await this.dataSource.transaction(async (manager) => {
      for (const item of dto.images) {
        const result = await manager.update(
          CourtImageEntity,
          { id: item.imageId, courtId },
          { displayOrder: item.displayOrder },
        );
        if (!result.affected) {
          throw new NotFoundException(`Image with ID ${item.imageId} not found`);
        }
      }
    });
    await this.invalidateCourtCache(courtId);
    await this.invalidateCourtsListCache();
    return this.courtImageRepository.find({
      where: { courtId },
      order: { displayOrder: 'ASC' },
    });
  }

  // ── Cache Management ───────────────────────────────────────────────────────

  private async invalidateCourtCache(courtId: string): Promise<void> {
    const cacheKey = `${this.COURT_CACHE_PREFIX}${courtId}`;
    await this.safeCacheDel(cacheKey);
  }

  private async invalidateCourtsListCache(): Promise<void> {
    const pattern = `${this.COURTS_LIST_PREFIX}*`;
    try {
      const keys = await this.redis.keys(pattern);
      await this.safeCacheDel(...keys);
    } catch {
      // no-op
    }
  }
}
