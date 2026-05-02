import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { CourtEntity, CourtStatus } from '../../database/entities/court.entity';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@court-booking/shared';
import { CreateBookingDto } from './dto/create-booking.dto';

const mockBookingRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  })),
});

const mockCourtRepository = () => ({
  findOne: jest.fn(),
});

const mockDataSource = () => ({
  transaction: jest.fn(),
});

describe('BookingsService', () => {
  let service: BookingsService;
  let bookingRepository: ReturnType<typeof mockBookingRepository>;
  let courtRepository: ReturnType<typeof mockCourtRepository>;
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
          provide: DataSource,
          useFactory: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    bookingRepository = module.get(getRepositoryToken(BookingEntity));
    courtRepository = module.get(getRepositoryToken(CourtEntity));
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cancelBooking', () => {
    const mockUserId = 'user-1';
    const mockBookingId = 'booking-1';

    it('should throw NotFoundException if booking not found', async () => {
      bookingRepository.findOne.mockResolvedValue(null);

      await expect(service.cancelBooking(mockBookingId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      bookingRepository.findOne.mockResolvedValue({
        id: mockBookingId,
        userId: 'other-user',
      });

      await expect(service.cancelBooking(mockBookingId, mockUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException if already cancelled', async () => {
      bookingRepository.findOne.mockResolvedValue({
        id: mockBookingId,
        userId: mockUserId,
        status: BookingStatus.CANCELLED,
      });

      await expect(service.cancelBooking(mockBookingId, mockUserId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if not confirmed', async () => {
      bookingRepository.findOne.mockResolvedValue({
        id: mockBookingId,
        userId: mockUserId,
        status: BookingStatus.COMPLETED, // e.g. completed
      });

      await expect(service.cancelBooking(mockBookingId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if cancellation is too close to start time', async () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 1); // 1 hour away (too close)

      bookingRepository.findOne.mockResolvedValue({
        id: mockBookingId,
        userId: mockUserId,
        status: BookingStatus.CONFIRMED,
        startTime,
      });

      await expect(service.cancelBooking(mockBookingId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should cancel the booking if all conditions are met', async () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 3); // 3 hours away (valid)

      const booking = {
        id: mockBookingId,
        userId: mockUserId,
        status: BookingStatus.CONFIRMED,
        startTime,
      };

      bookingRepository.findOne.mockResolvedValue(booking);
      bookingRepository.save.mockResolvedValue({ ...booking, status: BookingStatus.CANCELLED });

      const result = await service.cancelBooking(mockBookingId, mockUserId);

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(bookingRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: BookingStatus.CANCELLED }),
      );
    });
  });

  describe('createBooking', () => {
    const mockUserId = 'user-1';
    const mockDto: CreateBookingDto = {
      courtId: 'court-1',
      startTime: new Date(Date.now() + 86400000).toISOString(), // +1 day
      endTime: new Date(Date.now() + 86400000 + 3600000).toISOString(), // +1 day + 1 hour
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

      const result = await service.createBooking(mockDto, mockUserId);
      expect(result.id).toBe('new-booking');
      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });
});
