'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, DollarSign, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { BookingStatus } from '@court-booking/shared';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAdminBookings } from '@/hooks/useBookings';
import { useSportTypes } from '@/hooks/useSportTypes';
import { formatCurrency } from '@/lib/utils';
import { formatDateByTimezone } from '@/lib/datetime';

const parseManualRefundAmount = (note?: string | null): number => {
  if (!note || !note.includes('[MANUAL_REFUND]')) return 0;
  const matched = note.match(/amount=([0-9]+(?:\.[0-9]+)?)/);
  if (!matched?.[1]) return 0;
  const parsed = Number(matched[1]);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function AdminRevenuePage() {
  const timezone = 'Asia/Ho_Chi_Minh';
  const locale = 'vi-VN';
  const [recentPage, setRecentPage] = useState(1);
  const recentLimit = 4;

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 30);
    return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
  }, []);

  const { data: monthlyBookingsData } = useAdminBookings({
    page: 1,
    limit: 500,
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
  });
  const { data: recentBookingsData } = useAdminBookings({
    page: recentPage,
    limit: recentLimit,
  });
  const { data: sportTypes = [] } = useSportTypes();

  const monthlyBookings = useMemo(() => monthlyBookingsData?.data ?? [], [monthlyBookingsData]);
  const recentBookings = useMemo(() => recentBookingsData?.data ?? [], [recentBookingsData]);
  type BookingWithPayment = (typeof recentBookings)[number] & {
    paymentProvider?: string | null;
    manualRefundRecorded?: boolean;
    paymentRefundAmount?: number | null;
  };
  const recentMeta = recentBookingsData?.meta;
  const recentTotal = recentMeta?.total ?? 0;
  const recentPageCount = Math.max(1, recentMeta?.totalPages ?? 1);
  const recentStart = recentTotal === 0 ? 0 : (recentPage - 1) * recentLimit + 1;
  const recentEnd = recentTotal === 0 ? 0 : Math.min(recentPage * recentLimit, recentTotal);

  const paidStatuses = [BookingStatus.CONFIRMED, BookingStatus.COMPLETED];
  const paidBookings = monthlyBookings.filter((b) => paidStatuses.includes(b.status));
  const refundedBookings = monthlyBookings.filter((b) => {
    const paymentStatus = (b as { paymentStatus?: string | null }).paymentStatus;
    const manualRefundRecorded = (b as { manualRefundRecorded?: boolean }).manualRefundRecorded;
    return (
      paymentStatus === 'REFUNDED' ||
      paymentStatus === 'PARTIAL_REFUND' ||
      manualRefundRecorded === true
    );
  });

  const grossRevenue = paidBookings.reduce((sum, b) => sum + Number(b.totalPrice), 0);
  const refundTotal = refundedBookings.reduce((sum, b) => {
    const paymentRefundAmount = Number(
      (b as { paymentRefundAmount?: number | null }).paymentRefundAmount ?? 0,
    );
    const manualRefundAmount = parseManualRefundAmount(
      (b as { cancellationNote?: string | null }).cancellationNote,
    );
    return sum + Math.max(paymentRefundAmount, manualRefundAmount);
  }, 0);
  const netProfit = Math.max(0, grossRevenue - refundTotal);
  const avgBookingValue = paidBookings.length > 0 ? grossRevenue / paidBookings.length : 0;
  const refundRate =
    paidBookings.length > 0 ? (refundedBookings.length / paidBookings.length) * 100 : 0;

  const weeklyRevenue = useMemo(() => {
    const start = new Date(range.dateFrom);
    const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const values = [0, 0, 0, 0];
    for (const b of paidBookings) {
      const t = new Date(b.startTime).getTime();
      const diffDays = Math.floor((t - start.getTime()) / (1000 * 60 * 60 * 24));
      const weekIdx = Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
      values[weekIdx] += Number(b.totalPrice);
    }
    const max = Math.max(...values, 1);
    return { labels, values, bars: values.map((v) => Math.max(10, Math.round((v / max) * 100))) };
  }, [paidBookings, range.dateFrom]);

  const revenueBySport = useMemo(() => {
    const sportMap = new Map(sportTypes.map((s) => [s.id, s.name]));
    const map = new Map<string, number>();
    for (const b of paidBookings) {
      const sportName = sportMap.get(b.court?.sportTypeId ?? '') ?? 'Unknown';
      map.set(sportName, (map.get(sportName) ?? 0) + Number(b.totalPrice));
    }
    const entries = Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
    const max = Math.max(...entries.map((e) => e.amount), 1);
    return entries.slice(0, 4).map((e) => ({
      ...e,
      pct: Math.round((e.amount / max) * 100),
    }));
  }, [paidBookings, sportTypes]);

  const sportNameById = useMemo(() => new Map(sportTypes.map((s) => [s.id, s.name])), [sportTypes]);

  return (
    <AdminShell title="Revenue Insights" subtitle="Financial performance and recent transactions.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-start justify-between">
            <span className="rounded-lg bg-orange-50 p-2 text-orange-600">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <p className="mb-1 text-sm font-medium text-slate-500">Gross Revenue</p>
          <h3 className="text-2xl font-extrabold text-slate-900">{formatCurrency(grossRevenue)}</h3>
          <p className="mt-2 text-xs text-slate-500">Revenue in last 30 days</p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-start justify-between">
            <span className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <p className="mb-1 text-sm font-medium text-slate-500">Net Profit</p>
          <h3 className="text-2xl font-extrabold text-slate-900">{formatCurrency(netProfit)}</h3>
          <p className="mt-2 text-xs text-slate-500">Gross revenue minus refunded amount (30d)</p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-start justify-between">
            <span className="rounded-lg bg-purple-50 p-2 text-purple-600">
              <Receipt className="h-4 w-4" />
            </span>
          </div>
          <p className="mb-1 text-sm font-medium text-slate-500">Average Booking Value</p>
          <h3 className="text-2xl font-extrabold text-slate-900">
            {formatCurrency(avgBookingValue)}
          </h3>
          <p className="mt-2 text-xs text-slate-500">
            Gross revenue / paid bookings in last 30 days
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-start justify-between">
            <span className="rounded-lg bg-red-50 p-2 text-red-600">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p className="mb-1 text-sm font-medium text-slate-500">Refund Rate</p>
          <h3 className="text-2xl font-extrabold text-slate-900">{refundRate.toFixed(1)}%</h3>
          <p className="mt-2 text-xs text-slate-500">Refunded bookings over paid bookings (30d)</p>
        </article>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-8 xl:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h4 className="text-xl font-bold text-slate-900">Revenue Trends</h4>
          </div>
          <div className="grid h-64 grid-cols-4 items-end gap-4 rounded-lg bg-gradient-to-b from-orange-50/70 to-white p-4">
            {weeklyRevenue.bars.map((height, idx) => (
              <div key={weeklyRevenue.labels[idx]} className="group relative h-full">
                <div
                  className="absolute bottom-0 w-full rounded-t bg-[#fd933d]"
                  style={{ height: `${height}%` }}
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                  {formatCurrency(weeklyRevenue.values[idx] ?? 0)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-4 text-center text-[11px] font-semibold text-slate-500">
            {weeklyRevenue.labels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <h4 className="mb-6 text-xl font-bold text-slate-900">Revenue by Sport</h4>
          <div className="space-y-5">
            {revenueBySport.map((item) => (
              <div key={item.name}>
                <div className="mb-2 flex justify-between">
                  <span className="text-sm font-bold text-slate-700">{item.name}</span>
                  <span className="text-sm font-bold text-orange-600">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-[#fd933d]"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
            {revenueBySport.length === 0 && (
              <p className="text-sm text-slate-500">No paid bookings in the selected period.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
          <h4 className="text-xl font-bold text-slate-900">Recent Transactions</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/60 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-8 py-4">Booking ID</th>
                <th className="px-4 py-4">Date</th>
                <th className="px-4 py-4">Customer</th>
                <th className="px-4 py-4">Sport</th>
                <th className="px-4 py-4">Payment Method</th>
                <th className="px-8 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentBookings.map((b) => (
                <tr key={b.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-8 py-4 text-sm font-bold text-slate-900">
                    #BK-{b.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {formatDateByTimezone(b.startTime, timezone, locale)}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-900">
                    {(b as { customerName?: string }).customerName ?? b.guestName ?? 'Member'}
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded border border-orange-100 bg-orange-50 px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-orange-700">
                      {b.court?.sportTypeName ??
                        (b.court?.sportTypeId
                          ? sportNameById.get(b.court.sportTypeId)
                          : undefined) ??
                        'Sport'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {(b as BookingWithPayment).paymentProvider ??
                      ((b as BookingWithPayment).manualRefundRecorded ? 'MANUAL' : 'N/A')}
                  </td>
                  <td className="px-8 py-4 text-right text-sm font-black text-slate-900">
                    {formatCurrency(Number(b.totalPrice))}
                  </td>
                </tr>
              ))}
              {recentBookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-8 text-center text-sm text-slate-500">
                    No transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-8 py-4">
          <p className="text-xs font-medium text-slate-500">
            Showing {recentStart}-{recentEnd} of {recentTotal.toLocaleString(locale)} transactions
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRecentPage((p) => Math.max(1, p - 1))}
              disabled={recentPage <= 1}
              className="rounded border border-slate-200 p-1.5 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setRecentPage((p) => Math.min(recentPageCount, p + 1))}
              disabled={recentPage >= recentPageCount}
              className="rounded border border-slate-200 p-1.5 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
