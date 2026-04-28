// Shared constants used by both Backend and Frontend

export const MAX_BOOKING_HOURS = 4;
export const MIN_BOOKING_HOURS = 1;
export const CANCELLATION_DEADLINE_HOURS = 2; // Must cancel at least 2h before start

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
  },
  COURTS: {
    LIST: '/courts',
    DETAIL: (id: string) => `/courts/${id}`,
    SCHEDULE: (id: string) => `/courts/${id}/schedule`,
  },
  BOOKINGS: {
    CREATE: '/bookings',
    MY_BOOKINGS: '/bookings/me',
    CANCEL: (id: string) => `/bookings/${id}/cancel`,
  },
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
} as const;
