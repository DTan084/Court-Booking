'use client';

import { useState } from 'react';
import { Plus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCourts } from '@/hooks/useCourts';
import { CourtTable } from '@/components/admin/CourtTable';
import { CourtFormDialog } from '@/components/admin/CourtFormDialog';
import { DeleteCourtDialog } from '@/components/admin/DeleteCourtDialog';
import { SkeletonCard } from '@/components/shared/SkeletonCard';
import type { Court } from '@/types';

// ==================== COMPONENT ====================

export default function AdminCourtsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editCourt, setEditCourt] = useState<Court | null>(null);
  const [deleteCourt, setDeleteCourt] = useState<Court | null>(null);

  // Fetch all courts (admin view — no pagination needed for management)
  const { data, isLoading } = useCourts({ page: 1, limit: 100 });
  const courts = data?.data ?? [];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quản lý sân</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? '...' : `${courts.length} sân`}
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Tạo sân mới
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <SkeletonCard count={6} />
      ) : (
        <CourtTable
          courts={courts}
          onEdit={(court) => setEditCourt(court)}
          onDelete={(court) => setDeleteCourt(court)}
        />
      )}

      {/* Create Dialog */}
      <CourtFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} mode="create" />

      {/* Edit Dialog */}
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

      {/* Delete Dialog */}
      {deleteCourt && (
        <DeleteCourtDialog
          open={!!deleteCourt}
          onOpenChange={(open) => {
            if (!open) setDeleteCourt(null);
          }}
          court={deleteCourt}
        />
      )}
    </div>
  );
}
