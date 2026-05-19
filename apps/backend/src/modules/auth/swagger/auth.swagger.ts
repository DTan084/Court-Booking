import { ApiProperty } from '@nestjs/swagger';

// ── Request Bodies ─────────────────────────────────────────────────────────

export class RegisterBody {
  @ApiProperty({ example: 'Nguyen Van A' })
  name: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'StrongPass1' })
  password: string;

  @ApiProperty({ example: '0901234567', required: false })
  phone?: string;
}

export class LoginBody {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'StrongPass1' })
  password: string;
}

// ── Response Data ──────────────────────────────────────────────────────────

export class RegisterResponseData {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  name: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'USER', enum: ['USER', 'ADMIN'] })
  role: string;

  @ApiProperty({ example: '2026-05-04T10:00:00.000Z' })
  created_at: string;
}

export class LoginResponseData {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  refresh_token: string;

  @ApiProperty({ example: 'Bearer' })
  token_type: string;

  @ApiProperty({ example: 900, description: 'Token expiry in seconds' })
  expires_in: number;
}

export class UserProfileData {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'USER', enum: ['USER', 'ADMIN'] })
  role: string;
}

// ── Wrapped Responses ──────────────────────────────────────────────────────

export class RegisterResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: RegisterResponseData })
  data: RegisterResponseData;
}

export class LoginResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: LoginResponseData })
  data: LoginResponseData;
}

export class UserProfileResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: UserProfileData })
  data: UserProfileData;
}
