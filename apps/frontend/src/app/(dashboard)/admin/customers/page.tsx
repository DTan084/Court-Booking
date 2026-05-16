'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search, UserPlus, Users } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Role, type PaginatedResult, type User } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { formatDateByTimezone } from '@/lib/datetime';

type AdminUserRow = User & {
  successfulBookings: number;
  totalBookings: number;
  lifetimeValue: number;
  lastActiveAt: string | null;
};
type AdminUsersResponse = PaginatedResult<AdminUserRow> & {
  summary?: {
    totalCustomers: number;
    newCustomers30d: number;
    activeMembers: number;
  };
};

export default function AdminCustomersPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: Role.USER as Role.USER | Role.ADMIN,
    phone: '',
    dob: '',
  });
  const limit = 4;

  const { data, isLoading } = useQuery<AdminUsersResponse>({
    queryKey: ['admin-users', { page, limit, keyword }],
    queryFn: async () => {
      const response = await api.get('/users/admin/list', {
        params: { page, limit, search: keyword || undefined },
      });
      return response.data.data ?? response.data;
    },
  });

  const updateUser = useMutation({
    mutationFn: async (payload: {
      id: string;
      name: string;
      email: string;
      role: Role.USER | Role.ADMIN;
      phone?: string | null;
      dob?: string | null;
    }) => {
      await api.patch(`/users/admin/${payload.id}`, {
        name: payload.name,
        email: payload.email,
        role: payload.role,
        phone: payload.phone || null,
        dob: payload.dob || null,
      });
    },
    onSuccess: () => {
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const rows = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;
  const totalCustomers = data?.summary?.totalCustomers ?? meta?.total ?? 0;
  const new30d = data?.summary?.newCustomers30d ?? 0;
  const activeMembers = data?.summary?.activeMembers ?? 0;
  const retentionRate = totalCustomers > 0 ? (activeMembers / totalCustomers) * 100 : 0;

  return (
    <AdminShell
      title="Customer Directory"
      subtitle="Manage and monitor your league's athlete and member base."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Total Customers
            </p>
            <div className="text-[#944a00]">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-4xl font-black tracking-tight text-slate-900">{totalCustomers}</p>
          <p className="mt-2 text-xs text-slate-500">All registered users</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              New This Month
            </p>
            <div className="text-[#944a00]">
              <UserPlus className="h-5 w-5" />
            </div>
          </div>
          <p className="text-4xl font-black tracking-tight text-slate-900">{new30d}</p>
          <p className="mt-2 text-xs text-slate-500">Registered in last 30 days</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Active Members
            </p>
            <div className="text-[#944a00]">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-4xl font-black tracking-tight text-slate-900">{activeMembers}</p>
          <p className="mt-2 text-xs text-slate-500">Users with successful bookings</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Retention Rate
            </p>
            <div className="text-[#944a00]">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-4xl font-black tracking-tight text-slate-900">
            {retentionRate.toFixed(1)}%
          </p>
          <p className="mt-2 text-xs text-slate-500">Active members / total customers</p>
        </article>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or email..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>
          <div className="text-xs text-slate-500"></div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-4">Customer Name</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4 text-center">Total Bookings (a/b)</th>
              <th className="px-6 py-4">Lifetime Value</th>
              <th className="px-6 py-4">Last Active</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-6 py-8 text-center text-slate-500" colSpan={5}>
                  Loading customers...
                </td>
              </tr>
            )}
            {!isLoading &&
              rows.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold">{u.successfulBookings}</span>
                    <span className="text-slate-400">/{u.totalBookings}</span>
                  </td>
                  <td className="px-6 py-4 font-semibold">{formatCurrency(u.lifetimeValue)}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {u.lastActiveAt
                      ? formatDateByTimezone(u.lastActiveAt, 'Asia/Ho_Chi_Minh', 'vi-VN')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(u);
                        setForm({
                          name: u.name ?? '',
                          email: u.email ?? '',
                          role: (u.role ?? Role.USER) as Role.USER | Role.ADMIN,
                          phone: u.phone ?? '',
                          dob: u.dob ?? '',
                        });
                      }}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="border-t border-slate-100 bg-slate-50/40 px-6 py-2 text-xs text-slate-500">
          Note: `a` = confirmed + completed, `b` = all bookings (including cancelled/expired).
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-8 py-4">
          <p className="text-xs font-medium text-slate-500">
            Showing{' '}
            {(meta?.total ?? 0) === 0 ? 0 : ((meta?.page ?? 1) - 1) * (meta?.limit ?? limit) + 1}-
            {Math.min((meta?.page ?? 1) * (meta?.limit ?? limit), meta?.total ?? 0)} of{' '}
            {(meta?.total ?? 0).toLocaleString('vi-VN')} customers
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={(meta?.page ?? 1) <= 1}
              className="rounded border border-slate-200 p-1.5 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={(meta?.page ?? 1) >= (meta?.totalPages ?? 1)}
              className="rounded border border-slate-200 p-1.5 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Edit Customer</h3>
            <p className="mt-1 text-sm text-slate-500">Update profile and access role.</p>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Name
                </span>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Name"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Email
                </span>
                <input
                  type="email"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="Email"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Role
                </span>
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value as Role.USER | Role.ADMIN }))
                  }
                >
                  <option value={Role.USER}>USER</option>
                  <option value={Role.ADMIN}>ADMIN</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Phone
                </span>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone"
                />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Date of Birth
                </span>
                <input
                  type="date"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.dob}
                  onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  updateUser.mutate({
                    id: editing.id,
                    name: form.name,
                    email: form.email,
                    role: form.role as Role.USER | Role.ADMIN,
                    phone: form.phone,
                    dob: form.dob,
                  })
                }
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
