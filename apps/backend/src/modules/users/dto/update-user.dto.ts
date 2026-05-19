import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z
    .string()
    .regex(/^0\d{9}$/, 'Invalid phone number (must be a 10-digit number starting with 0)')
    .optional()
    .nullable(),
  avatarUrl: z.string().url('Invalid avatar URL').optional().nullable(),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
