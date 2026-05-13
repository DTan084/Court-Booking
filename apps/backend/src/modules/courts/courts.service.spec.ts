import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CourtsService } from './courts.service';
import { CourtEntity } from '../../database/entities/court.entity';
import { CourtTimeSlotEntity } from '../../database/entities/court-time-slot.entity';
import { CourtImageEntity } from '../../database/entities/court-image.entity';
import { CourtFeatureEntity } from '../../database/entities/court-feature.entity';
import { FeatureEntity } from '../../database/entities/feature.entity';
import { SportType, CourtType } from '@court-booking/shared';

describe('CourtsService', () => {
  let service: CourtsService;
  let repository: any;
  let qb: any;

  const mockCourt = {
    id: 'court-uuid',
    name: 'San Cau Long ABC',
    sportType: SportType.BADMINTON,
    courtType: CourtType.INDOOR,
    features: [],
    address: '123 Nguyen Hue',
    pricePerHour: 150000,
  };

  beforeEach(async () => {
    qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockCourt], 1]),
    };

    const mockRepo = {
      create: jest.fn().mockReturnValue(mockCourt),
      save: jest.fn().mockResolvedValue(mockCourt),
      findOne: jest.fn().mockResolvedValue(mockCourt),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const mockTimeSlotRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockCourtImageRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
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

    const mockCourtFeatureRepo = {
      findBy: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    const mockFeatureRepo = {
      findBy: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(),
    };

    const mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
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
          provide: getRepositoryToken(CourtImageEntity),
          useValue: mockCourtImageRepo,
        },
        {
          provide: getRepositoryToken(CourtFeatureEntity),
          useValue: mockCourtFeatureRepo,
        },
        {
          provide: getRepositoryToken(FeatureEntity),
          useValue: mockFeatureRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<CourtsService>(CourtsService);
    repository = module.get(getRepositoryToken(CourtEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a court', async () => {
      const dto = {
        name: 'San Cau Long ABC',
        sportType: SportType.BADMINTON,
        courtType: CourtType.INDOOR,
        features: [],
        address: '123 Nguyen Hue',
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
      const result = await service.findAll(query);

      expect(result).toEqual({
        data: [{ ...mockCourt, featureItems: [] }],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('court');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('court.images', 'images');
    });

    it('should filter by sportType', async () => {
      const query = { page: 1, limit: 5, sportType: [SportType.TENNIS] };

      await service.findAll(query);

      expect(qb.andWhere).toHaveBeenCalledWith('court.sportType IN (:...sportType)', {
        sportType: [SportType.TENNIS],
      });
    });
  });
});
