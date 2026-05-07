import axios, { type AxiosError } from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // gửi httpOnly cookie tự động (nếu backend set cookie)
});

// Response interceptor: 401 → clear store + redirect
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const originalRequest = error.config as
        | (AxiosError['config'] & { _retry?: boolean })
        | undefined;

      if (originalRequest?.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      if (originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;
        return api
          .post('/auth/refresh')
          .then(() => api(originalRequest))
          .catch((refreshError) => {
            // Import dynamically to avoid circular dependency
            import('./auth').then(({ useAuthStore }) => {
              useAuthStore.getState().clearUser();

              // Only redirect if not already on login/register page
              if (typeof window !== 'undefined') {
                const currentPath = window.location.pathname;
                if (currentPath !== '/login' && currentPath !== '/register') {
                  window.location.href = '/login';
                }
              }
            });

            return Promise.reject(refreshError);
          });
      }
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
};

export { api };
