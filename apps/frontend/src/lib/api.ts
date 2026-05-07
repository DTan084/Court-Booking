import axios, { type AxiosError } from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // gửi httpOnly cookie tự động (nếu backend set cookie)
});

// Track if a refresh is already in progress to prevent concurrent refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(null);
  });
  failedQueue = [];
};

// Response interceptor: 401 → try refresh once → redirect if fails
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const originalRequest = error.config as
      | (AxiosError['config'] & { _retry?: boolean })
      | undefined;

    // Don't retry refresh endpoint itself — break the loop
    if (originalRequest?.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    // Don't retry /auth/me — it's a probe call, not critical
    if (originalRequest?.url?.includes('/auth/me')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return api
        .post('/auth/refresh')
        .then(() => {
          processQueue(null);
          return api(originalRequest);
        })
        .catch((refreshError) => {
          processQueue(refreshError);
          // Clear user and redirect to login
          import('./auth').then(({ useAuthStore }) => {
            useAuthStore.getState().clearUser();
            if (typeof window !== 'undefined') {
              const currentPath = window.location.pathname;
              if (currentPath !== '/login' && currentPath !== '/register') {
                window.location.href = '/login';
              }
            }
          });
          return Promise.reject(refreshError);
        })
        .finally(() => {
          isRefreshing = false;
        });
    }

    // 403 Forbidden - show toast
    if (error.response?.status === 403) {
      import('sonner').then(({ toast }) => {
        toast.error('Bạn không có quyền thực hiện hành động này');
      });
    }

    // 500 Internal Server Error - show toast
    if (error.response?.status === 500) {
      import('sonner').then(({ toast }) => {
        toast.error('Lỗi hệ thống, vui lòng thử lại sau');
      });
    }

    // Network error handling
    if (!error.response) {
      import('sonner').then(({ toast }) => {
        toast.error('Không thể kết nối đến máy chủ, vui lòng thử lại');
      });
      return Promise.reject(new Error('Không thể kết nối đến máy chủ, vui lòng thử lại'));
    }

    return Promise.reject(error);
  },
);

// Query keys factory for TanStack Query
export const queryKeys = {
  courts: {
    all: ['courts'] as const,
    list: (params: Record<string, unknown>) => ['courts', 'list', params] as const,
    detail: (id: string) => ['courts', id] as const,
    schedule: (id: string, date: string) => ['courts', id, 'schedule', date] as const,
    timeSlots: (id: string) => ['courts', id, 'time-slots'] as const,
    stats: (id: string, params: Record<string, unknown>) =>
      ['courts', id, 'stats', params] as const,
  },
  bookings: {
    all: ['bookings'] as const,
    myList: (params: Record<string, unknown>) => ['bookings', 'me', params] as const,
  },
  auth: {
    me: ['auth', 'me'] as const,
  },
  admin: {
    stats: (params: Record<string, unknown>) => ['admin', 'stats', params] as const,
  },
};

export { api };
