import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PaginatedResult, Notification } from '@/types';

export function useNotifications(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['notifications', 'list', { page, limit }],
    queryFn: async () => {
      const response = await api.get<PaginatedResult<Notification>>('/notifications', {
        params: { page, limit },
      });
      return response.data;
    },
  });
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: async () => {
      const response = await api.get<{ count: number }>('/notifications/unread-count');
      return response.data.count;
    },
    refetchInterval: 60000, // Polling every 60s (REQ-24.7)
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
