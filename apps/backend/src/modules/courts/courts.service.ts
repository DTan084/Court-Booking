import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, ILike, DataSource } from 'typeorm';
import Redis from 'ioredis';
import { CourtEntity } from '../../database/entities/court.entity';
import { CourtTimeSlotEntity } from '../../database/entities/court-time-slot.entity';
import { CreateCourtDto } from './dto/create-court.dto';
import { GetCourtsDto } from './dto/get-courts.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { GetCourtStatsDto } from './dto/get-court-stats.dto';
import { UpsertTimeSlotsDto } from './dto/upsert-time-slots.dto';
import { BookingEntity } from '../../database/entities/booking.entity';
import { BookingStatus } from '@court-booking/shared';

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
    private readonly dataSource: DataSource,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async create(createCourtDto: CreateCourtDto): Promise<CourtEntity> {
    const court = this.courtRepository.create(createCourtDto);
    const savedCourt = await this.courtRepository.save(court);

    // Invalidate courts list cache
    await this.invalidateCourtsListCache();

    return savedCourt;
  }

  async findAll(query: GetCourtsDto) {
    const { page, limit, name, sportType, address } = query;

    // Generate cache key based on query params
    const cacheKey = `${this.COURTS_LIST_PREFIX}${JSON.stringify(query)}`;

    // Try to get from cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const skip = (page - 1) * limit;

    const where: any = { deletedAt: IsNull() };

    if (name) {
      where.name = ILike(`%${name}%`);
    }
    if (sportType) {
      where.sportType = sportType;
    }
    if (address) {
      where.address = ILike(`%${address}%`);
    }

    const [data, total] = await this.courtRepository.findAndCount({
      where,
      take: limit,
      skip,
      order: { createdAt: 'DESC' },
    });

    const result = {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache the result
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));

    return result;
  }

  async findOne(id: string): Promise<CourtEntity> {
    // Try to get from cache
    const cacheKey = `${this.COURT_CACHE_PREFIX}${id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const court = await this.courtRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!court) {
      throw new NotFoundException(`Court with ID ${id} not found`);
    }

    // Cache the court
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(court));

    return court;
  }

  async update(id: string, updateCourtDto: UpdateCourtDto): Promise<CourtEntity> {
    const court = await this.findOne(id);
    Object.assign(court, updateCourtDto);
    const updated = await this.courtRepository.save(court);

    // Invalidate cache
    await this.invalidateCourtCache(id);
    await this.invalidateCourtsListCache();

    return updated;
  }

  async softDelete(id: string): Promise<void> {
    await this.findOne(id);
    await this.courtRepository.softDelete(id);

    // Invalidate cache
    await this.invalidateCourtCache(id);
    await this.invalidateCourtsListCache();
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

  // ── Cache Management ───────────────────────────────────────────────────────

  private async invalidateCourtCache(courtId: string): Promise<void> {
    const cacheKey = `${this.COURT_CACHE_PREFIX}${courtId}`;
    await this.redis.del(cacheKey);
  }

  private async invalidateCourtsListCache(): Promise<void> {
    const pattern = `${this.COURTS_LIST_PREFIX}*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
