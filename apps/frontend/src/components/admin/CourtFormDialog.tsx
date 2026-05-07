'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreateCourt, useUpdateCourt } from '@/hooks/useAdminCourts';
import { SportType, CourtStatus } from '@/types';
import type { Court } from '@/types';

// ==================== SCHEMA ====================

const courtSchema = z.object({
  name: z.string().min(2, 'Tên sân tối thiểu 2 ký tự'),
  sportType: z.nativeEnum(SportType, { required_error: 'Vui lòng chọn loại thể thao' }),
  address: z.string().min(5, 'Địa chỉ tối thiểu 5 ký tự'),
  pricePerHour: z.number({ invalid_type_error: 'Giá phải là số' }).positive('Giá phải lớn hơn 0'),
  status: z.nativeEnum(CourtStatus).optional(),
});

type CourtFormData = z.infer<typeof courtSchema>;

// ==================== TYPES ====================

interface CourtFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  court?: Court;
  mode: 'create' | 'edit';
}

// ==================== CONSTANTS ====================

const sportTypeOptions = [
  { value: SportType.BADMINTON, label: 'Cầu lông' },
  { value: SportType.TENNIS, label: 'Tennis' },
  { value: SportType.FOOTBALL, label: 'Bóng đá' },
  { value: SportType.BASKETBALL, label: 'Bóng rổ' },
  { value: SportType.VOLLEYBALL, label: 'Bóng chuyền' },
];

const statusOptions = [
  { value: CourtStatus.ACTIVE, label: 'Hoạt động' },
  { value: CourtStatus.INACTIVE, label: 'Tạm ngưng' },
];

// ==================== COMPONENT ====================

export function CourtFormDialog({ open, onOpenChange, court, mode }: CourtFormDialogProps) {
  const { mutate: createCourt, isPending: isCreating } = useCreateCourt();
  const { mutate: updateCourt, isPending: isUpdating } = useUpdateCourt();
  const isPending = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CourtFormData>({
    resolver: zodResolver(courtSchema),
    defaultValues: {
      name: '',
      sportType: SportType.BADMINTON,
      address: '',
      pricePerHour: 0,
      status: CourtStatus.ACTIVE,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (open && court && mode === 'edit') {
      reset({
        name: court.name,
        sportType: court.sportType,
        address: court.address,
        pricePerHour: court.pricePerHour,
        status: court.status,
      });
    } else if (open && mode === 'create') {
      reset({
        name: '',
        sportType: SportType.BADMINTON,
        address: '',
        pricePerHour: 0,
        status: CourtStatus.ACTIVE,
      });
    }
  }, [open, court, mode, reset]);

  const onSubmit = (data: CourtFormData) => {
    if (mode === 'create') {
      createCourt(
        {
          name: data.name,
          sportType: data.sportType,
          address: data.address,
          pricePerHour: data.pricePerHour,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            reset();
          },
        },
      );
    } else if (court) {
      updateCourt(
        { id: court.id, dto: data },
        {
          onSuccess: () => {
            onOpenChange(false);
            reset();
          },
        },
      );
    }
  };

  const handleClose = () => {
    if (!isPending) {
      onOpenChange(false);
      reset();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="court-form-title"
    >
      <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 id="court-form-title" className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Tạo sân mới' : 'Chỉnh sửa sân'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isPending}
            className="rounded-lg p-1 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="court-name" className="block text-sm font-medium text-gray-700">
              Tên sân <span className="text-red-500">*</span>
            </label>
            <input
              id="court-name"
              type="text"
              {...register('name')}
              placeholder="Ví dụ: Sân cầu lông Hà Nội"
              disabled={isPending}
              aria-describedby={errors.name ? 'court-name-error' : undefined}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            {errors.name && (
              <p id="court-name-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Sport Type */}
          <div>
            <label htmlFor="court-sport-type" className="block text-sm font-medium text-gray-700">
              Loại thể thao <span className="text-red-500">*</span>
            </label>
            <select
              id="court-sport-type"
              {...register('sportType')}
              disabled={isPending}
              aria-describedby={errors.sportType ? 'court-sport-type-error' : undefined}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              {sportTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.sportType && (
              <p id="court-sport-type-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.sportType.message}
              </p>
            )}
          </div>

          {/* Address */}
          <div>
            <label htmlFor="court-address" className="block text-sm font-medium text-gray-700">
              Địa chỉ <span className="text-red-500">*</span>
            </label>
            <input
              id="court-address"
              type="text"
              {...register('address')}
              placeholder="Ví dụ: 123 Đường ABC, Quận 1, TP.HCM"
              disabled={isPending}
              aria-describedby={errors.address ? 'court-address-error' : undefined}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            {errors.address && (
              <p id="court-address-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.address.message}
              </p>
            )}
          </div>

          {/* Price Per Hour */}
          <div>
            <label htmlFor="court-price" className="block text-sm font-medium text-gray-700">
              Giá tham khảo (VND/giờ) <span className="text-red-500">*</span>
            </label>
            <input
              id="court-price"
              type="number"
              min={0}
              step={1000}
              {...register('pricePerHour', { valueAsNumber: true })}
              placeholder="150000"
              disabled={isPending}
              aria-describedby={errors.pricePerHour ? 'court-price-error' : undefined}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            {errors.pricePerHour && (
              <p id="court-price-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.pricePerHour.message}
              </p>
            )}
          </div>

          {/* Status (edit only) */}
          {mode === 'edit' && (
            <div>
              <label htmlFor="court-status" className="block text-sm font-medium text-gray-700">
                Trạng thái
              </label>
              <select
                id="court-status"
                {...register('status')}
                disabled={isPending}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
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
