import {
  Controller,
  Post,
  Body,
  UsePipes,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, registerSchema } from './dto/register.dto';
import { LoginDto, loginSchema } from './dto/login.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@court-booking/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'email', 'password'],
      properties: {
        name: { type: 'string', example: 'Nguyen Van A' },
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'StrongPass1' },
        phone: { type: 'string', example: '0901234567' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            name: { type: 'string', example: 'Nguyen Van A' },
            email: { type: 'string', example: 'user@example.com' },
            role: { type: 'string', example: 'USER' },
            created_at: { type: 'string', example: '2026-05-04T10:00:00.000Z' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email already in use',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'CONFLICT' },
            message: { type: 'string', example: 'Email already in use' },
            statusCode: { type: 'number', example: 409 },
            timestamp: { type: 'string', example: '2026-05-04T10:00:00.000Z' },
            path: { type: 'string', example: '/api/v1/auth/register' },
          },
        },
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login and get tokens' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'StrongPass1' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            access_token: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            refresh_token: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            token_type: { type: 'string', example: 'Bearer' },
            expires_in: { type: 'number', example: 900 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'UNAUTHORIZED' },
            message: { type: 'string', example: 'Invalid email or password' },
            statusCode: { type: 'number', example: 401 },
            timestamp: { type: 'string', example: '2026-05-04T10:00:00.000Z' },
            path: { type: 'string', example: '/api/v1/auth/login' },
          },
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            email: { type: 'string', example: 'user@example.com' },
            role: { type: 'string', example: 'USER' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'UNAUTHORIZED' },
            message: { type: 'string', example: 'Unauthorized' },
            statusCode: { type: 'number', example: 401 },
          },
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: any) {
    return user;
  }

  @Get('admin')
  @ApiOperation({ summary: 'Admin only endpoint' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async adminOnly() {
    return {
      message: 'Welcome Admin!',
    };
  }
}
