'use client';

import { useState } from 'react';
import { BarChart3, BookOpen, Clock, TrendingUp, ChevronDown } from 'lucide-react';
import { useCourts } from '@/hooks/useCourts';
import { useCourtStats } from '@/hooks/useAdminStats';
import { MetricCard } from '@/components/admin/MetricCard';
import { SkeletonCard } from '@/components/shared/SkeletonCard';

// ==================== HELPERS ====================

function getDefaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29); // last 30 days
  return {
    fromDate: from.toISOString(),
    toDate: to.toISOString(),
  };
}

function toLocalDateInput(isoString: string): string {
  return isoString.split('T')[0];
}

function toISOFromDateInput(dateStr: string, endOfDay = false): string {
  const d = new Date(dateStr);
  if (endOfDay) {
    d.setHours(23, 59, 59, 999);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

// ==================== COMPONENT ====================

export default function AdminStatsPage() {
  const defaults = getDefaultDateRange();
  const [fromDateInput, setFromDateInput] = useState(toLocalDateInput(defaults.fromDate));
  const [toDateInput, setToDateInput] = useState(toLocalDateInput(defaults.toDate));
  const [selectedCourtId, setSelectedCourtId] = useState('');

  // Fetch courts list for the selector
  const { data: courtsData, isLoading: courtsLoading } = useCourts({ page: 1, limit: 50 });
  const courts = courtsData?.data ?? [];

  // Build ISO params for the stats query
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
    <div className="container mx-auto max-w-5xl px-4 py-8">
      {/* Page Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Thống kê sân</h1>
          <p className="text-sm text-muted-foreground">
            Xem tỷ lệ sử dụng và booking theo từng sân
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
        {/* Court Selector */}
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="stats-court" className="block text-sm font-medium text-gray-700 mb-1">
            Chọn sân
          </label>
          <div className="relative">
            <select
              id="stats-court"
              value={selectedCourtId}
              onChange={(e) => setSelectedCourtId(e.target.value)}
              disabled={courtsLoading}
              className="w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">-- Chọn sân để xem thống kê --</option>
              {courts.map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Date Range */}
        <div>
          <label htmlFor="stats-from-date" className="block text-sm font-medium text-gray-700 mb-1">
            Từ ngày
          </label>
          <input
            id="stats-from-date"
            type="date"
            value={fromDateInput}
            max={toDateInput}
            onChange={(e) => setFromDateInput(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="stats-to-date" className="block text-sm font-medium text-gray-700 mb-1">
            Đến ngày
          </label>
          <input
            id="stats-to-date"
            type="date"
            value={toDateInput}
            min={fromDateInput}
            onChange={(e) => setToDateInput(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Content */}
      {!selectedCourtId ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <BarChart3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">Chọn một sân để xem thống kê</p>
        </div>
      ) : statsLoading ? (
        <SkeletonCard count={3} />
      ) : statsError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-600">Không thể tải dữ liệu thống kê. Vui lòng thử lại.</p>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Court name + period */}
          <div className="rounded-lg border bg-card px-5 py-4">
            <h2 className="text-lg font-semibold text-foreground">{stats.courtName}</h2>
            <p className="text-sm text-muted-foreground">
              {toLocalDateInput(stats.period.from)} → {toLocalDateInput(stats.period.to)}
            </p>
          </div>

          {/* Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Tổng booking"
              value={stats.totalBookings.toLocaleString('vi-VN')}
              icon={<BookOpen className="h-5 w-5" />}
            />
            <MetricCard
              title="Tổng giờ đã đặt"
              value={`${stats.totalHours}h`}
              icon={<Clock className="h-5 w-5" />}
            />
            <MetricCard
              title="Giờ khả dụng"
              value={`${stats.totalAvailableHours}h`}
              icon={<Clock className="h-5 w-5" />}
            />
            <MetricCard
              title="Tỷ lệ sử dụng"
              value={`${stats.utilizationPercentage.toFixed(1)}%`}
              icon={<TrendingUp className="h-5 w-5" />}
              highlight={utilizationHighlight}
            />
          </div>

          {/* Utilization bar */}
          <div className="rounded-lg border bg-card p-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Tỷ lệ lấp đầy</span>
              <span
                className={
                  utilizationHighlight ? 'font-semibold text-green-700' : 'text-muted-foreground'
                }
              >
                {stats.utilizationPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all ${
                  utilizationHighlight ? 'bg-green-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(stats.utilizationPercentage, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {stats.totalHours}h / {stats.totalAvailableHours}h khả dụng
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
