'use client';

import { AdminShell } from '@/components/admin/AdminShell';
import { MetricCard } from '@/components/admin/MetricCard';
import { DollarSign, Receipt, TrendingUp, Wallet } from 'lucide-react';

const transactions = [
  { id: '#TRX-9482', customer: 'Sarah Jenkins', method: 'Visa', amount: '$85.00', status: 'Paid' },
  {
    id: '#TRX-9481',
    customer: 'Marcus Thorne',
    method: 'Apple Pay',
    amount: '$120.00',
    status: 'Paid',
  },
  {
    id: '#TRX-9480',
    customer: 'Elena Rodriguez',
    method: 'Mastercard',
    amount: '$45.00',
    status: 'Refunded',
  },
  { id: '#TRX-9479', customer: 'Nguyen Minh', method: 'Momo', amount: '$75.00', status: 'Paid' },
];

const monthlyRevenue = [35, 41, 46, 52, 57, 54, 61, 66, 69, 74, 79, 83];

export default function AdminRevenuePage() {
  return (
    <AdminShell title="Revenue Insights" subtitle="Financial performance and recent transactions.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Gross Revenue"
          value="$142,580"
          icon={<DollarSign className="h-5 w-5" />}
          trend={{ value: 11, isPositive: true }}
        />
        <MetricCard
          title="Net Profit"
          value="$98,420"
          icon={<Wallet className="h-5 w-5" />}
          trend={{ value: 9, isPositive: true }}
        />
        <MetricCard
          title="Avg Booking Value"
          value="$64.20"
          icon={<Receipt className="h-5 w-5" />}
        />
        <MetricCard title="Refund Rate" value="2.4%" icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 xl:col-span-2">
          <h3 className="text-xl font-bold">Revenue Trend</h3>
          <div className="mt-4 grid h-64 grid-cols-12 items-end gap-2 rounded-lg bg-gradient-to-b from-emerald-50 to-white p-4">
            {monthlyRevenue.map((value, idx) => (
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
          <h3 className="mb-4 text-xl font-bold">Recent Transactions</h3>
          <div className="space-y-3">
            {transactions.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{item.id}</p>
                  <p className="text-sm font-bold">{item.amount}</p>
                </div>
                <p className="text-xs text-slate-500">
                  {item.customer} · {item.method}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-4">Transaction ID</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Method</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="px-6 py-4 font-semibold">{t.id}</td>
                <td className="px-6 py-4">{t.customer}</td>
                <td className="px-6 py-4">{t.method}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {t.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-bold">{t.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
