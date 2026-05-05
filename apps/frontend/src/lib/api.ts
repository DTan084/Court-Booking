import axios, { type AxiosError } from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // gửi httpOnly cookie tự động
});

// Response interceptor: 401 → clear store + redirect
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Import dynamically to avoid circular dependency
      import('./auth').then(({ useAuthStore }) => {
        useAuthStore.getState().clearUser();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      });
    }

    // Network error handling
    if (!error.response) {
      return Promise.reject(new Error('Không thể kết nối đến máy chủ, vui lòng thử lại'));
    }

    return Promise.reject(error);
  },
);

// Query keys factory for TanStack Query
export const queryKeys = {
  courts: {
    all: ['courts'] as const,
    list: (params: Record<string, any>) => ['courts', 'list', params] as const,
    detail: (id: string) => ['courts', id] as const,
    schedule: (id: string, date: string) => ['courts', id, 'schedule', date] as const,
    timeSlots: (id: string) => ['courts', id, 'time-slots'] as const,
    stats: (id: string, params: Record<string, any>) => ['courts', id, 'stats', params] as const,
  },
  bookings: {
    all: ['bookings'] as const,
    myList: (params: Record<string, any>) => ['bookings', 'me', params] as const,
  },
  auth: {
    me: ['auth', 'me'] as const,
  },
};

export { api };
