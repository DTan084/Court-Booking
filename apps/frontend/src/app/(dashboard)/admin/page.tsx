'use client';

import { AdminShell } from '@/components/admin/AdminShell';
import { MetricCard } from '@/components/admin/MetricCard';
import { CalendarCheck2, Clock3, DollarSign, TrendingUp, Users } from 'lucide-react';

const recentBookings = [
  {
    id: 'BK-2091',
    customer: 'Nguyen Minh',
    court: 'Court A1',
    time: '10:00 - 11:00',
    status: 'Checked In',
  },
  {
    id: 'BK-2090',
    customer: 'Tran Hoang',
    court: 'Court B2',
    time: '11:00 - 12:00',
    status: 'Pending Check-in',
  },
  {
    id: 'BK-2089',
    customer: 'Le An',
    court: 'Court C1',
    time: '13:00 - 14:00',
    status: 'Confirmed',
  },
  { id: 'BK-2088', customer: 'Pham Gia', court: 'Court A2', time: '14:00 - 15:00', status: 'Live' },
];

const revenueTrend = [42, 48, 51, 57, 63, 60, 68, 72, 70, 79, 84, 88];

export default function AdminDashboardPage() {
  const metrics = [
    {
      title: 'Total Revenue',
      value: '$124.5k',
      icon: <DollarSign className="h-5 w-5" />,
      trend: { value: 12, isPositive: true },
    },
    {
      title: 'Live Bookings',
      value: '18',
      icon: <CalendarCheck2 className="h-5 w-5" />,
      trend: { value: 6, isPositive: true },
    },
    {
      title: 'Pending Check-in',
      value: '7',
      icon: <Clock3 className="h-5 w-5" />,
    },
    {
      title: 'New Customers',
      value: '342',
      icon: <Users className="h-5 w-5" />,
      trend: { value: 4, isPositive: true },
    },
  ];

  return (
    <AdminShell title="Overview" subtitle="High-performance snapshot of facility operations.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <MetricCard
            key={item.title}
            title={item.title}
            value={item.value}
            icon={item.icon}
            trend={item.trend}
          />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">Revenue Trend</h3>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
              <TrendingUp className="h-4 w-4" />
              +14.2% vs last month
            </span>
          </div>
          <div className="mt-4 grid h-64 grid-cols-12 items-end gap-2 rounded-lg bg-gradient-to-b from-emerald-50 to-white p-4">
            {revenueTrend.map((value, idx) => (
              <div
                key={idx}
                className="rounded-t bg-emerald-500/85"
                style={{ height: `${value}%` }}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Mock visualization. Replace by BI chart when API ready.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-xl font-bold">Popular Sports</h3>
          <div className="space-y-4 text-sm">
            {[
              ['Tennis', '45%'],
              ['Pickleball', '30%'],
              ['Basketball', '15%'],
              ['Volleyball', '10%'],
            ].map(([name, val]) => (
              <div key={name}>
                <div className="mb-1 flex justify-between">
                  <span>{name}</span>
                  <span className="font-semibold">{val}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-[#fd933d]" style={{ width: val }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-4">Booking ID</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Court</th>
              <th className="px-6 py-4">Time</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {recentBookings.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-6 py-4 font-semibold">{item.id}</td>
                <td className="px-6 py-4">{item.customer}</td>
                <td className="px-6 py-4">{item.court}</td>
                <td className="px-6 py-4">{item.time}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-slate-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-700">Recent Bookings</h3>
        </div>
      </div>
    </AdminShell>
  );
}
