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

  const mockUser = {
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: Role.USER,
    createdAt: new Date('2025-01-01T00:00:00Z'),
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
        if (key === 'jwt.expiresIn') return '15m';
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
  });

  describe('register', () => {
    it('should return {id, name, email, role, created_at} on success', async () => {
      const registerDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password1',
      };
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
        created_at: mockUser.createdAt,
      });
      // must NOT expose passwordHash
      expect(result).not.toHaveProperty('passwordHash');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email is already in use', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.register({ name: 'X', email: 'test@example.com', password: 'Password1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return {access_token, refresh_token, token_type, expires_in} on success', async () => {
      const loginDto = { email: 'test@example.com', password: 'Password1' };
      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('mock-jwt-token');
      refreshTokenRepository.create.mockReturnValue({ token: 'mock-uuid' });
      refreshTokenRepository.save.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        refresh_token: expect.any(String),
        token_type: 'Bearer',
        expires_in: 900, // 15m in seconds
      });
      // must NOT expose user or passwordHash
      expect(result).not.toHaveProperty('user');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'notfound@example.com', password: 'Password1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'WrongPass1' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('parseExpiresInToSeconds (private — via generateTokens)', () => {
    it('should parse 15m → 900', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('tok');
      refreshTokenRepository.create.mockReturnValue({});
      refreshTokenRepository.save.mockResolvedValue({});

      const result = await service.login({ email: 'test@example.com', password: 'Password1' });
      expect(result.expires_in).toBe(900);
    });
  });
});
