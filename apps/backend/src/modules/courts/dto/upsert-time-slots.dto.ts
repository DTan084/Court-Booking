import { z } from 'zod';
import { DayOfWeek } from '../../../database/entities/court-time-slot.entity';

const timeSlotSchema = z
  .object({
    dayOfWeek: z.nativeEnum(DayOfWeek),
    startHour: z.number().int().min(0).max(23),
    endHour: z.number().int().min(1).max(24),
    price: z.number().min(0),
  })
  .refine((s) => s.startHour < s.endHour, {
    message: 'startHour must be less than endHour',
    path: ['endHour'],
  });

export const upsertTimeSlotsSchema = z.object({
  slots: z.array(timeSlotSchema).min(1),
});

export type UpsertTimeSlotsDto = z.infer<typeof upsertTimeSlotsSchema>;
