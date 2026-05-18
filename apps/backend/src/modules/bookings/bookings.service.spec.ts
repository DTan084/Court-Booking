import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { CourtEntity, CourtStatus } from '../../database/entities/court.entity';
import { CourtTimeSlotEntity } from '../../database/entities/court-time-slot.entity';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import bookingConfig from '../../config/booking.config';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@court-booking/shared';
import { CreateBookingDto } from './dto/create-booking.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UserEntity } from '../../database/entities/user.entity';
import { SettingsService } from '../settings/settings.service';

const mockBookingRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  exist: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  })),
});

const mockCourtRepository = () => ({
  findOne: jest.fn(),
  exist: jest.fn(),
});

const mockTimeSlotRepository = () => ({
  find: jest.fn().mockResolvedValue([]),
});

const mockConfigService = () => ({
  get: jest.fn((key: string, defaultValue?: any) => {
    if (key === 'booking.minCancelHours') return 2;
    return defaultValue;
  }),
});

const mockUserRepository = () => ({
  findOne: jest.fn(),
});

const mockSettingsService = () => ({
  getNumber: jest.fn((key: string, defaultValue: number) => defaultValue),
});

const mockDataSource = () => ({
  transaction: jest.fn(),
});

const mockBookingConfig = () => ({
  minCancelHours: 2,
  maxBookingDurationHours: 8,
});

describe('BookingsService', () => {
  let service: BookingsService;
  let timeSlotRepository: ReturnType<typeof mockTimeSlotRepository>;
  let dataSource: ReturnType<typeof mockDataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(BookingEntity),
          useFactory: mockBookingRepository,
        },
        {
          provide: getRepositoryToken(CourtEntity),
          useFactory: mockCourtRepository,
        },
        {
          provide: getRepositoryToken(CourtTimeSlotEntity),
          useFactory: mockTimeSlotRepository,
        },
        {
          provide: ConfigService,
          useFactory: mockConfigService,
        },
        {
          provide: DataSource,
          useFactory: mockDataSource,
        },
        {
          provide: bookingConfig.KEY,
          useFactory: mockBookingConfig,
        },
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: getRepositoryToken(UserEntity),
          useFactory: mockUserRepository,
        },
        {
          provide: SettingsService,
          useFactory: mockSettingsService,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    timeSlotRepository = module.get(getRepositoryToken(CourtTimeSlotEntity));
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cancelBooking', () => {
    const mockUserId = 'user-1';
    const mockBookingId = 'booking-1';

    it('should throw NotFoundException if booking not found', async () => {
      dataSource.transaction.mockImplementation(async (cb) => {
        const mockManager = {
          findOne: jest.fn().mockResolvedValue(null),
        };
        return cb(mockManager);
      });

      await expect(service.cancelBooking(mockBookingId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      dataSource.transaction.mockImplementation(async (cb) => {
        const mockManager = {
          findOne: jest.fn().mockResolvedValue({
            id: mockBookingId,
            userId: 'other-user',
          }),
        };
        return cb(mockManager);
      });

      await expect(service.cancelBooking(mockBookingId, mockUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException if already cancelled', async () => {
      dataSource.transaction.mockImplementation(async (cb) => {
        const mockManager = {
          findOne: jest.fn().mockResolvedValue({
            id: mockBookingId,
            userId: mockUserId,
            status: BookingStatus.CANCELLED,
          }),
        };
        return cb(mockManager);
      });

      await expect(service.cancelBooking(mockBookingId, mockUserId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if not confirmed', async () => {
      dataSource.transaction.mockImplementation(async (cb) => {
        const mockManager = {
          findOne: jest.fn().mockResolvedValue({
            id: mockBookingId,
            userId: mockUserId,
            status: BookingStatus.COMPLETED,
          }),
        };
        return cb(mockManager);
      });

      await expect(service.cancelBooking(mockBookingId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if cancellation is too close to start time', async () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 1); // 1 hour away (too close, must be > 12h)

      dataSource.transaction.mockImplementation(async (cb) => {
        const mockManager = {
          findOne: jest.fn().mockResolvedValue({
            id: mockBookingId,
            userId: mockUserId,
            status: BookingStatus.CONFIRMED,
            startTime,
            createdAt: new Date(), // Just created
          }),
        };
        return cb(mockManager);
      });

      await expect(service.cancelBooking(mockBookingId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should cancel pending payment booking immediately', async () => {
      const booking = {
        id: mockBookingId,
        userId: mockUserId,
        status: BookingStatus.PENDING_PAYMENT,
        startTime: new Date(),
        createdAt: new Date(),
      };

      dataSource.transaction.mockImplementation(async (cb) => {
        const mockManager = {
          findOne: jest.fn().mockResolvedValue(booking),
          save: jest.fn().mockResolvedValue({ ...booking, status: BookingStatus.CANCELLED }),
        };
        return cb(mockManager);
      });

      const result = await service.cancelBooking(mockBookingId, mockUserId);

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should cancel the booking if all conditions are met', async () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 15); // 15 hours away (valid, > 12h)

      const booking = {
        id: mockBookingId,
        userId: mockUserId,
        status: BookingStatus.CONFIRMED,
        startTime,
        createdAt: new Date(), // Just created (valid, < 24h)
      };

      dataSource.transaction.mockImplementation(async (cb) => {
        const mockManager = {
          findOne: jest.fn().mockResolvedValue(booking),
          save: jest.fn().mockResolvedValue({ ...booking, status: BookingStatus.CANCELLED }),
        };
        return cb(mockManager);
      });

      const result = await service.cancelBooking(mockBookingId, mockUserId);

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('createBooking', () => {
    const mockUserId = 'user-1';

    // Create dates with minutes = 0
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0); // 10:00 AM

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(11, 0, 0, 0); // 11:00 AM

    const mockDto: CreateBookingDto = {
      courtId: 'court-1',
      startTime: tomorrow.toISOString(),
      endTime: tomorrowEnd.toISOString(),
    };

    it('should throw BadRequestException if start time is in the past', async () => {
      const pastDto = {
        ...mockDto,
        startTime: new Date(Date.now() - 3600000).toISOString(),
      };
      await expect(service.createBooking(pastDto, mockUserId)).rejects.toThrow(BadRequestException);
    });

    it('should process booking in a transaction', async () => {
      dataSource.transaction.mockImplementation(async (cb) => {
        const mockManager = {
          findOne: jest.fn().mockResolvedValue({
            id: 'court-1',
            status: CourtStatus.ACTIVE,
            pricePerHour: 100,
          }),
          createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]), // No overlaps
          })),
          create: jest.fn().mockReturnValue({ id: 'new-booking' }),
          save: jest.fn().mockResolvedValue({ id: 'new-booking' }),
        };
        return cb(mockManager);
      });

      // Mock time slot repository to return valid slots
      timeSlotRepository.find.mockResolvedValue([
        {
          id: 'slot-1',
          courtId: 'court-1',
          dayOfWeek: new Date(mockDto.startTime).getDay(),
          startHour: new Date(mockDto.startTime).getHours(),
          endHour: new Date(mockDto.endTime).getHours(),
          price: 100,
        },
      ]);

      const result = await service.createBooking(mockDto, mockUserId);
      expect(result.id).toBe('new-booking');
      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });
});
