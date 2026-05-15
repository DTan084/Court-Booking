'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CalendarCheck2, ChevronLeft, ChevronRight, Clock3, Plus, Search } from 'lucide-react';
import { BookingSource, BookingStatus, CancelledBy } from '@court-booking/shared';
import { AdminShell } from '@/components/admin/AdminShell';
import { MetricCard } from '@/components/admin/MetricCard';
import { Button } from '@/components/ui/button';
import { useAdminBookings } from '@/hooks/useBookings';
import { useSportTypes } from '@/hooks/useSportTypes';
import { api } from '@/lib/api';
import { formatDateByTimezone, formatTimeByTimezone } from '@/lib/datetime';
import { formatCurrency } from '@/lib/utils';

export default function AdminBookingsPage() {
  const timezone = 'Asia/Ho_Chi_Minh';
  const locale = 'vi-VN';
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'ALL' | BookingStatus | 'REFUND_PENDING'>('ALL');
  const [source, setSource] = useState<'ALL' | BookingSource>('ALL');
  const [page, setPage] = useState(1);
  const [day, setDay] = useState('');
  const [sportTypeId, setSportTypeId] = useState('ALL');
  const [refundModal, setRefundModal] = useState<{
    id: string;
    amount: number;
    name: string;
  } | null>(null);
  const [editModal, setEditModal] = useState<{
    id: string;
    status: BookingStatus;
    guestName: string;
    guestPhone: string;
    note: string;
    paymentMethod: string;
    cancelledReason: string;
    cancellationNote: string;
    cancelledBy: CancelledBy;
  } | null>(null);
  const limit = 10;
  const { data: sportTypes = [] } = useSportTypes();
  const statusView: 'REFUND_PENDING' | 'CANCELLED_GROUP' | undefined =
    status === 'REFUND_PENDING'
      ? 'REFUND_PENDING'
      : status === BookingStatus.CANCELLED
        ? 'CANCELLED_GROUP'
        : undefined;

  const query = useMemo(
    () => ({
      page,
      limit,
      status:
        status === 'ALL' || status === 'REFUND_PENDING' || status === BookingStatus.CANCELLED
          ? undefined
          : (status as BookingStatus),
      statusView,
      bookingSource: source === 'ALL' ? undefined : source,
      search: keyword.trim() ? keyword.trim() : undefined,
      day: day || undefined,
      sportTypeId: sportTypeId === 'ALL' ? undefined : sportTypeId,
    }),
    [status, statusView, source, page, keyword, day, sportTypeId],
  );
  const { data, refetch } = useAdminBookings(query);
  type BookingWithPayment = (typeof data extends { data: infer T } ? T : never)[number] & {
    paymentMethod?: string | null;
  };
  const rows = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = total === 0 ? 0 : Math.min(start + rows.length - 1, total);
  const isCancelledLike = (statusValue: BookingStatus) =>
    statusValue === BookingStatus.CANCELLED || statusValue === BookingStatus.EXPIRED;
  const isRefundedState = (statusValue: BookingStatus, refundedAt?: string | null) =>
    isCancelledLike(statusValue) && !!refundedAt;
  const isRefundPending = (
    statusValue: BookingStatus,
    paidAt?: string | null,
    refundedAt?: string | null,
    refundAmount?: number | null,
  ) =>
    isCancelledLike(statusValue) &&
    (!!paidAt || Number(refundAmount ?? 0) > 0) &&
    !isRefundedState(statusValue, refundedAt);
  const shouldShowCancelFields = (statusValue: BookingStatus) =>
    statusValue !== BookingStatus.COMPLETED && statusValue !== BookingStatus.EXPIRED;
  const resolvePaymentMethod = (
    row: (typeof rows)[number] & { payment_method?: string | null; paymentMethod?: string | null },
  ) => {
    const raw = row.paymentMethod ?? row.payment_method ?? null;
    const normalized = (raw ?? '').trim();
    if (normalized) return normalized;
    if (row.status === BookingStatus.CONFIRMED || row.status === BookingStatus.COMPLETED) {
      return 'AUTO';
    }
    return 'N/A';
  };

  return (
    <AdminShell
      title="Booking Management"
      subtitle="Manage and monitor all reservations across courts."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total"
          value={String(data?.summary?.total ?? total)}
          icon={<CalendarCheck2 className="h-5 w-5" />}
        />
        <MetricCard
          title="Confirmed"
          value={`${data?.summary?.confirmed ?? 0}/${data?.summary?.confirmedOrCompleted ?? 0}`}
          icon={<Clock3 className="h-5 w-5" />}
        />
        <MetricCard
          title="Admin/Walk-in"
          value={String(data?.summary?.adminWalkIn ?? 0)}
          icon={<CalendarCheck2 className="h-5 w-5" />}
        />
        <MetricCard
          title="Cancelled"
          value={String(data?.summary?.cancelled ?? 0)}
          icon={<Clock3 className="h-5 w-5" />}
        />
      </div>
      <div className="mt-2 grid gap-4 md:grid-cols-2">
        <MetricCard
          title="Live Sessions"
          value={String(data?.summary?.liveSessions ?? 0)}
          icon={<Clock3 className="h-5 w-5" />}
        />
        <MetricCard
          title="Daily Revenue"
          value={formatCurrency(data?.summary?.dailyRevenue ?? 0)}
          icon={<CalendarCheck2 className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_160px_180px_180px_180px_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              placeholder="Search booking, guest, court..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as BookingStatus | 'ALL' | 'REFUND_PENDING');
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          >
            <option value="ALL">All status</option>
            <option value={BookingStatus.PENDING_PAYMENT}>{BookingStatus.PENDING_PAYMENT}</option>
            <option value={BookingStatus.CONFIRMED}>{BookingStatus.CONFIRMED}</option>
            <option value={BookingStatus.CANCELLED}>{BookingStatus.CANCELLED}</option>
            <option value={BookingStatus.COMPLETED}>{BookingStatus.COMPLETED}</option>
            <option value="REFUND_PENDING">REFUND_PENDING</option>
          </select>
          <select
            value={sportTypeId}
            onChange={(e) => {
              setSportTypeId(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          >
            <option value="ALL">All sports</option>
            {sportTypes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={day}
            onChange={(e) => {
              setDay(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          />

          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value as 'ALL' | BookingSource);
              setPage(1);
            }}
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
              <th className="px-6 py-4">Date &amp; Time</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Source</th>
              <th className="px-6 py-4 text-right">Status &amp; Refund</th>
              <th className="px-6 py-4 text-right">Edit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const start = new Date(row.startTime);
              const end = new Date(row.endTime);
              const now = new Date();
              const sourceLabel = row.bookingSource === 'WALK_IN' ? 'WALK-IN' : row.bookingSource;
              const isLive =
                row.status === BookingStatus.CONFIRMED &&
                start.getTime() <= now.getTime() &&
                end.getTime() >= now.getTime();
              const displayStatus = isLive ? 'LIVE' : row.status;
              return (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-6 py-4 font-semibold">{row.id.slice(0, 8)}</td>
                  <td className="px-6 py-4">{row.court?.name ?? '-'}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">
                      {formatDateByTimezone(start, timezone, locale)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatTimeByTimezone(start, timezone, locale)} -{' '}
                      {formatTimeByTimezone(end, timezone, locale)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {(row as { customerName?: string }).customerName ?? row.guestName ?? '-'}
                  </td>
                  <td className="px-6 py-4 font-semibold">
                    {formatCurrency(Number(row.totalPrice))}
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      {sourceLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isRefundPending(row.status, row.paidAt, row.refundedAt, row.refundAmount) ? (
                      <button
                        className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold tracking-wide text-amber-800 transition-colors hover:bg-amber-100"
                        onClick={() =>
                          setRefundModal({
                            id: row.id,
                            amount: Number(row.totalPrice),
                            name:
                              (row as { customerName?: string }).customerName ??
                              row.guestName ??
                              'Customer',
                          })
                        }
                      >
                        REFUND_PENDING
                      </button>
                    ) : isRefundedState(row.status, row.refundedAt) ? (
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold tracking-wide text-emerald-700">
                        REFUNDED
                      </span>
                    ) : (
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${
                          isLive
                            ? 'border-emerald-400 bg-emerald-100 text-emerald-900'
                            : row.status === BookingStatus.CONFIRMED
                              ? 'border-blue-300 bg-blue-100 text-blue-800'
                              : row.status === BookingStatus.COMPLETED
                                ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                                : row.status === BookingStatus.PENDING_PAYMENT
                                  ? 'border-orange-300 bg-orange-100 text-orange-800'
                                  : row.status === BookingStatus.CANCELLED ||
                                      row.status === BookingStatus.EXPIRED
                                    ? 'border-rose-300 bg-rose-100 text-rose-800'
                                    : 'border-slate-300 bg-slate-100 text-slate-800'
                        }`}
                      >
                        {displayStatus}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      className="rounded border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-50"
                      onClick={() =>
                        setEditModal({
                          id: row.id,
                          status: row.status,
                          guestName: row.guestName ?? '',
                          guestPhone: row.guestPhone ?? '',
                          note: row.note ?? '',
                          paymentMethod: resolvePaymentMethod(
                            row as BookingWithPayment & { payment_method?: string | null },
                          ),
                          cancelledReason: row.cancelledReason ?? 'customer_request',
                          cancellationNote: row.cancellationNote ?? '',
                          cancelledBy: (row.cancelledBy as CancelledBy) ?? CancelledBy.ADMIN,
                        })
                      }
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-8 py-4">
          <p className="text-xs font-medium text-slate-500">
            Showing {start}-{end} of {total.toLocaleString('vi-VN')} bookings
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded border border-slate-200 p-1.5 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(meta?.totalPages ?? 1, p + 1))}
              disabled={page >= (meta?.totalPages ?? 1)}
              className="rounded border border-slate-200 p-1.5 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      {refundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Confirm Refund</h3>
            <p className="mt-2 text-sm text-slate-600">
              Mark booking of <span className="font-semibold">{refundModal.name}</span> as refunded?
            </p>
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Refund amount</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(refundModal.amount)}
                </span>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRefundModal(null)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  await api.patch(`/admin/bookings/${refundModal.id}/refund`, {
                    refundAmount: refundModal.amount,
                  });
                  setRefundModal(null);
                  await refetch();
                }}
              >
                Confirm Refunded
              </Button>
            </div>
          </div>
        </div>
      )}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Edit Booking</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Guest Name
                </span>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={editModal.guestName}
                  onChange={(e) =>
                    setEditModal((m) => (m ? { ...m, guestName: e.target.value } : m))
                  }
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Guest Phone
                </span>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={editModal.guestPhone}
                  onChange={(e) =>
                    setEditModal((m) => (m ? { ...m, guestPhone: e.target.value } : m))
                  }
                />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Payment Method
                </span>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={editModal.paymentMethod}
                  onChange={(e) =>
                    setEditModal((m) => (m ? { ...m, paymentMethod: e.target.value } : m))
                  }
                />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Note
                </span>
                <textarea
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  rows={3}
                  value={editModal.note}
                  onChange={(e) => setEditModal((m) => (m ? { ...m, note: e.target.value } : m))}
                />
              </label>
              {shouldShowCancelFields(editModal.status) && (
                <>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                      Cancel Reason
                    </span>
                    <input
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="customer_request / no_show / weather..."
                      value={editModal.cancelledReason}
                      onChange={(e) =>
                        setEditModal((m) => (m ? { ...m, cancelledReason: e.target.value } : m))
                      }
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                      Cancellation Note
                    </span>
                    <input
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={editModal.cancellationNote}
                      onChange={(e) =>
                        setEditModal((m) => (m ? { ...m, cancellationNote: e.target.value } : m))
                      }
                    />
                  </label>
                  <label className="text-sm md:col-span-2">
                    <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                      Cancelled By
                    </span>
                    <select
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      value={editModal.cancelledBy}
                      onChange={(e) =>
                        setEditModal((m) =>
                          m ? { ...m, cancelledBy: e.target.value as CancelledBy } : m,
                        )
                      }
                    >
                      <option value={CancelledBy.ADMIN}>ADMIN</option>
                      <option value={CancelledBy.SYSTEM}>SYSTEM</option>
                    </select>
                  </label>
                </>
              )}
            </div>
            <div className="mt-5 flex justify-between gap-2">
              <div>
                {editModal.status !== BookingStatus.CANCELLED &&
                  editModal.status !== BookingStatus.EXPIRED &&
                  editModal.status !== BookingStatus.COMPLETED && (
                    <Button
                      variant="outline"
                      className="border-rose-300 text-rose-700 hover:bg-rose-50"
                      onClick={async () => {
                        await api.patch(`/admin/bookings/${editModal.id}/cancel`, {
                          cancelledReason: editModal.cancelledReason || undefined,
                          cancellationNote: editModal.cancellationNote || undefined,
                          cancelledBy: editModal.cancelledBy,
                        });
                        setEditModal(null);
                        await refetch();
                      }}
                    >
                      Cancel Booking
                    </Button>
                  )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditModal(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    await api.patch(`/admin/bookings/${editModal.id}`, {
                      guestName: editModal.guestName || null,
                      guestPhone: editModal.guestPhone || null,
                      paymentMethod: editModal.paymentMethod || null,
                      note: editModal.note || null,
                      cancelledReason: editModal.cancelledReason || null,
                      cancellationNote: editModal.cancellationNote || null,
                      cancelledBy: editModal.cancelledBy || null,
                    });
                    setEditModal(null);
                    await refetch();
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
