import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CourtsService } from './courts.service';
import { CourtEntity } from '../../database/entities/court.entity';
import { CourtTimeSlotEntity } from '../../database/entities/court-time-slot.entity';
import { SportType } from '@court-booking/shared';

describe('CourtsService', () => {
  let service: CourtsService;
  let repository: any;
  let timeSlotRepository: any;
  let dataSource: any;

  const mockCourt = {
    id: 'court-uuid',
    name: 'Sân Cầu Lông ABC',
    sportType: SportType.BADMINTON,
    address: '123 Nguyễn Huệ',
    pricePerHour: 150000,
  };

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn().mockReturnValue(mockCourt),
      save: jest.fn().mockResolvedValue(mockCourt),
      findAndCount: jest.fn().mockResolvedValue([[mockCourt], 1]),
      findOne: jest.fn().mockResolvedValue(mockCourt),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const mockTimeSlotRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockDataSource = {
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          bookingCount: '0',
          totalHours: '0',
        }),
      }),
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourtsService,
        {
          provide: getRepositoryToken(CourtEntity),
          useValue: mockRepo,
        },
        {
          provide: getRepositoryToken(CourtTimeSlotEntity),
          useValue: mockTimeSlotRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<CourtsService>(CourtsService);
    repository = module.get(getRepositoryToken(CourtEntity));
    timeSlotRepository = module.get(getRepositoryToken(CourtTimeSlotEntity));
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a court', async () => {
      const dto = {
        name: 'Sân Cầu Lông ABC',
        sportType: SportType.BADMINTON,
        address: '123 Nguyễn Huệ',
        pricePerHour: 150000,
      };
      const result = await service.create(dto);
      expect(result).toEqual(mockCourt);
      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single court', async () => {
      const result = await service.findOne('court-uuid');
      expect(result).toEqual(mockCourt);
      expect(repository.findOne).toHaveBeenCalled();
    });

    it('should throw NotFoundException if court not found', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findOne('wrong-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a court', async () => {
      const updateDto = { name: 'New Name' };
      const updatedCourt = { ...mockCourt, name: 'New Name' };
      repository.findOne.mockResolvedValue(mockCourt);
      repository.save.mockResolvedValue(updatedCourt);

      const result = await service.update('court-uuid', updateDto);

      expect(result.name).toEqual('New Name');
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('should call softDelete on repository', async () => {
      repository.findOne.mockResolvedValue(mockCourt);
      await service.softDelete('court-uuid');
      expect(repository.softDelete).toHaveBeenCalledWith('court-uuid');
    });
  });

  describe('findAll', () => {
    it('should return paginated result of courts', async () => {
      const query = { page: 1, limit: 10 };
      repository.findAndCount.mockResolvedValue([[mockCourt], 1]);

      const result = await service.findAll(query);

      expect(result).toEqual({
        data: [mockCourt],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { deletedAt: expect.anything() },
        take: 10,
        skip: 0,
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter by sportType', async () => {
      const query = { page: 1, limit: 5, sportType: SportType.TENNIS };
      repository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(query);

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sportType: SportType.TENNIS,
          }),
        }),
      );
    });
  });
});
