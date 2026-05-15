'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { useCourts } from '@/hooks/useCourts';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { formatCurrency } from '@/lib/utils';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDefaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  return {
    fromDate: from.toISOString(),
    toDate: to.toISOString(),
  };
}

function toInputDate(iso: string) {
  return iso.slice(0, 10);
}

function toISO(date: string, end = false) {
  const d = new Date(date);
  if (end) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function AdminStatsPage() {
  const defaults = getDefaultRange();
  const [fromInput, setFromInput] = useState(toInputDate(defaults.fromDate));
  const [toInput, setToInput] = useState(toInputDate(defaults.toDate));
  const [courtId, setCourtId] = useState('');
  const [revenuePage, setRevenuePage] = useState(1);
  const revenueLimit = 8;
  const { data: courtsData } = useCourts({ page: 1, limit: 50 });
  const courts = courtsData?.data ?? [];

  const params = useMemo(
    () => ({
      dateFrom: toISO(fromInput),
      dateTo: toISO(toInput, true),
      courtId: courtId || undefined,
    }),
    [fromInput, toInput, courtId],
  );
  const { data, isLoading } = useAdminAnalytics(params);
  const revenueRows = data?.revenueByCourt ?? [];
  const revenueTotal = revenueRows.length;
  const revenueTotalPages = Math.max(1, Math.ceil(revenueTotal / revenueLimit));
  const safeRevenuePage = Math.min(revenuePage, revenueTotalPages);
  const revenueStart = revenueTotal === 0 ? 0 : (safeRevenuePage - 1) * revenueLimit + 1;
  const revenueEnd =
    revenueTotal === 0 ? 0 : Math.min(safeRevenuePage * revenueLimit, revenueTotal);
  const pagedRevenueRows = revenueRows.slice(
    (safeRevenuePage - 1) * revenueLimit,
    safeRevenuePage * revenueLimit,
  );

  return (
    <AdminShell title="Court Analytics" subtitle="Comprehensive performance metrics from database.">
      <div className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">From</label>
          <input
            type="date"
            value={fromInput}
            onChange={(e) => setFromInput(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">To</label>
          <input
            type="date"
            value={toInput}
            onChange={(e) => setToInput(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
            Facility
          </label>
          <select
            value={courtId}
            onChange={(e) => setCourtId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          >
            <option value="">All courts</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading || !data ? (
        <SkeletonCard count={4} />
      ) : (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-lg border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Total Revenue
              </p>
              <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">
                {formatCurrency(data.kpis.totalRevenue)}
              </p>
              <p className="mt-2 text-sm text-slate-500">Revenue in selected range</p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Occupancy Rate
              </p>
              <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">
                {data.kpis.avgUtilization}%
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {Number(data.kpis.bookedHours ?? 0)}h / {Number(data.kpis.availableHours ?? 0)}h by
                court_time_slots
              </p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Total Bookings
              </p>
              <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">
                {data.kpis.totalBookings}
              </p>
              <p className="mt-2 text-sm text-slate-500">Confirmed + completed in range</p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Active Courts
              </p>
              <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">
                {data.revenueByCourt.length}
              </p>
              <p className="mt-2 text-sm text-slate-500">Courts with bookings in range</p>
            </article>
          </div>

          <div className="mb-6 grid gap-6 xl:grid-cols-12">
            <div className="rounded-lg border border-slate-200 bg-white p-6 xl:col-span-8">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                  Utilization Heatmap
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Low</span>
                  <div className="h-2 w-24 rounded-full bg-gradient-to-r from-slate-100 to-orange-400" />
                  <span>High</span>
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="mb-2 grid grid-cols-[44px_repeat(18,minmax(0,1fr))] gap-1">
                  <div />
                  {Array.from({ length: 18 }, (_, i) => i + 6).map((h) => (
                    <div key={h} className="text-center text-[10px] text-slate-400">
                      {h <= 12 ? `${h}a` : `${h - 12}p`}
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {(() => {
                    const maxCount = Math.max(
                      1,
                      ...data.heatmap.flatMap((r) => r.hours.map((h) => Number(h.count) || 0)),
                    );
                    return data.heatmap.map((row) => (
                      <div
                        key={row.day}
                        className="grid grid-cols-[44px_repeat(18,minmax(0,1fr))] gap-1"
                      >
                        <div className="text-[10px] font-bold uppercase text-slate-500">
                          {DAY_LABELS[row.day]}
                        </div>
                        {row.hours.map((h) => {
                          const count = Number(h.count) || 0;
                          if (count === 0) {
                            return (
                              <div
                                key={h.hour}
                                className="h-5 rounded-sm bg-slate-100"
                                title={`${h.hour}:00 - 0 bookings`}
                              />
                            );
                          }
                          const ratio = count / maxCount;
                          const lightness = 86 - ratio * 34; // more bookings => darker orange
                          return (
                            <div
                              key={h.hour}
                              className="h-5 rounded-sm"
                              style={{ backgroundColor: `hsl(29 88% ${lightness}%)` }}
                              title={`${h.hour}:00 - ${count} bookings`}
                            />
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 xl:col-span-4">
              <h3 className="mb-4 text-2xl font-bold tracking-tight text-slate-900">
                Utilization Snapshot
              </h3>
              <div className="space-y-4">
                {(() => {
                  const topRows = data.revenueByCourt.slice(0, 5);
                  const max = Math.max(1, ...topRows.map((r) => Number(r.hoursBooked) || 0));
                  return topRows.map((row) => {
                    const pct = Math.round((row.hoursBooked / max) * 100);
                    return (
                      <div key={row.courtId}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-medium text-slate-700">{row.courtName}</span>
                          <span className="text-slate-500">{row.hoursBooked}h</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-orange-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
                {data.revenueByCourt.length === 0 && (
                  <p className="text-sm text-slate-500">No court data in selected range.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="mb-4 text-2xl font-bold tracking-tight text-slate-900">
                Customer Demographics
              </h3>
              <div className="space-y-4">
                {(() => {
                  const total = Number(data.customerDemographics?.totalUniqueCustomers ?? 0);
                  const newCount = Number(data.customerDemographics?.newCustomers ?? 0);
                  const returningCount = Number(data.customerDemographics?.returningCustomers ?? 0);
                  const otherCount = Number(data.customerDemographics?.otherCustomers ?? 0);
                  const newPct = total > 0 ? Math.round((newCount / total) * 100) : 0;
                  const returningPct = total > 0 ? Math.round((returningCount / total) * 100) : 0;
                  const otherPct = Math.max(0, 100 - newPct - returningPct);
                  return (
                    <>
                      <div>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-medium text-slate-700">New Customers</span>
                          <span className="text-slate-500">
                            {newCount} ({newPct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-orange-400"
                            style={{ width: `${newPct}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-medium text-slate-700">Returning Customers</span>
                          <span className="text-slate-500">
                            {returningCount} ({returningPct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-emerald-400"
                            style={{ width: `${returningPct}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-medium text-slate-700">Unclassified</span>
                          <span className="text-slate-500">
                            {otherCount} ({otherPct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-slate-400"
                            style={{ width: `${otherPct}%` }}
                          />
                        </div>
                      </div>
                      <p className="pt-2 text-xs text-slate-500">
                        Based on unique booking customers in selected range
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="mb-4 text-2xl font-bold tracking-tight text-slate-900">
                Customer Demographics (Age Distribution)
              </h3>
              {(() => {
                const age = data.customerDemographics?.ageDistribution;
                const a18_24 = Number(age?.age18_24 ?? 0);
                const a25_34 = Number(age?.age25_34 ?? 0);
                const a35_44 = Number(age?.age35_44 ?? 0);
                const a45 = Number(age?.age45Plus ?? 0);
                const classified = a18_24 + a25_34 + a35_44 + a45;
                const baseTotal = Number(data.customerDemographics?.totalUniqueCustomers ?? 0);
                const unclassified = Math.max(0, baseTotal - classified);
                const total = classified + unclassified;
                const rows = [
                  { label: '18-24', count: a18_24, color: 'bg-orange-400' },
                  { label: '25-34', count: a25_34, color: 'bg-emerald-400' },
                  { label: '35-44', count: a35_44, color: 'bg-blue-400' },
                  { label: '45+', count: a45, color: 'bg-slate-500' },
                  { label: 'Unclassified', count: unclassified, color: 'bg-slate-300' },
                ];
                return (
                  <div className="space-y-4">
                    {rows.map((r) => {
                      const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
                      return (
                        <div key={r.label}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="font-medium text-slate-700">{r.label}</span>
                            <span className="text-slate-500">
                              {r.count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100">
                            <div
                              className={`h-2 rounded-full ${r.color}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <p className="pt-2 text-xs text-slate-500">
                      Based on unique booking customers in selected range
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-5">
              <h3 className="text-xl font-bold tracking-tight text-slate-900">Revenue by Court</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Court Name</th>
                  <th className="px-6 py-4 text-right">Avg. Hourly Rate</th>
                  <th className="px-6 py-4 text-right">Hours Booked</th>
                  <th className="px-6 py-4 text-right">Bookings</th>
                  <th className="px-6 py-4 text-right">Net Revenue</th>
                </tr>
              </thead>
              <tbody>
                {pagedRevenueRows.map((row) => (
                  <tr key={row.courtId} className="border-t border-slate-100">
                    <td className="px-6 py-4 font-semibold">{row.courtName}</td>
                    <td className="px-6 py-4 text-right">{formatCurrency(row.avgHourlyRate)}</td>
                    <td className="px-6 py-4 text-right">{row.hoursBooked}</td>
                    <td className="px-6 py-4 text-right">{row.bookings}</td>
                    <td className="px-6 py-4 text-right font-bold">
                      {formatCurrency(row.netRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-8 py-4">
              <p className="text-xs font-medium text-slate-500">
                Showing {revenueStart}-{revenueEnd} of {revenueTotal.toLocaleString('vi-VN')} courts
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRevenuePage((p) => Math.max(1, p - 1))}
                  disabled={safeRevenuePage <= 1}
                  className="rounded border border-slate-200 p-1.5 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRevenuePage((p) => Math.min(revenueTotalPages, p + 1))}
                  disabled={safeRevenuePage >= revenueTotalPages}
                  className="rounded border border-slate-200 p-1.5 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
