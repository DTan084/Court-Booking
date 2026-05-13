'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown, Clock, TrendingUp } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { MetricCard } from '@/components/admin/MetricCard';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { useCourtStats } from '@/hooks/useAdminStats';
import { useCourts } from '@/hooks/useCourts';

function getDefaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { fromDate: from.toISOString(), toDate: to.toISOString() };
}

function toLocalDateInput(isoString: string): string {
  return isoString.split('T')[0];
}

function toISOFromDateInput(dateStr: string, endOfDay = false): string {
  const d = new Date(dateStr);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const revenueRows = [
  {
    court: 'Court A - Center',
    sport: 'Basketball',
    rate: '$85',
    hours: 342,
    maintenance: '-$1,200',
    net: '$27,870',
  },
  {
    court: 'Court B - East',
    sport: 'Volleyball',
    rate: '$65',
    hours: 280,
    maintenance: '-$850',
    net: '$17,350',
  },
  {
    court: 'Court C - West',
    sport: 'Tennis',
    rate: '$110',
    hours: 195,
    maintenance: '-$2,100',
    net: '$19,350',
  },
  {
    court: 'Court D - North',
    sport: 'Pickleball',
    rate: '$45',
    hours: 410,
    maintenance: '-$400',
    net: '$18,050',
  },
];

export default function AdminStatsPage() {
  const defaults = getDefaultDateRange();
  const [fromDateInput, setFromDateInput] = useState(toLocalDateInput(defaults.fromDate));
  const [toDateInput, setToDateInput] = useState(toLocalDateInput(defaults.toDate));
  const [selectedCourtId, setSelectedCourtId] = useState('');

  const { data: courtsData, isLoading: courtsLoading } = useCourts({ page: 1, limit: 50 });
  const courts = courtsData?.data ?? [];

  const statsParams = {
    fromDate: toISOFromDateInput(fromDateInput, false),
    toDate: toISOFromDateInput(toDateInput, true),
  };

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useCourtStats(selectedCourtId, statsParams);
  const utilizationHighlight = (stats?.utilizationPercentage ?? 0) > 80;

  return (
    <AdminShell
      title="Court Analytics"
      subtitle="Comprehensive performance metrics across all venues."
    >
      <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label
              htmlFor="stats-court"
              className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500"
            >
              Court
            </label>
            <div className="relative">
              <select
                id="stats-court"
                value={selectedCourtId}
                onChange={(e) => setSelectedCourtId(e.target.value)}
                disabled={courtsLoading}
                className="w-full appearance-none rounded-lg border border-slate-300 px-3 py-2.5 pr-8 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:opacity-50"
              >
                <option value="">-- Select a court --</option>
                {courts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div>
            <label
              htmlFor="stats-from-date"
              className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500"
            >
              From Date
            </label>
            <input
              id="stats-from-date"
              type="date"
              value={fromDateInput}
              max={toDateInput}
              onChange={(e) => setFromDateInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>

          <div>
            <label
              htmlFor="stats-to-date"
              className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500"
            >
              To Date
            </label>
            <input
              id="stats-to-date"
              type="date"
              value={toDateInput}
              min={fromDateInput}
              onChange={(e) => setToDateInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!selectedCourtId || statsLoading ? (
          <SkeletonCard count={4} />
        ) : statsError ? (
          <div className="col-span-full rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">
            Unable to load analytics data.
          </div>
        ) : (
          <>
            <MetricCard
              title="Total Bookings"
              value={String(stats?.totalBookings ?? 0)}
              icon={<BookOpen className="h-5 w-5" />}
            />
            <MetricCard
              title="Booked Hours"
              value={`${stats?.totalHours ?? 0}h`}
              icon={<Clock className="h-5 w-5" />}
            />
            <MetricCard
              title="Available Hours"
              value={`${stats?.totalAvailableHours ?? 0}h`}
              icon={<Clock className="h-5 w-5" />}
            />
            <MetricCard
              title="Utilization"
              value={`${stats?.utilizationPercentage?.toFixed(1) ?? '0.0'}%`}
              icon={<TrendingUp className="h-5 w-5" />}
              highlight={utilizationHighlight}
            />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 xl:col-span-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">Utilization Heatmap</h3>
            <div className="text-xs text-slate-500">Mock chart placeholder</div>
          </div>
          <div className="flex h-72 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-500">
            Interactive heatmap (Mon-Sun / 06:00-23:00)
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 xl:col-span-4">
          <h3 className="mb-4 text-xl font-bold">Customer Demographics</h3>
          {[
            ['18-24', '25%'],
            ['25-34', '45%'],
            ['35-44', '20%'],
            ['45+', '10%'],
          ].map(([label, value]) => (
            <div key={label} className="mb-3">
              <div className="mb-1 flex justify-between text-sm">
                <span>{label}</span>
                <span>{value}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-orange-400" style={{ width: value }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <h3 className="text-xl font-bold">Revenue by Court</h3>
          <button className="text-sm font-semibold text-[#944a00]">Export CSV</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-4">Court Name</th>
              <th className="px-6 py-4">Primary Sport</th>
              <th className="px-6 py-4 text-right">Avg. Hourly Rate</th>
              <th className="px-6 py-4 text-right">Hours Booked</th>
              <th className="px-6 py-4 text-right">Maintenance</th>
              <th className="px-6 py-4 text-right">Net Revenue</th>
            </tr>
          </thead>
          <tbody>
            {revenueRows.map((row) => (
              <tr key={row.court} className="border-t border-slate-100">
                <td className="px-6 py-4 font-semibold">{row.court}</td>
                <td className="px-6 py-4">{row.sport}</td>
                <td className="px-6 py-4 text-right">{row.rate}</td>
                <td className="px-6 py-4 text-right">{row.hours}</td>
                <td className="px-6 py-4 text-right text-rose-600">{row.maintenance}</td>
                <td className="px-6 py-4 text-right font-bold">{row.net}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCourtId && stats && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-800">Current Selected Court Utilization</span>
            <span
              className={utilizationHighlight ? 'font-semibold text-emerald-700' : 'text-slate-500'}
            >
              {stats.utilizationPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${utilizationHighlight ? 'bg-emerald-500' : 'bg-orange-500'}`}
              style={{ width: `${Math.min(stats.utilizationPercentage, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {stats.totalHours}h / {stats.totalAvailableHours}h available
          </p>
        </div>
      )}
    </AdminShell>
  );
}
