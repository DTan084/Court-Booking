'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import {
  PaymentStatus,
  useManualReviewAction,
  useManualReviewList,
  usePaymentLookup,
  useReconcilePayment,
  useRefundPayment,
} from '@/hooks/usePayments';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

const limit = 10;

export default function AdminPaymentsPage() {
  const [providerOrderId, setProviderOrderId] = useState('');
  const [status, setStatus] = useState<'ALL' | PaymentStatus>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [lookupInput, setLookupInput] = useState('');
  const [lookupValue, setLookupValue] = useState('');
  const [actionNote, setActionNote] = useState('');

  const query = useMemo(
    () => ({
      page,
      limit,
      status: status === 'ALL' ? undefined : status,
      providerOrderId: providerOrderId.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [page, status, providerOrderId, dateFrom, dateTo],
  );

  const { data, isLoading, refetch } = useManualReviewList(query);
  const lookup = usePaymentLookup(
    { providerOrderId: lookupValue || undefined },
    Boolean(lookupValue),
  );
  const reconcileMutation = useReconcilePayment();
  const refundMutation = useRefundPayment();
  const manualAction = useManualReviewAction();

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = total === 0 ? 0 : Math.min(start + rows.length - 1, total);

  return (
    <AdminShell
      title="Payments Console"
      subtitle="Monitor payment state, reconcile stuck transactions, and resolve manual-review queue."
    >
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_160px_160px_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={providerOrderId}
              onChange={(e) => {
                setProviderOrderId(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by providerOrderId..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as 'ALL' | PaymentStatus);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          >
            <option value="ALL">All status</option>
            <option value="RECONCILING">RECONCILING</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          />

          <Button className="gap-2 bg-[#944a00] hover:bg-[#7f3f00]" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-700">Lookup Payment</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={lookupInput}
            onChange={(e) => setLookupInput(e.target.value)}
            placeholder="Provider Order ID..."
            className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <Button onClick={() => setLookupValue(lookupInput.trim())}>Lookup</Button>
        </div>
        {lookup.data && (
          <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3 text-xs">
            <p>
              Payment ID: <span className="font-mono">{lookup.data.paymentId}</span>
            </p>
            <p>
              Status: <span className="font-semibold">{lookup.data.paymentStatus}</span> | Booking:{' '}
              <span className="font-semibold">{lookup.data.bookingStatus ?? 'N/A'}</span>
            </p>
            <p>
              Provider Order:{' '}
              <span className="font-mono">{lookup.data.providerOrderId ?? 'N/A'}</span> | Txn:{' '}
              <span className="font-mono">{lookup.data.providerTxnId ?? 'N/A'}</span>
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-4">Payment</th>
              <th className="px-6 py-4">Booking</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Manual Review</th>
              <th className="px-6 py-4">Last Reconcile</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                  Loading payment queue...
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                  No manual-review payments found.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 align-top">
                <td className="px-6 py-4">
                  <div className="font-mono text-xs">{row.id}</div>
                  <div className="text-xs text-slate-500">
                    Order: {row.providerOrderId ?? 'N/A'}
                  </div>
                  <div className="text-xs text-slate-500">Txn: {row.providerTxnId ?? 'N/A'}</div>
                </td>
                <td className="px-6 py-4 font-mono text-xs">{row.bookingId}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">
                    {row.paymentStatus}
                  </span>
                </td>
                <td className="px-6 py-4">{formatCurrency(row.amount)}</td>
                <td className="px-6 py-4">
                  <div className="text-xs font-semibold text-slate-800">{row.reason}</div>
                  <div className="text-xs text-slate-500">Attempts: {row.attemptCount}</div>
                  <div className="text-xs text-slate-500">
                    At: {new Date(row.manualReviewAt).toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs">
                  <div>
                    {row.lastReconcileAt ? new Date(row.lastReconcileAt).toLocaleString() : 'N/A'}
                  </div>
                  {row.lastReconcileError && (
                    <div className="mt-1 max-w-xs text-rose-600">{row.lastReconcileError}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex flex-col items-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reconcileMutation.mutate(row.id)}
                      disabled={reconcileMutation.isPending}
                    >
                      Reconcile now
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          manualAction.mutate({
                            paymentId: row.id,
                            action: 'REQUEUE',
                            note: actionNote || undefined,
                          })
                        }
                        disabled={manualAction.isPending}
                      >
                        Requeue
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          manualAction.mutate({
                            paymentId: row.id,
                            action: 'RESOLVE',
                            note: actionNote || undefined,
                          })
                        }
                        disabled={manualAction.isPending}
                      >
                        Resolve
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      className="bg-rose-600 hover:bg-rose-700"
                      onClick={() => refundMutation.mutate({ paymentId: row.id })}
                      disabled={refundMutation.isPending}
                    >
                      Refund
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-8 py-4">
          <p className="text-xs font-medium text-slate-500">
            Showing {start}-{end} of {total.toLocaleString('vi-VN')} rows
          </p>
          <div className="flex items-center gap-3">
            <input
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="Action note (optional)"
              className="w-56 rounded border border-slate-300 px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded border border-slate-200 p-1.5 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(meta?.totalPages ?? 1, p + 1))}
              disabled={page >= (meta?.totalPages ?? 1)}
              className="rounded border border-slate-200 p-1.5 disabled:cursor-not-allowed disabled:opacity-50"
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
