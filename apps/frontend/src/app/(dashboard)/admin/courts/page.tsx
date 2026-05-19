'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCourts } from '@/hooks/useCourts';
import { CourtTable } from '@/components/admin/CourtTable';
import { CourtFormDialog } from '@/components/admin/CourtFormDialog';
import { DeleteCourtDialog } from '@/components/admin/DeleteCourtDialog';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { AdminShell } from '@/components/admin/AdminShell';
import { useSportTypes } from '@/hooks/useSportTypes';
import type { Court } from '@/types';
import { CourtStatus } from '@court-booking/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useHardDeleteCourt, useRestoreCourt } from '@/hooks/useAdminCourts';

const ACTIVE_VIEW = CourtStatus.ACTIVE;

export default function AdminCourtsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editCourt, setEditCourt] = useState<Court | null>(null);
  const [deleteCourt, setDeleteCourt] = useState<Court | null>(null);
  const [pendingHardDeleteCourt, setPendingHardDeleteCourt] = useState<
    (Court & { deletedAt?: string | null }) | null
  >(null);
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<typeof ACTIVE_VIEW | 'DELETED'>(ACTIVE_VIEW);
  const [page, setPage] = useState(1);
  const limit = 12;

  const query = useMemo(
    () => ({
      page,
      limit,
      name: search.trim() || undefined,
      sportTypeId: sportFilter === 'ALL' ? undefined : [sportFilter],
      includeInactive: true,
    }),
    [page, search, sportFilter],
  );
  const { data, isLoading } = useCourts(query);
  const { data: deletedData, isLoading: deletedLoading } = useQuery({
    queryKey: ['courts', 'deleted', page],
    queryFn: async () => {
      const res = await api.get('/courts/admin/deleted', { params: { page, limit } });
      const payload = res.data;
      if (Array.isArray(payload)) {
        return {
          data: payload,
          meta: {
            page,
            limit,
            total: payload.length,
            totalPages: 1,
          },
        };
      }
      if (payload?.data && payload?.meta) return payload;
      return {
        data: payload?.data ?? [],
        meta: payload?.meta ?? { page, limit, total: 0, totalPages: 1 },
      };
    },
    enabled: viewMode === 'DELETED',
  });
  const { mutate: restoreCourt } = useRestoreCourt();
  const { mutate: hardDeleteCourt } = useHardDeleteCourt();
  const { data: sportTypes = [] } = useSportTypes();
  const courts = useMemo(() => data?.data ?? [], [data]);
  const deletedCourts = useMemo(() => {
    const rows = deletedData?.data;
    if (Array.isArray(rows)) return rows;
    if (rows && Array.isArray(rows.data)) return rows.data;
    return [];
  }, [deletedData]);

  const filteredCourts = useMemo(() => {
    return courts.filter((court) => {
      const matchesStatus = statusFilter === 'ALL' || String(court.status) === statusFilter;
      return matchesStatus;
    });
  }, [courts, statusFilter]);

  const statusOptions = Array.from(new Set(courts.map((court) => String(court.status))));
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const start = total === 0 ? 0 : (meta!.page - 1) * (meta!.limit ?? limit) + 1;
  const end = total === 0 ? 0 : Math.min(start + filteredCourts.length - 1, total);
  const activeCount = filteredCourts.filter((c) => c.status === CourtStatus.ACTIVE).length;
  const inactiveCount = filteredCourts.length - activeCount;
  const onlineVisibleCount = filteredCourts.filter((c) => c.status === CourtStatus.ACTIVE).length;
  const onlineVisibleRate =
    filteredCourts.length > 0 ? Math.round((onlineVisibleCount / filteredCourts.length) * 100) : 0;

  return (
    <AdminShell title="Manage Courts" subtitle="Overview of all active facilities and courts.">
      <div className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_180px_180px_auto] lg:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by court, address, district..."
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          />
        </div>

        <select
          value={sportFilter}
          onChange={(e) => {
            setSportFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
        >
          <option value="ALL">All sports</option>
          {sportTypes.map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
        >
          <option value="ALL">All status</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="gap-2 bg-[#944a00] hover:bg-[#7f3f00]"
        >
          <Plus className="h-4 w-4" />
          Create New Court
        </Button>
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Courts
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{total}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Active Status
          </p>
          <p className="mt-2 text-3xl font-black text-[#944a00]">{activeCount}</p>
          <p className="mt-1 text-xs text-slate-500">{inactiveCount} inactive</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Online Visibility
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{onlineVisibleRate}%</p>
          <p className="mt-1 text-xs text-slate-500">
            {onlineVisibleCount}/{Math.max(filteredCourts.length, 1)} active on this page
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sport Types
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{sportTypes.length}</p>
        </article>
      </div>

      <div className="mb-4 flex gap-2">
        <Button
          variant={viewMode === ACTIVE_VIEW ? 'default' : 'outline'}
          onClick={() => setViewMode(ACTIVE_VIEW)}
        >
          Active Courts
        </Button>
        <Button
          variant={viewMode === 'DELETED' ? 'default' : 'outline'}
          onClick={() => setViewMode('DELETED')}
        >
          Soft Deleted
        </Button>
      </div>

      {viewMode === ACTIVE_VIEW && isLoading ? (
        <SkeletonCard count={6} />
      ) : viewMode === ACTIVE_VIEW ? (
        <>
          <CourtTable
            courts={filteredCourts}
            onEdit={(court) => setEditCourt(court)}
            onDelete={(court) => setDeleteCourt(court)}
          />
          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-4">
            <p className="text-xs font-medium text-slate-500">
              Showing {start}-{end} of {total.toLocaleString('vi-VN')} results
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={(meta?.page ?? 1) <= 1}
                className="rounded border border-slate-200 p-1.5 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(meta?.totalPages ?? 1, p + 1))}
                disabled={(meta?.page ?? 1) >= (meta?.totalPages ?? 1)}
                className="rounded border border-slate-200 p-1.5 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      ) : deletedLoading ? (
        <SkeletonCard count={4} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4">Deleted At</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deletedCourts.map((court: Court & { deletedAt?: string | null }) => (
                <tr key={court.id} className="border-t border-slate-100">
                  <td className="px-6 py-4 font-semibold">{court.name}</td>
                  <td className="px-6 py-4 text-slate-600">{court.address}</td>
                  <td className="px-6 py-4 text-slate-600">{court.deletedAt ?? '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => restoreCourt(court.id)}>
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        className="bg-rose-600 hover:bg-rose-700"
                        onClick={() => setPendingHardDeleteCourt(court)}
                      >
                        Delete Permanently
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
            <p className="text-xs font-medium text-slate-500">
              Showing{' '}
              {deletedData?.meta?.total
                ? `${(deletedData.meta.page - 1) * deletedData.meta.limit + 1}-${Math.min(
                    deletedData.meta.page * deletedData.meta.limit,
                    deletedData.meta.total,
                  )}`
                : '0-0'}{' '}
              of {(deletedData?.meta?.total ?? 0).toLocaleString('vi-VN')} deleted courts
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={(deletedData?.meta?.page ?? 1) <= 1}
                className="rounded border border-slate-200 p-1.5 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(deletedData?.meta?.totalPages ?? 1, p + 1))}
                disabled={(deletedData?.meta?.page ?? 1) >= (deletedData?.meta?.totalPages ?? 1)}
                className="rounded border border-slate-200 p-1.5 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <CourtFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} mode="create" />

      {editCourt && (
        <CourtFormDialog
          open={!!editCourt}
          onOpenChange={(open) => {
            if (!open) setEditCourt(null);
          }}
          court={editCourt}
          mode="edit"
        />
      )}

      {deleteCourt && (
        <DeleteCourtDialog
          open={!!deleteCourt}
          onOpenChange={(open) => {
            if (!open) setDeleteCourt(null);
          }}
          court={deleteCourt}
        />
      )}

      <Dialog
        open={!!pendingHardDeleteCourt}
        onOpenChange={(open) => {
          if (!open) setPendingHardDeleteCourt(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Permanently?</DialogTitle>
            <DialogDescription>
              Court{' '}
              <span className="font-semibold text-slate-900">{pendingHardDeleteCourt?.name}</span>{' '}
              will be permanently removed and cannot be restored.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingHardDeleteCourt(null)}>
              Cancel
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => {
                if (!pendingHardDeleteCourt) return;
                hardDeleteCourt(pendingHardDeleteCourt.id, {
                  onSuccess: () => setPendingHardDeleteCourt(null),
                });
              }}
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
