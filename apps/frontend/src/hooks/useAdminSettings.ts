'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export type AdminSettings = {
  defaultTimezone: string;
  currency: string;
  paymentDeadlineMinutes: number;
  cancelWithinHours: number;
  noCancelBeforeHours: number;
  analyticsStartHour: number;
  analyticsEndHour: number;
};

const queryKey = ['admin', 'settings'] as const;

export function useAdminSettings() {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.get('/admin/settings');
      return (res.data?.data ?? res.data) as AdminSettings;
    },
  });
}

export function useUpdateAdminSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<AdminSettings>) => {
      const res = await api.patch('/admin/settings', payload);
      return (res.data?.data ?? res.data) as AdminSettings;
    },
    onSuccess: (updated) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('runtime_currency', updated.currency);
        window.localStorage.setItem('runtime_timezone', updated.defaultTimezone);
      }
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['settings', 'runtime'] });
      toast.success('Settings saved');
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });
}
