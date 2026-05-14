'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { CourtStatus, CourtType } from '@court-booking/shared';
import { Button } from '@/components/ui/button';
import { useCreateCourt, useSyncCourtFeatures, useUpdateCourt } from '@/hooks/useAdminCourts';
import { useCourt } from '@/hooks/useCourt';
import { useFeatures } from '@/hooks/useFeatures';
import { useSportTypes } from '@/hooks/useSportTypes';
import { resolveFeatureIcon } from '@/lib/feature-icons';
import type { Court } from '@/types';

const courtSchema = z.object({
  name: z.string().min(2, 'Ten san toi thieu 2 ky tu'),
  sportTypeId: z.string().uuid('Sport type is required'),
  courtType: z.nativeEnum(CourtType),
  address: z.string().min(5, 'Dia chi toi thieu 5 ky tu'),
  pricePerHour: z.number().positive('Gia phai lon hon 0'),
  description: z.string().max(5000).optional(),
  featureIds: z.array(z.string().uuid()).optional().default([]),
  status: z.nativeEnum(CourtStatus).optional(),
});

type CourtFormData = z.infer<typeof courtSchema>;

interface CourtFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  court?: Court;
  mode: 'create' | 'edit';
}

export function CourtFormDialog({ open, onOpenChange, court, mode }: CourtFormDialogProps) {
  const { mutate: createCourt, isPending: isCreating } = useCreateCourt();
  const { mutate: updateCourt, isPending: isUpdating } = useUpdateCourt();
  const { mutateAsync: syncCourtFeatures } = useSyncCourtFeatures();
  const { data: sportTypes = [] } = useSportTypes();
  const { data: features = [] } = useFeatures();
  const { data: courtDetail } = useCourt(
    court?.id ?? '',
    open && mode === 'edit' && Boolean(court?.id),
  );

  const isPending = isCreating || isUpdating;
  const [preview, setPreview] = useState(false);

  const defaultSportTypeId = useMemo(() => sportTypes[0]?.id ?? '', [sportTypes]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CourtFormData>({
    resolver: zodResolver(courtSchema),
    defaultValues: {
      name: '',
      sportTypeId: '',
      courtType: CourtType.OUTDOOR,
      address: '',
      pricePerHour: 0,
      description: '',
      featureIds: [],
      status: CourtStatus.ACTIVE,
    },
  });

  const featureIds = watch('featureIds') ?? [];
  const description = watch('description') ?? '';
  const editingCourt = mode === 'edit' ? (courtDetail ?? court) : undefined;

  useEffect(() => {
    if (!open) return;

    if (editingCourt && mode === 'edit') {
      reset({
        name: editingCourt.name,
        sportTypeId: editingCourt.sportTypeId,
        courtType: editingCourt.courtType,
        address: editingCourt.address,
        pricePerHour: Number(editingCourt.pricePerHour),
        description: editingCourt.description ?? '',
        featureIds: (editingCourt.featureItems ?? []).map((item) => item.id),
        status: editingCourt.status,
      });
      return;
    }

    reset({
      name: '',
      sportTypeId: defaultSportTypeId,
      courtType: CourtType.OUTDOOR,
      address: '',
      pricePerHour: 0,
      description: '',
      featureIds: [],
      status: CourtStatus.ACTIVE,
    });
  }, [open, editingCourt, mode, reset, defaultSportTypeId]);

  const toggleFeature = (featureId: string) => {
    const next = featureIds.includes(featureId)
      ? featureIds.filter((id) => id !== featureId)
      : [...featureIds, featureId];
    setValue('featureIds', next);
  };

  const onSubmit = (data: CourtFormData) => {
    const { featureIds: nextFeatureIds, ...courtPayload } = data;

    if (mode === 'create') {
      createCourt(courtPayload, {
        onSuccess: async (createdCourt) => {
          await syncCourtFeatures({ courtId: createdCourt.id, featureIds: nextFeatureIds });
          onOpenChange(false);
        },
      });
      return;
    }

    if (!court) return;
    updateCourt(
      { id: court.id, dto: courtPayload },
      {
        onSuccess: async () => {
          await syncCourtFeatures({ courtId: court.id, featureIds: nextFeatureIds });
          onOpenChange(false);
        },
      },
    );
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {mode === 'create' ? 'Tao san moi' : 'Chinh sua san'}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="rounded-lg p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input
            {...register('name')}
            placeholder="Ten san"
            className="w-full rounded-md border px-3 py-2"
          />
          {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}

          <div className="grid grid-cols-2 gap-3">
            <select {...register('sportTypeId')} className="rounded-md border px-3 py-2">
              {sportTypes.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
            <select {...register('courtType')} className="rounded-md border px-3 py-2">
              <option value={CourtType.INDOOR}>Trong nha</option>
              <option value={CourtType.OUTDOOR}>Ngoai troi</option>
            </select>
          </div>

          <input
            {...register('address')}
            placeholder="Dia chi"
            className="w-full rounded-md border px-3 py-2"
          />
          <input
            type="number"
            {...register('pricePerHour', { valueAsNumber: true })}
            placeholder="Gia/gio"
            className="w-full rounded-md border px-3 py-2"
          />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Mo ta san</span>
              <button
                type="button"
                className="text-sm text-[#944a00]"
                onClick={() => setPreview((v) => !v)}
              >
                {preview ? 'Nhap' : 'Xem truoc'}
              </button>
            </div>
            {!preview ? (
              <textarea
                {...register('description')}
                rows={5}
                placeholder="Nhap mo ta san (ho tro Markdown)..."
                className="w-full rounded-md border px-3 py-2"
              />
            ) : (
              <div className="prose min-h-[120px] rounded-md border p-3">
                <ReactMarkdown>{description || '_Chua co noi dung_'}</ReactMarkdown>
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">{description.length}/5000</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Tien ich san</p>
            <div className="grid grid-cols-2 gap-2">
              {features.map((feature) => (
                <label key={feature.id} className="flex items-center gap-2 text-sm">
                  {(() => {
                    const Icon = resolveFeatureIcon({ icon: feature.icon, name: feature.name });
                    return Icon ? <Icon className="h-3.5 w-3.5 text-slate-500" /> : null;
                  })()}
                  <input
                    type="checkbox"
                    checked={featureIds.includes(feature.id)}
                    onChange={() => toggleFeature(feature.id)}
                  />
                  <span>{feature.name}</span>
                </label>
              ))}
            </div>
          </div>

          {mode === 'edit' && (
            <select {...register('status')} className="w-full rounded-md border px-3 py-2">
              <option value={CourtStatus.ACTIVE}>Hoat dong</option>
              <option value={CourtStatus.INACTIVE}>Tam ngung</option>
            </select>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="flex-1"
            >
              Huy
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? 'Dang xu ly...' : mode === 'create' ? 'Tao san' : 'Cap nhat'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
