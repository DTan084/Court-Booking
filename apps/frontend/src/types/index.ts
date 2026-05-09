/**
 * REQ-22.1: Unified types from shared package
 */
export * from '@court-booking/shared';

// ==================== FRONTEND SPECIFIC TYPES ====================

export interface BookedRange {
  startHour: number;
  endHour: number;
}

export interface SearchFilters {
  sportType?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}
