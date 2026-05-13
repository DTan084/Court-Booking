import { z } from 'zod';
import { SportType, CourtType, FacilityFeature } from '@court-booking/shared';

const facilityFeatureValues = new Set<string>(Object.values(FacilityFeature));

export const createCourtSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long').max(150),
  sportType: z.nativeEnum(SportType, {
    errorMap: () => ({ message: 'Invalid sport type' }),
  }),
  courtType: z.nativeEnum(CourtType, {
    errorMap: () => ({
      message: 'Loại sân không hợp lệ, chỉ chấp nhận INDOOR hoặc OUTDOOR',
    }),
  }),
  address: z.string().min(5, 'Address must be at least 5 characters long'),
  pricePerHour: z.number().min(0, 'Price must be positive'),
  description: z.string().max(5000, 'Mô tả sân không được vượt quá 5000 ký tự').optional(),
  features: z
    .array(z.string())
    .optional()
    .default([])
    .superRefine((values, ctx) => {
      const invalid = values.filter((value) => !facilityFeatureValues.has(value));
      if (invalid.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Tiện ích không hợp lệ: ${[...new Set(invalid)].join(', ')}`,
        });
      }
    })
    .transform((values) => [...new Set(values)] as FacilityFeature[]),
  district: z.string().max(100).optional(),
  isFeatured: z.boolean().optional(),
  maxPlayers: z
    .number()
    .int()
    .min(1, 'Số người tối đa phải lớn hơn hoặc bằng 1')
    .optional()
    .nullable(),
});

export type CreateCourtDto = z.infer<typeof createCourtSchema>;
