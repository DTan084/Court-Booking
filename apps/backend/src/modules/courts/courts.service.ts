import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, ILike, DataSource } from 'typeorm';
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
  constructor(
    @InjectRepository(CourtEntity)
    private readonly courtRepository: Repository<CourtEntity>,
    @InjectRepository(CourtTimeSlotEntity)
    private readonly timeSlotRepository: Repository<CourtTimeSlotEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createCourtDto: CreateCourtDto): Promise<CourtEntity> {
    const court = this.courtRepository.create(createCourtDto);
    return this.courtRepository.save(court);
  }

  async findAll(query: GetCourtsDto) {
    const { page, limit, name, sportType, address } = query;
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

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<CourtEntity> {
    const court = await this.courtRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!court) {
      throw new NotFoundException(`Court with ID ${id} not found`);
    }
    return court;
  }

  async update(id: string, updateCourtDto: UpdateCourtDto): Promise<CourtEntity> {
    const court = await this.findOne(id);
    Object.assign(court, updateCourtDto);
    return this.courtRepository.save(court);
  }

  async softDelete(id: string): Promise<void> {
    await this.findOne(id);
    await this.courtRepository.softDelete(id);
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

    const daysDifference =
      (new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 3600 * 24) || 1;
    const totalPossibleHours = daysDifference * 24;

    const totalHours = Number(stats.totalHours) || 0;
    const utilizationPercentage = (totalHours / totalPossibleHours) * 100;

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
    };
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

    return this.getTimeSlots(courtId);
  }
}
