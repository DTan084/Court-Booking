'use client';

import { useMemo, useState } from 'react';
import { Search, UserPlus, Users } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { MetricCard } from '@/components/admin/MetricCard';
import { Button } from '@/components/ui/button';

const customers = [
  {
    name: 'Marcus Thompson',
    email: 'm.thompson@example.com',
    tier: 'ELITE',
    bookings: 142,
    ltv: '$4,250.00',
    status: 'Active',
  },
  {
    name: 'Sarah Jenkins',
    email: 's.jenkins@domain.com',
    tier: 'PRO',
    bookings: 68,
    ltv: '$1,890.00',
    status: 'Active',
  },
  {
    name: 'David Chen',
    email: 'dchen_vets@webmail.io',
    tier: 'BASIC',
    bookings: 12,
    ltv: '$420.00',
    status: 'Inactive',
  },
  {
    name: 'Nguyen Anh',
    email: 'n.anh@sample.com',
    tier: 'PRO',
    bookings: 21,
    ltv: '$760.00',
    status: 'Active',
  },
  {
    name: 'Le Trang',
    email: 'trang.le@mail.com',
    tier: 'BASIC',
    bookings: 4,
    ltv: '$120.00',
    status: 'New',
  },
];

export default function AdminCustomersPage() {
  const [keyword, setKeyword] = useState('');
  const [tier, setTier] = useState('ALL');

  const filteredCustomers = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    return customers.filter((customer) => {
      const byKeyword =
        key.length === 0 ||
        customer.name.toLowerCase().includes(key) ||
        customer.email.toLowerCase().includes(key);
      const byTier = tier === 'ALL' || customer.tier === tier;
      return byKeyword && byTier;
    });
  }, [keyword, tier]);

  return (
    <AdminShell
      title="Customer Directory"
      subtitle="Manage and monitor your athlete and member base."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Customers" value="1,248" icon={<Users className="h-5 w-5" />} />
        <MetricCard
          title="New This Month"
          value="86"
          icon={<UserPlus className="h-5 w-5" />}
          trend={{ value: 8, isPositive: true }}
        />
        <MetricCard title="Active Members" value="1,032" icon={<Users className="h-5 w-5" />} />
        <MetricCard title="Retention Rate" value="82%" icon={<Users className="h-5 w-5" />} />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search customer name or email..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>

          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          >
            <option value="ALL">All tiers</option>
            <option value="ELITE">ELITE</option>
            <option value="PRO">PRO</option>
            <option value="BASIC">BASIC</option>
          </select>

          <Button className="bg-[#944a00] hover:bg-[#7f3f00]">Export CSV</Button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Tier</th>
              <th className="px-6 py-4 text-center">Bookings</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Lifetime Value</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((c) => (
              <tr key={c.email} className="border-t border-slate-100">
                <td className="px-6 py-4">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.email}</p>
                </td>
                <td className="px-6 py-4">{c.tier}</td>
                <td className="px-6 py-4 text-center">{c.bookings}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {c.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-semibold">{c.ltv}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
