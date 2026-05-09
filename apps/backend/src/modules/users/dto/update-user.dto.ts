import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').optional(),
  phone: z
    .string()
    .regex(/^0\d{9}$/, 'Số điện thoại không hợp lệ (phải là 10 chữ số, bắt đầu bằng 0)')
    .optional()
    .nullable(),
  avatarUrl: z.string().url('URL ảnh không hợp lệ').optional().nullable(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
