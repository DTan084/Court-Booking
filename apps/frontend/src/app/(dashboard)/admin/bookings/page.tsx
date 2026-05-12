'use client';

import { useMemo, useState } from 'react';
import { CalendarCheck2, Clock3, Plus, Search } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { MetricCard } from '@/components/admin/MetricCard';
import { Button } from '@/components/ui/button';

const rows = [
  {
    id: '#BK-1042',
    court: 'Court 04 - Elite Padel',
    date: '2026-05-12',
    time: '09:00 - 10:30',
    customer: 'Marcus Sterling',
    status: 'Live',
  },
  {
    id: '#BK-1043',
    court: 'Main Court A',
    date: '2026-05-12',
    time: '11:00 - 12:00',
    customer: 'Sarah Jenkins',
    status: 'Pending Check-in',
  },
  {
    id: '#BK-1044',
    court: 'Court 01 - Grass',
    date: '2026-05-12',
    time: '12:30 - 14:00',
    customer: 'David Thorne',
    status: 'Confirmed',
  },
  {
    id: '#BK-1045',
    court: 'Court B2',
    date: '2026-05-13',
    time: '08:00 - 09:00',
    customer: 'Le Minh Anh',
    status: 'Completed',
  },
  {
    id: '#BK-1046',
    court: 'Court C1',
    date: '2026-05-13',
    time: '15:00 - 16:00',
    customer: 'Tran Quoc Bao',
    status: 'Cancelled',
  },
];

export default function AdminBookingsPage() {
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('ALL');
  const [day, setDay] = useState('ALL');

  const filteredRows = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    return rows.filter((row) => {
      const byKeyword =
        key.length === 0 ||
        row.id.toLowerCase().includes(key) ||
        row.customer.toLowerCase().includes(key) ||
        row.court.toLowerCase().includes(key);
      const byStatus = status === 'ALL' || row.status === status;
      const byDay = day === 'ALL' || row.date === day;
      return byKeyword && byStatus && byDay;
    });
  }, [keyword, status, day]);

  const statuses = Array.from(new Set(rows.map((r) => r.status)));
  const days = Array.from(new Set(rows.map((r) => r.date)));

  return (
    <AdminShell
      title="Booking Management"
      subtitle="Manage and monitor all reservations across courts."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Live" value="18" icon={<CalendarCheck2 className="h-5 w-5" />} />
        <MetricCard title="Pending Check-in" value="7" icon={<Clock3 className="h-5 w-5" />} />
        <MetricCard title="Today Total" value="42" icon={<CalendarCheck2 className="h-5 w-5" />} />
        <MetricCard title="Cancelled" value="3" icon={<Clock3 className="h-5 w-5" />} />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search booking, customer, court..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          >
            <option value="ALL">All status</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          >
            <option value="ALL">All dates</option>
            {days.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <Button className="gap-2 bg-[#944a00] hover:bg-[#7f3f00]">
            <Plus className="h-4 w-4" />
            Manual Booking
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-4">Booking ID</th>
              <th className="px-6 py-4">Court</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Time</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-6 py-4 font-semibold">{row.id}</td>
                <td className="px-6 py-4">{row.court}</td>
                <td className="px-6 py-4">{row.date}</td>
                <td className="px-6 py-4">{row.time}</td>
                <td className="px-6 py-4">{row.customer}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
