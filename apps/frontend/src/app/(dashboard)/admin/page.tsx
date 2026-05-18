'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CalendarCheck2, Clock3, DollarSign, TrendingUp, Users } from 'lucide-react';
import { BookingStatus } from '@court-booking/shared';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAdminBookings, useAdminOverview } from '@/hooks/useBookings';
import { useSportTypes } from '@/hooks/useSportTypes';
import { formatCurrency } from '@/lib/utils';
import { formatDateByTimezone, formatTimeByTimezone } from '@/lib/datetime';

function getBookingDisplayStatus(booking: {
  status: BookingStatus;
  startTime: string;
  endTime: string;
}): string {
  const now = new Date();
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);

  if (booking.status === BookingStatus.CONFIRMED && start <= now && end >= now) return 'LIVE';
  if (booking.status === BookingStatus.CONFIRMED && start > now) return 'UPCOMING';
  if (booking.status === BookingStatus.COMPLETED) return BookingStatus.COMPLETED;
  if (booking.status === BookingStatus.PENDING_PAYMENT) return BookingStatus.PENDING_PAYMENT;
  if (booking.status === BookingStatus.CANCELLED) return BookingStatus.CANCELLED;
  if (booking.status === BookingStatus.EXPIRED) return BookingStatus.EXPIRED;
  return booking.status;
}

export default function AdminDashboardPage() {
  const timezone = 'Asia/Ho_Chi_Minh';
  const locale = 'vi-VN';
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 30);
    return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
  }, []);

  const { data: overview } = useAdminOverview(range);
  const { data: monthlyBookingsData } = useAdminBookings({
    page: 1,
    limit: 500,
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
  });
  const { data: recentBookingsData } = useAdminBookings({
    page: 1,
    limit: 5,
  });
  const { data: sportTypes = [] } = useSportTypes();

  const monthlyBookings = useMemo(() => monthlyBookingsData?.data ?? [], [monthlyBookingsData]);
  const recentBookings = useMemo(() => recentBookingsData?.data ?? [], [recentBookingsData]);

  const dayRevenue = useMemo(() => {
    const current = new Date();
    const days = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(current);
      d.setDate(current.getDate() - (6 - idx));
      d.setHours(0, 0, 0, 0);
      return d;
    });
    const values = days.map((dayStart) => {
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      return monthlyBookings
        .filter((b) => [BookingStatus.CONFIRMED, BookingStatus.COMPLETED].includes(b.status))
        .filter((b) => {
          const start = new Date(b.startTime);
          return start >= dayStart && start <= dayEnd;
        })
        .reduce((sum, b) => sum + Number(b.totalPrice), 0);
    });
    const max = Math.max(...values, 1);
    return {
      labels: days.map((d) =>
        formatDateByTimezone(d, timezone, locale, { day: '2-digit', month: '2-digit' }),
      ),
      values,
      bars: values.map((v) => Math.max(8, Math.round((v / max) * 100))),
    };
  }, [monthlyBookings, timezone, locale]);

  const sportDistribution = useMemo(() => {
    const sportById = new Map(sportTypes.map((s) => [s.id, s.name]));
    const countBySport = new Map<string, number>();
    monthlyBookings.forEach((b) => {
      const sportTypeId = b.court?.sportTypeId;
      if (!sportTypeId) return;
      const name = sportById.get(sportTypeId) ?? 'Unknown';
      countBySport.set(name, (countBySport.get(name) ?? 0) + 1);
    });
    const total = Array.from(countBySport.values()).reduce((a, c) => a + c, 0) || 1;
    return Array.from(countBySport.entries())
      .map(([name, count]) => ({ name, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4);
  }, [monthlyBookings, sportTypes]);

  const metrics = [
    {
      title: 'Total Revenue',
      value: formatCurrency(overview?.totalRevenue ?? 0),
      icon: <DollarSign className="h-5 w-5" />,
      hint: 'Revenue in last 30 days',
    },
    {
      title: 'Active Bookings',
      value: String(overview?.activeBookings ?? 0),
      icon: <CalendarCheck2 className="h-5 w-5" />,
      hint: 'Live + upcoming',
    },
    {
      title: 'Occupancy Rate',
      value: `${(overview?.occupancyRate ?? 0).toFixed(1)}%`,
      icon: <Clock3 className="h-5 w-5" />,
      hint: 'By court_time_slots (30d)',
    },
    {
      title: 'New Customers',
      value: String(overview?.newCustomers ?? 0),
      icon: <Users className="h-5 w-5" />,
      hint: 'Registered in last 30 days',
    },
  ];

  return (
    <AdminShell title="Overview" subtitle="High-performance snapshot of facility operations.">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item, idx) => (
          <article
            key={item.title}
            className={`rounded-xl border border-slate-200 bg-white p-6 ${idx === 3 ? 'border-l-4 border-l-[#fd933d]' : ''}`}
          >
            <div className="mb-5 flex items-start justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                {item.title}
              </p>
              <div className="text-[#944a00]">{item.icon}</div>
            </div>
            <p className="text-4xl font-black tracking-tight text-slate-900">{item.value}</p>
            <p className="mt-2 text-xs text-slate-500">{item.hint}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">Revenue Trend</h3>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-4 grid h-64 grid-cols-7 items-end gap-3 rounded-lg bg-gradient-to-b from-slate-50 to-white p-4">
            {dayRevenue.bars.map((value, idx) => (
              <div key={idx} className="group relative h-full">
                <div className="h-full w-full" />
                <div
                  className="absolute bottom-0 w-full rounded-t bg-[#fd933d]"
                  style={{ height: `${value}%` }}
                />
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                  {formatCurrency(dayRevenue.values[idx] ?? 0)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-3 px-4 text-center text-[11px] font-semibold text-slate-500">
            {dayRevenue.labels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Revenue from the last 7 days derived from database bookings.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-xl font-bold">Popular Sports</h3>
          <div className="space-y-4 text-sm">
            {sportDistribution.map((item) => (
              <div key={item.name}>
                <div className="mb-1 flex justify-between">
                  <span>{item.name}</span>
                  <span className="font-semibold">{item.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-[#fd933d]"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
            {sportDistribution.length === 0 && (
              <p className="text-sm text-slate-500">No booking data available by sport yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h3 className="text-xl font-bold text-slate-900">Recent Bookings</h3>
          <Link
            href="/admin/bookings"
            className="text-xs font-semibold uppercase tracking-[0.08em] text-[#944a00] hover:underline"
          >
            View All
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-100/70 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-4">Date &amp; Time</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Court</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {recentBookings.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-900">
                    {formatDateByTimezone(item.startTime, timezone, locale)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatTimeByTimezone(item.startTime, timezone, locale)} -{' '}
                    {formatTimeByTimezone(item.endTime, timezone, locale)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {(item as { customerName?: string }).customerName ?? item.guestName ?? 'Member'}
                </td>
                <td className="px-6 py-4">{item.court?.name ?? '-'}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-[#fd933d]/15 px-2.5 py-1 text-xs font-bold text-[#944a00]">
                    {getBookingDisplayStatus(item)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-bold text-slate-900">
                  {formatCurrency(Number(item.totalPrice))}
                </td>
              </tr>
            ))}
            {recentBookings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                  No booking data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
