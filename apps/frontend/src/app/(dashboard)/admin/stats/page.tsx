'use client';

import { useState } from 'react';
import { BarChart3, BookOpen, DollarSign, TrendingUp } from 'lucide-react';
import { useAdminStats } from '@/hooks/useAdminStats';
import { MetricCard } from '@/components/admin/MetricCard';
import { TopCourtsTable } from '@/components/admin/TopCourtsTable';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { formatCurrency } from '@/lib/utils';

// ==================== HELPERS ====================

function getDefaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29); // last 30 days
  return {
    fromDate: from.toISOString().split('T')[0],
    toDate: to.toISOString().split('T')[0],
  };
}

// ==================== COMPONENT ====================

export default function AdminStatsPage() {
  const defaults = getDefaultDateRange();
  const [fromDate, setFromDate] = useState(defaults.fromDate);
  const [toDate, setToDate] = useState(defaults.toDate);

  const { data: stats, isLoading, error } = useAdminStats({ fromDate, toDate });

  const utilizationHighlight = (stats?.utilizationRate ?? 0) > 80;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      {/* Page Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Thống kê</h1>
          <p className="text-sm text-muted-foreground">Tổng quan hoạt động đặt sân</p>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
        <div>
          <label htmlFor="stats-from-date" className="block text-sm font-medium text-gray-700 mb-1">
            Từ ngày
          </label>
          <input
            id="stats-from-date"
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
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
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <p className="text-xs text-muted-foreground self-end pb-2">Tối đa 90 ngày</p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-6">
          <SkeletonCard count={3} />
          <SkeletonCard count={3} />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-600">Không thể tải dữ liệu thống kê. Vui lòng thử lại.</p>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              title="Tổng booking"
              value={stats.totalBookings.toLocaleString('vi-VN')}
              icon={<BookOpen className="h-5 w-5" />}
            />
            <MetricCard
              title="Doanh thu"
              value={formatCurrency(stats.totalRevenue)}
              icon={<DollarSign className="h-5 w-5" />}
            />
            <MetricCard
              title="Tỷ lệ sử dụng"
              value={`${stats.utilizationRate.toFixed(1)}%`}
              icon={<TrendingUp className="h-5 w-5" />}
              highlight={utilizationHighlight}
            />
          </div>

          {/* Top Courts */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Sân được đặt nhiều nhất</h2>
            <TopCourtsTable courts={stats.topCourts} />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">Không có dữ liệu cho khoảng thời gian này.</p>
        </div>
      )}
    </div>
  );
}
