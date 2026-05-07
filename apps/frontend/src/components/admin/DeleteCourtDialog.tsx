'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeleteCourt } from '@/hooks/useAdminCourts';
import type { Court } from '@/types';

// ==================== TYPES ====================

interface DeleteCourtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  court: Court;
}

// ==================== COMPONENT ====================

export function DeleteCourtDialog({ open, onOpenChange, court }: DeleteCourtDialogProps) {
  const { mutate: deleteCourt, isPending } = useDeleteCourt();

  if (!open) return null;

  const handleConfirm = () => {
    deleteCourt(court.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-court-title"
      aria-describedby="delete-court-desc"
    >
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-red-100 p-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
        </div>

        {/* Title */}
        <h2
          id="delete-court-title"
          className="mb-2 text-center text-xl font-semibold text-gray-900"
        >
          Xác nhận xóa sân
        </h2>

        {/* Description */}
        <p id="delete-court-desc" className="mb-6 text-center text-sm text-gray-600">
          Bạn có chắc muốn xóa sân <span className="font-semibold text-gray-900">{court.name}</span>
          ? <span className="text-red-600">Hành động này không thể hoàn tác.</span>
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="flex-1"
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {isPending ? 'Đang xóa...' : 'Xác nhận xóa'}
          </Button>
        </div>
      </div>
    </div>
  );
}
