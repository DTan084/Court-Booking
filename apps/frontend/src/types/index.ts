/**
 * REQ-22.1: Unified types from shared package
 */
export * from '@court-booking/shared';
import type { CourtImage, CourtStatus, CourtType, Feature } from '@court-booking/shared';

// ==================== FRONTEND SPECIFIC TYPES ====================

export interface BookedRange {
  startHour: number;
  endHour: number;
}

export interface SearchFilters {
  sportTypeId?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

export interface Court {
  id: string;
  name: string;
  courtType: CourtType;
  address: string;
  district?: string | null;
  description?: string | null;
  pricePerHour: number;
  status: CourtStatus;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  images?: CourtImage[];
  sportTypeId: string;
  featureItems?: Feature[];
  isFeatured?: boolean;
  maxPlayers?: number | null;
}
