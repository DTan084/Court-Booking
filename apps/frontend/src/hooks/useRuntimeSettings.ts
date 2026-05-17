'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/api';

export type RuntimeSettings = {
  defaultTimezone: string;
  currency: string;
  paymentDeadlineMinutes: number;
  cancelWithinHours: number;
  noCancelBeforeHours: number;
  analyticsStartHour: number;
  analyticsEndHour: number;
  profileUpdateCooldownDays: number;
};

const DEFAULTS: RuntimeSettings = {
  defaultTimezone: 'Asia/Ho_Chi_Minh',
  currency: 'VND',
  paymentDeadlineMinutes: 30,
  cancelWithinHours: 24,
  noCancelBeforeHours: 12,
  analyticsStartHour: 6,
  analyticsEndHour: 22,
  profileUpdateCooldownDays: 30,
};

export function useRuntimeSettings() {
  const query = useQuery({
    queryKey: ['settings', 'runtime'],
    queryFn: async () => {
      const res = await api.get('/settings/runtime');
      return (res.data?.data ?? res.data ?? DEFAULTS) as RuntimeSettings;
    },
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (!query.data || typeof window === 'undefined') return;
    window.localStorage.setItem('runtime_currency', query.data.currency);
    window.localStorage.setItem('runtime_timezone', query.data.defaultTimezone);
  }, [query.data]);

  return query;
}

export { DEFAULTS as runtimeSettingDefaults };
