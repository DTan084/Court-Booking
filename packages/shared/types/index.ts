// Shared types used by both Backend and Frontend

// ── Enums ──────────────────────────────────────

export enum Role {
  USER = 'user',
  ADMIN = 'admin',
}

export enum BookingStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}

export enum NotificationType {
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  PAYMENT_REMINDER = 'PAYMENT_REMINDER',
  BOOKING_REMINDER = 'BOOKING_REMINDER',
  BOOKING_EXPIRED = 'BOOKING_EXPIRED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
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
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface Court {
  id: string;
  name: string;
  sportType: SportType;
  address: string;
  district: string | null;
  description?: string;
  pricePerHour: number;
  isActive: boolean;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  courtId: string;
  userId: string;
  court?: Court;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  totalPrice: number;
  paymentDeadline: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  cancellationDeadline: string | null; // createdAt + 24h
  latestCancellableTime: string | null; // startTime - 12h
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  bookingId: string | null;
  createdAt: string;
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
