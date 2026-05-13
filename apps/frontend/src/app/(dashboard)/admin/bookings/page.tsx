'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CalendarCheck2, Clock3, Plus, Search } from 'lucide-react';
import { BookingSource, BookingStatus } from '@court-booking/shared';
import { AdminShell } from '@/components/admin/AdminShell';
import { MetricCard } from '@/components/admin/MetricCard';
import { Button } from '@/components/ui/button';
import { useAdminBookings } from '@/hooks/useBookings';

export default function AdminBookingsPage() {
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('ALL');
  const [source, setSource] = useState<'ALL' | BookingSource>('ALL');

  const query = useMemo(
    () => ({
      page: 1,
      limit: 50,
      status: status === 'ALL' ? undefined : (status as BookingStatus),
      bookingSource: source === 'ALL' ? undefined : source,
    }),
    [status, source],
  );
  const { data } = useAdminBookings(query);
  const rows = useMemo(() => data?.data ?? [], [data]);

  const filteredRows = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    return rows.filter((row) => {
      if (!key) return true;
      return (
        row.id.toLowerCase().includes(key) ||
        row.court?.name?.toLowerCase().includes(key) ||
        row.guestName?.toLowerCase().includes(key)
      );
    });
  }, [rows, keyword]);

  return (
    <AdminShell
      title="Booking Management"
      subtitle="Manage and monitor all reservations across courts."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total"
          value={String(rows.length)}
          icon={<CalendarCheck2 className="h-5 w-5" />}
        />
        <MetricCard
          title="Confirmed"
          value={String(rows.filter((r) => r.status === BookingStatus.CONFIRMED).length)}
          icon={<Clock3 className="h-5 w-5" />}
        />
        <MetricCard
          title="Admin/Walk-in"
          value={String(
            rows.filter(
              (r) =>
                r.bookingSource === BookingSource.ADMIN ||
                r.bookingSource === BookingSource.WALK_IN,
            ).length,
          )}
          icon={<CalendarCheck2 className="h-5 w-5" />}
        />
        <MetricCard
          title="Cancelled"
          value={String(rows.filter((r) => r.status === BookingStatus.CANCELLED).length)}
          icon={<Clock3 className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search booking, guest, court..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          >
            <option value="ALL">All status</option>
            <option value={BookingStatus.PENDING_PAYMENT}>{BookingStatus.PENDING_PAYMENT}</option>
            <option value={BookingStatus.CONFIRMED}>{BookingStatus.CONFIRMED}</option>
            <option value={BookingStatus.CANCELLED}>{BookingStatus.CANCELLED}</option>
            <option value={BookingStatus.COMPLETED}>{BookingStatus.COMPLETED}</option>
          </select>

          <select
            value={source}
            onChange={(e) => setSource(e.target.value as 'ALL' | BookingSource)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          >
            <option value="ALL">All sources</option>
            <option value={BookingSource.ONLINE}>{BookingSource.ONLINE}</option>
            <option value={BookingSource.ADMIN}>{BookingSource.ADMIN}</option>
            <option value={BookingSource.WALK_IN}>{BookingSource.WALK_IN}</option>
          </select>

          <Link href="/admin/bookings/new">
            <Button className="gap-2 bg-[#944a00] hover:bg-[#7f3f00]">
              <Plus className="h-4 w-4" />
              Manual Booking
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-4">Booking ID</th>
              <th className="px-6 py-4">Court</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Time</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Source</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const start = new Date(row.startTime);
              const end = new Date(row.endTime);
              const sourceLabel = row.bookingSource === 'WALK_IN' ? 'WALK-IN' : row.bookingSource;
              return (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-6 py-4 font-semibold">{row.id.slice(0, 8)}</td>
                  <td className="px-6 py-4">{row.court?.name ?? '-'}</td>
                  <td className="px-6 py-4">{start.toLocaleDateString('vi-VN')}</td>
                  <td className="px-6 py-4">
                    {start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} -{' '}
                    {end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4">{row.guestName ?? row.userId ?? '-'}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      {sourceLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {row.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
