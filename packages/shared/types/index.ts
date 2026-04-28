// Shared types used by both Backend and Frontend

// ── Enums ──────────────────────────────────────

export enum Role {
  USER = 'user',
  ADMIN = 'admin',
}

export enum BookingStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum SportType {
  BADMINTON = 'badminton',
  TENNIS = 'tennis',
  FOOTBALL = 'football',
  BASKETBALL = 'basketball',
  VOLLEYBALL = 'volleyball',
}

// ── Base Types ─────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface Court {
  id: string;
  name: string;
  sportType: SportType;
  address: string;
  description?: string;
  pricePerHour: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  courtId: string;
  userId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

// ── API Response Types ─────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

// ── JWT ────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  role: Role;
  iat?: number;
  exp?: number;
}
