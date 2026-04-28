import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserEntity } from '../../database/entities/user.entity';
import { RefreshTokenEntity } from '../../database/entities/refresh-token.entity';
import * as bcrypt from 'bcrypt';
import { Role } from '@court-booking/shared';

jest.mock('bcrypt');
jest.mock('uuid', () => {
  return {
    v4: () => 'mock-uuid',
  };
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let refreshTokenRepository: any;
  let jwtService: any;
  let configService: any;

  const mockUser = {
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: Role.USER,
  };

  beforeEach(async () => {
    const mockRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockJwt = {
      sign: jest.fn(),
    };

    const mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'jwt.refreshExpiresIn') return '7';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepo },
        { provide: getRepositoryToken(RefreshTokenEntity), useValue: { ...mockRepo } },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(UserEntity));
    refreshTokenRepository = module.get(getRepositoryToken(RefreshTokenEntity));
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  describe('register', () => {
    it('should successfully register a user', async () => {
      const registerDto = { name: 'Test User', email: 'test@example.com', password: 'password123' };
      userRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        id: 'user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: Role.USER,
      });
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email is already in use', async () => {
      const registerDto = { name: 'Test User', email: 'test@example.com', password: 'password123' };
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should successfully login and return tokens', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('mock-jwt-token');
      refreshTokenRepository.create.mockReturnValue({ token: 'mock-uuid' });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result).toHaveProperty('refresh_token', 'mock-uuid');
      expect(result.user.email).toEqual(mockUser.email);
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      const loginDto = { email: 'nonexistent@example.com', password: 'password123' };
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const loginDto = { email: 'test@example.com', password: 'wrongpassword' };
      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
