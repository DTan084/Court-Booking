'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import {
  useAdminSettings,
  useUpdateAdminSettings,
  type AdminSettings,
} from '@/hooks/useAdminSettings';

const activityLogs = [
  { title: 'Settings synced from database', meta: 'Real-time admin config' },
  { title: 'Booking policies configurable', meta: 'No more hard-coded values' },
];

const DEFAULTS: AdminSettings = {
  defaultTimezone: 'Asia/Ho_Chi_Minh',
  currency: 'VND',
  paymentDeadlineMinutes: 30,
  cancelWithinHours: 24,
  noCancelBeforeHours: 12,
  analyticsStartHour: 6,
  analyticsEndHour: 22,
};

export default function AdminSettingsPage() {
  const { data, isLoading } = useAdminSettings();
  const { mutate: saveSettings, isPending } = useUpdateAdminSettings();
  const [form, setForm] = useState<AdminSettings>(DEFAULTS);

  useEffect(() => {
    if (!data) return;
    setForm(data);
  }, [data]);

  const update = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const isAnalyticsRangeInvalid = form.analyticsEndHour <= form.analyticsStartHour;

  return (
    <AdminShell
      title="Admin Settings"
      subtitle="Settings are loaded from system_settings and applied to runtime behavior."
    >
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-bold">Booking Policy Settings</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Default Timezone
                </label>
                <input
                  value={form.defaultTimezone}
                  onChange={(e) => update('defaultTimezone', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  disabled={isLoading || isPending}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Currency
                </label>
                <input
                  value={form.currency}
                  onChange={(e) => update('currency', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  disabled={isLoading || isPending}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Payment Deadline (minutes)
                </label>
                <input
                  type="number"
                  value={form.paymentDeadlineMinutes}
                  onChange={(e) => update('paymentDeadlineMinutes', Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  disabled={isLoading || isPending}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cancel Within Hours
                </label>
                <input
                  type="number"
                  value={form.cancelWithinHours}
                  onChange={(e) => update('cancelWithinHours', Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  disabled={isLoading || isPending}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  No Cancel Before (hours)
                </label>
                <input
                  type="number"
                  value={form.noCancelBeforeHours}
                  onChange={(e) => update('noCancelBeforeHours', Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  disabled={isLoading || isPending}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Analytics Start Hour
                </label>
                <input
                  type="number"
                  value={form.analyticsStartHour}
                  onChange={(e) => update('analyticsStartHour', Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  disabled={isLoading || isPending}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Analytics End Hour
                </label>
                <input
                  type="number"
                  value={form.analyticsEndHour}
                  onChange={(e) => update('analyticsEndHour', Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  disabled={isLoading || isPending}
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <button
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              onClick={() => setForm(data ?? DEFAULTS)}
              disabled={isLoading || isPending}
            >
              Reset
            </button>
            <button
              className="rounded-lg bg-[#944a00] px-5 py-2 text-sm font-bold text-white hover:bg-[#7f3f00] disabled:opacity-60"
              disabled={isLoading || isPending || isAnalyticsRangeInvalid}
              onClick={() => saveSettings(form)}
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
          {isAnalyticsRangeInvalid && (
            <p className="text-sm text-rose-600">
              Analytics End Hour must be greater than Analytics Start Hour.
            </p>
          )}
        </div>

        <div className="space-y-6 xl:col-span-4">
          <div className="rounded-xl bg-[#131b2e] p-6 text-white">
            <h4 className="text-lg font-bold">Runtime Source</h4>
            <p className="mt-3 text-sm text-slate-200">
              These settings are persisted in <code>system_settings</code> and used by backend
              runtime for booking rules only.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h4 className="mb-4 text-lg font-bold">Admin Activity</h4>
            <div className="space-y-4">
              {activityLogs.map((item) => (
                <div key={item.title}>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.meta}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
