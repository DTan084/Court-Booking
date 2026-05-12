'use client';

import { AdminShell } from '@/components/admin/AdminShell';

const activityLogs = [
  { title: 'Facility hours updated', meta: '2 hours ago by Marcus T.' },
  { title: 'New admin added', meta: 'Yesterday by Sarah J.' },
  { title: '2FA policy enabled', meta: '3 days ago by System' },
];

export default function AdminSettingsPage() {
  return (
    <AdminShell
      title="Admin Settings"
      subtitle="Configure facility parameters and system preferences."
    >
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-bold">Branding & Identity</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Product Name
                </label>
                <input
                  defaultValue="CourtCommand Elite"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Language
                </label>
                <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                  <option>English (US)</option>
                  <option>English (UK)</option>
                  <option>Vietnamese</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Timezone
                </label>
                <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                  <option>(GMT+07:00) Asia/Ho_Chi_Minh</option>
                  <option>(GMT+08:00) Asia/Singapore</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-bold">Facility Settings</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Opening Hour
                </label>
                <input
                  type="time"
                  defaultValue="06:00"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Closing Hour
                </label>
                <input
                  type="time"
                  defaultValue="23:00"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Default Buffer (minutes)
                </label>
                <input
                  type="number"
                  defaultValue={15}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Currency
                </label>
                <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                  <option>VND</option>
                  <option>USD</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-bold">Security & Access</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                <div>
                  <p className="font-semibold text-slate-900">Two-factor authentication</p>
                  <p className="text-sm text-slate-500">Require OTP for admin login.</p>
                </div>
                <button className="rounded-full bg-orange-500 px-4 py-1 text-xs font-bold text-white">
                  Enabled
                </button>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  defaultValue={60}
                  className="w-60 rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
              Reset Default
            </button>
            <button className="rounded-lg bg-[#944a00] px-5 py-2 text-sm font-bold text-white hover:bg-[#7f3f00]">
              Save Changes
            </button>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <div className="rounded-xl bg-[#131b2e] p-6 text-white">
            <h4 className="text-lg font-bold">Plan Details</h4>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="opacity-75">Tier</span>
                <span className="font-semibold">PRO LEAGUE</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-75">Facilities</span>
                <span className="font-semibold">12 / 20</span>
              </div>
            </div>
            <button className="mt-5 w-full rounded-lg bg-white py-2 text-sm font-bold text-[#131b2e]">
              Upgrade Plan
            </button>
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
