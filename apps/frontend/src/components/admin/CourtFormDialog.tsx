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
  name: z.string().min(2, 'Court name must be at least 2 characters'),
  sportTypeId: z.string().uuid('Sport type is required'),
  courtType: z.nativeEnum(CourtType),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  district: z.string().max(100).optional(),
  pricePerHour: z.number().positive('Price must be greater than 0'),
  maxPlayers: z.number().int().min(1).optional().nullable(),
  isFeatured: z.boolean().optional(),
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
  const [pendingSubmit, setPendingSubmit] = useState<CourtFormData | null>(null);

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
      district: '',
      pricePerHour: 0,
      maxPlayers: null,
      isFeatured: false,
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
        district: editingCourt.district ?? '',
        pricePerHour: Number(editingCourt.pricePerHour),
        maxPlayers: editingCourt.maxPlayers ?? null,
        isFeatured: editingCourt.isFeatured ?? false,
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
      district: '',
      pricePerHour: 0,
      maxPlayers: null,
      isFeatured: false,
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

  const doSubmit = (data: CourtFormData) => {
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

  const onSubmit = (data: CourtFormData) => setPendingSubmit(data);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {mode === 'create' ? 'Create New Court' : 'Edit Court'}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="rounded-lg p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <section className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              Basic Info
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Court Name
                </span>
                <input
                  {...register('name')}
                  placeholder="Court Name"
                  className="w-full rounded-md border px-3 py-2"
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Sport Type
                </span>
                <select {...register('sportTypeId')} className="w-full rounded-md border px-3 py-2">
                  {sportTypes.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Court Type
                </span>
                <select {...register('courtType')} className="w-full rounded-md border px-3 py-2">
                  <option value={CourtType.INDOOR}>Indoor</option>
                  <option value={CourtType.OUTDOOR}>Outdoor</option>
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              Pricing & Capacity
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Price per Hour
                </span>
                <input
                  type="number"
                  {...register('pricePerHour', { valueAsNumber: true })}
                  placeholder="Price per hour"
                  className="w-full rounded-md border px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Max Players
                </span>
                <input
                  type="number"
                  {...register('maxPlayers', { valueAsNumber: true })}
                  placeholder="Max players"
                  className="w-full rounded-md border px-3 py-2"
                />
              </label>
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" {...register('isFeatured')} />
                Featured
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              Location
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Address
                </span>
                <input
                  {...register('address')}
                  placeholder="Address"
                  className="w-full rounded-md border px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  District
                </span>
                <input
                  {...register('district')}
                  placeholder="District"
                  className="w-full rounded-md border px-3 py-2"
                />
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              Description
            </h3>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Court Description</span>
                <button
                  type="button"
                  className="text-sm text-[#944a00]"
                  onClick={() => setPreview((v) => !v)}
                >
                  {preview ? 'Edit' : 'Preview'}
                </button>
              </div>
              {!preview ? (
                <textarea
                  {...register('description')}
                  rows={5}
                  placeholder="Enter court description (Markdown supported)..."
                  className="w-full rounded-md border px-3 py-2"
                />
              ) : (
                <div className="prose min-h-[120px] rounded-md border p-3">
                  <ReactMarkdown>{description || '_No content_'}</ReactMarkdown>
                </div>
              )}
              <p className="mt-1 text-xs text-slate-500">{description.length}/5000</p>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 p-4">
            <p className="mb-2 text-sm font-medium">Court Utilities/Features</p>
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
          </section>

          {mode === 'edit' && (
            <section className="rounded-lg border border-slate-200 p-4">
              <p className="mb-2 text-sm font-medium">Status</p>
              <select {...register('status')} className="w-full rounded-md border px-3 py-2">
                <option value={CourtStatus.ACTIVE}>Active</option>
                <option value={CourtStatus.INACTIVE}>Inactive</option>
              </select>
            </section>
          )}

          <div className="sticky bottom-0 flex gap-3 border-t border-slate-100 bg-white pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? 'Processing...' : mode === 'create' ? 'Create Court' : 'Update'}
            </Button>
          </div>
        </form>
      </div>
      {pendingSubmit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <span className="text-2xl text-red-500">!</span>
            </div>
            <h3 className="mb-3 text-center text-4 font-bold text-slate-900">
              Confirm Court Update
            </h3>
            <p className="mb-6 text-center text-slate-600">
              {mode === 'edit' &&
              court?.status !== CourtStatus.INACTIVE &&
              pendingSubmit.status === CourtStatus.INACTIVE
                ? 'The court status will be set to Inactive, automatically cancelling all future bookings (SYSTEM CANCELLED).'
                : "Are you sure you want to update this court's information?"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setPendingSubmit(null)}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => {
                  const payload = pendingSubmit;
                  setPendingSubmit(null);
                  doSubmit(payload);
                }}
              >
                Confirm Update
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
