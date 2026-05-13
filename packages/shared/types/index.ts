// Shared types used by both Backend and Frontend

// ── Enums ──────────────────────────────────────

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
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

export enum BookingSource {
  ONLINE = 'ONLINE',
  ADMIN = 'ADMIN',
  WALK_IN = 'WALK_IN',
}

export enum CancelledBy {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  ADMIN = 'ADMIN',
}

export enum SportType {
  BADMINTON = 'BADMINTON',
  TENNIS = 'TENNIS',
  FOOTBALL = 'FOOTBALL',
  BASKETBALL = 'BASKETBALL',
  VOLLEYBALL = 'VOLLEYBALL',
}

export enum CourtStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum CourtType {
  INDOOR = 'INDOOR',
  OUTDOOR = 'OUTDOOR',
}

export enum FacilityFeature {
  PARKING = 'PARKING',
  LOCKER_ROOM = 'LOCKER_ROOM',
  SHOWER = 'SHOWER',
  LIGHTING = 'LIGHTING',
  AIR_CONDITIONING = 'AIR_CONDITIONING',
  WIFI = 'WIFI',
  CAFETERIA = 'CAFETERIA',
  EQUIPMENT_RENTAL = 'EQUIPMENT_RENTAL',
  FIRST_AID = 'FIRST_AID',
  WHEELCHAIR_ACCESSIBLE = 'WHEELCHAIR_ACCESSIBLE',
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

export interface CourtImage {
  id: string;
  url: string;
  altText: string | null;
  displayOrder: number;
}

export interface SportTypeModel {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface Feature {
  id: string;
  name: string;
  icon: string | null;
  category: string | null;
  createdAt: string;
}

export interface Court {
  id: string;
  name: string;
  sportType: SportType;
  courtType: CourtType;
  address: string;
  district: string | null;
  description: string | null;
  features: FacilityFeature[];
  sportTypeName?: string;
  sportTypeData?: SportTypeModel;
  featureItems?: Feature[];
  isFeatured?: boolean;
  maxPlayers?: number | null;
  images: CourtImage[];
  pricePerHour: number;
  status: CourtStatus;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CourtTimeSlot {
  id: string;
  courtId: string;
  dayOfWeek: number;
  startHour: number;
  endHour: number;
  price: number;
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
  bookingSource?: BookingSource;
  transactionId?: string | null;
  note?: string | null;
  checkedInAt?: string | null;
  cancelledBy?: CancelledBy | null;
  cancelledReason?: string | null;
  cancellationNote?: string | null;
  refundedAt?: string | null;
  refundAmount?: number | null;
  guestName?: string | null;
  guestPhone?: string | null;
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
