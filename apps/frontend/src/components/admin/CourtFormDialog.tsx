'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { FacilityFeature, CourtType, SportType, CourtStatus } from '@court-booking/shared';
import { FACILITY_FEATURE_LABELS } from '@/lib/court-features';
import { Button } from '@/components/ui/button';
import { useCreateCourt, useUpdateCourt } from '@/hooks/useAdminCourts';
import type { Court } from '@/types';

const courtSchema = z.object({
  name: z.string().min(2, 'Tên sân tối thiểu 2 ký tự'),
  sportType: z.nativeEnum(SportType),
  courtType: z.nativeEnum(CourtType),
  address: z.string().min(5, 'Địa chỉ tối thiểu 5 ký tự'),
  pricePerHour: z.number().positive('Giá phải lớn hơn 0'),
  description: z.string().max(5000).optional(),
  features: z.array(z.nativeEnum(FacilityFeature)).optional().default([]),
  status: z.nativeEnum(CourtStatus).optional(),
});

type CourtFormData = z.infer<typeof courtSchema>;

interface CourtFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  court?: Court;
  mode: 'create' | 'edit';
}

const sportTypeOptions = [
  { value: SportType.BADMINTON, label: 'Cầu lông' },
  { value: SportType.TENNIS, label: 'Tennis' },
  { value: SportType.FOOTBALL, label: 'Bóng đá' },
  { value: SportType.BASKETBALL, label: 'Bóng rổ' },
  { value: SportType.VOLLEYBALL, label: 'Bóng chuyền' },
];

export function CourtFormDialog({ open, onOpenChange, court, mode }: CourtFormDialogProps) {
  const { mutate: createCourt, isPending: isCreating } = useCreateCourt();
  const { mutate: updateCourt, isPending: isUpdating } = useUpdateCourt();
  const isPending = isCreating || isUpdating;
  const [preview, setPreview] = useState(false);
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
      sportType: SportType.BADMINTON,
      courtType: CourtType.OUTDOOR,
      address: '',
      pricePerHour: 0,
      description: '',
      features: [],
      status: CourtStatus.ACTIVE,
    },
  });

  const features = watch('features') ?? [];
  const description = watch('description') ?? '';

  useEffect(() => {
    if (!open) return;
    if (court && mode === 'edit') {
      reset({
        name: court.name,
        sportType: court.sportType,
        courtType: court.courtType,
        address: court.address,
        pricePerHour: court.pricePerHour,
        description: court.description ?? '',
        features: court.features ?? [],
        status: court.status,
      });
    } else {
      reset({
        name: '',
        sportType: SportType.BADMINTON,
        courtType: CourtType.OUTDOOR,
        address: '',
        pricePerHour: 0,
        description: '',
        features: [],
        status: CourtStatus.ACTIVE,
      });
    }
  }, [open, court, mode, reset]);

  const toggleFeature = (feature: FacilityFeature) => {
    const next = features.includes(feature)
      ? features.filter((f) => f !== feature)
      : [...features, feature];
    setValue('features', next);
  };

  const onSubmit = (data: CourtFormData) => {
    if (mode === 'create') {
      createCourt(data, { onSuccess: () => onOpenChange(false) });
      return;
    }
    if (court) {
      updateCourt({ id: court.id, dto: data }, { onSuccess: () => onOpenChange(false) });
    }
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
            {mode === 'create' ? 'Tạo sân mới' : 'Chỉnh sửa sân'}
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
            placeholder="Tên sân"
            className="w-full rounded-md border px-3 py-2"
          />
          {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          <div className="grid grid-cols-2 gap-3">
            <select {...register('sportType')} className="rounded-md border px-3 py-2">
              {sportTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select {...register('courtType')} className="rounded-md border px-3 py-2">
              <option value={CourtType.INDOOR}>Trong nhà</option>
              <option value={CourtType.OUTDOOR}>Ngoài trời</option>
            </select>
          </div>
          <input
            {...register('address')}
            placeholder="Địa chỉ"
            className="w-full rounded-md border px-3 py-2"
          />
          <input
            type="number"
            {...register('pricePerHour', { valueAsNumber: true })}
            placeholder="Giá/giờ"
            className="w-full rounded-md border px-3 py-2"
          />
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Mô tả sân</span>
              <button
                type="button"
                className="text-sm text-[#944a00]"
                onClick={() => setPreview((v) => !v)}
              >
                {preview ? 'Nhập' : 'Xem trước'}
              </button>
            </div>
            {!preview ? (
              <textarea
                {...register('description')}
                rows={5}
                placeholder="Nhập mô tả sân (hỗ trợ Markdown)..."
                className="w-full rounded-md border px-3 py-2"
              />
            ) : (
              <div className="prose min-h-[120px] rounded-md border p-3">
                <ReactMarkdown>{description || '_Chưa có nội dung_'}</ReactMarkdown>
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">{description.length}/5000</p>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Tiện ích sân</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(FacilityFeature).map((feature) => (
                <label key={feature} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={features.includes(feature)}
                    onChange={() => toggleFeature(feature)}
                  />
                  <span>
                    {FACILITY_FEATURE_LABELS[feature].icon} {FACILITY_FEATURE_LABELS[feature].label}
                  </span>
                </label>
              ))}
            </div>
          </div>
          {mode === 'edit' && (
            <select {...register('status')} className="w-full rounded-md border px-3 py-2">
              <option value={CourtStatus.ACTIVE}>Hoạt động</option>
              <option value={CourtStatus.INACTIVE}>Tạm ngưng</option>
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
              Hủy
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? 'Đang xử lý...' : mode === 'create' ? 'Tạo sân' : 'Cập nhật'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
