// ==================== ENUMS ====================

export enum SportType {
  BADMINTON = 'badminton',
  TENNIS = 'tennis',
  FOOTBALL = 'football',
  BASKETBALL = 'basketball',
  VOLLEYBALL = 'volleyball',
}

export enum CourtStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum BookingStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum Role {
  USER = 'user',
  ADMIN = 'admin',
}

// ==================== INTERFACES ====================

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Court {
  id: string;
  name: string;
  sportType: SportType;
  address: string;
  pricePerHour: number;
  status: CourtStatus;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CourtTimeSlot {
  id: string;
  courtId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startHour: number; // 0-23
  endHour: number; // 1-24
  price: number;
}

export interface Booking {
  id: string;
  courtId: string;
  userId: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  status: BookingStatus;
  totalPrice: number;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  court?: Court; // populated in GET /bookings/me
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==================== HELPER TYPES ====================

export interface BookedRange {
  startHour: number;
  endHour: number;
}
