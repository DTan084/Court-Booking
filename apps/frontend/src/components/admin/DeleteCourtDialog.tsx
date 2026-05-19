'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeleteCourt } from '@/hooks/useAdminCourts';
import type { Court } from '@/types';

interface DeleteCourtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  court: Court;
}

export function DeleteCourtDialog({ open, onOpenChange, court }: DeleteCourtDialogProps) {
  const { mutate: deleteCourt, isPending } = useDeleteCourt();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-5 flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <h2 className="mb-4 text-center text-4 font-bold text-slate-900">Confirm Court Deletion</h2>
        <p className="mb-8 text-center text-2 text-slate-600">
          Are you sure you want to delete court{' '}
          <span className="font-semibold text-slate-900">{court.name}</span>?{' '}
          <span className="text-red-500">
            This action cannot be undone and will automatically cancel all future bookings (SYSTEM
            CANCELLED).
          </span>
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            disabled={isPending}
            onClick={() =>
              deleteCourt(court.id, {
                onSuccess: () => onOpenChange(false),
              })
            }
          >
            {isPending ? 'Deleting...' : 'Confirm Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}
