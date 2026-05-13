'use client';

import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCourts } from '@/hooks/useCourts';
import { CourtTable } from '@/components/admin/CourtTable';
import { CourtFormDialog } from '@/components/admin/CourtFormDialog';
import { DeleteCourtDialog } from '@/components/admin/DeleteCourtDialog';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import { AdminShell } from '@/components/admin/AdminShell';
import type { Court } from '@/types';

export default function AdminCourtsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editCourt, setEditCourt] = useState<Court | null>(null);
  const [deleteCourt, setDeleteCourt] = useState<Court | null>(null);
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data, isLoading } = useCourts({ page: 1, limit: 50 });
  const courts = useMemo(() => data?.data ?? [], [data]);

  const filteredCourts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return courts.filter((court) => {
      const matchesKeyword =
        keyword.length === 0 ||
        court.name.toLowerCase().includes(keyword) ||
        court.address.toLowerCase().includes(keyword) ||
        (court.district ?? '').toLowerCase().includes(keyword);
      const matchesSport = sportFilter === 'ALL' || String(court.sportType) === sportFilter;
      const matchesStatus = statusFilter === 'ALL' || String(court.status) === statusFilter;
      return matchesKeyword && matchesSport && matchesStatus;
    });
  }, [courts, search, sportFilter, statusFilter]);

  const sportOptions = Array.from(new Set(courts.map((court) => String(court.sportType))));
  const statusOptions = Array.from(new Set(courts.map((court) => String(court.status))));

  return (
    <AdminShell title="Manage Courts" subtitle="Overview of all active facilities and courts.">
      <div className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_180px_180px_auto] lg:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by court, address, district..."
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          />
        </div>

        <select
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
        >
          <option value="ALL">All sports</option>
          {sportOptions.map((sport) => (
            <option key={sport} value={sport}>
              {sport}
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

      {isLoading ? (
        <SkeletonCard count={6} />
      ) : (
        <CourtTable
          courts={filteredCourts}
          onEdit={(court) => setEditCourt(court)}
          onDelete={(court) => setDeleteCourt(court)}
        />
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
    </AdminShell>
  );
}
