'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useCourt } from '@/hooks/useCourt';
import {
  useAddCourtImage,
  useDeleteCourtImage,
  useReorderCourtImages,
} from '@/hooks/useAdminCourts';
import { Button } from '@/components/ui/button';
import { DoubleConfirmationDialog } from '@/components/shared/double-confirmation-dialog';

export function CourtImageManager({ courtId }: { courtId: string }) {
  const { data: court } = useCourt(courtId);
  const { mutate: addImage, isPending: isAdding } = useAddCourtImage(courtId);
  const { mutate: deleteImage } = useDeleteCourtImage(courtId);
  const { mutate: reorder } = useReorderCourtImages(courtId);
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const images = useMemo(
    () => [...(court?.images ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
    [court?.images],
  );

  const submitReorder = (nextImages: typeof images) => {
    reorder(nextImages.map((img, idx) => ({ imageId: img.id, displayOrder: idx })));
  };

  const onMove = (index: number, dir: -1 | 1) => {
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    const reordered = [...images];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    submitReorder(reordered);
  };

  const onDropImage = (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) return;
    const reordered = [...images];
    const [dragged] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, dragged);
    submitReorder(reordered);
    setDragIndex(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-4">
        <h3 className="mb-3 font-semibold">Thêm ảnh mới</h3>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded-md border px-3 py-2"
          />
          <input
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Alt text (optional)"
            className="rounded-md border px-3 py-2"
          />
          <Button
            disabled={!file || isAdding}
            onClick={() => {
              if (!file) return;
              addImage({ file, altText: altText || undefined, displayOrder: images.length });
              setFile(null);
              setAltText('');
            }}
          >
            Thêm ảnh
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {images.map((img, idx) => (
          <div
            key={img.id}
            className="rounded-lg border bg-white p-3"
            draggable
            onDragStart={() => setDragIndex(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDropImage(idx)}
          >
            <Image
              src={img.url}
              alt={img.altText ?? `Court image ${idx + 1}`}
              width={400}
              height={220}
              className="mb-3 h-36 w-full rounded object-cover"
            />
            <p className="mb-2 truncate text-xs text-slate-500">{img.url}</p>
            <p className="mb-3 text-xs text-slate-400">Kéo thả để sắp xếp</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onMove(idx, -1)}
                disabled={idx === 0}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onMove(idx, 1)}
                disabled={idx === images.length - 1}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button variant="destructive" size="icon" onClick={() => setDeleteId(img.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <DoubleConfirmationDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Bạn có chắc muốn xóa hình ảnh này?"
        description="Hành động này không thể hoàn tác."
        confirmText="Xóa ảnh"
        variant="destructive"
        onConfirm={() => {
          if (deleteId) deleteImage(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
