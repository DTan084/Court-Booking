import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Ten phai co it nhat 2 ky tu').optional(),
  phone: z
    .string()
    .regex(/^0\d{9}$/, 'So dien thoai khong hop le (phai la 10 chu so, bat dau bang 0)')
    .optional()
    .nullable(),
  avatarUrl: z.string().url('URL anh khong hop le').optional().nullable(),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Dob phai dung dinh dang YYYY-MM-DD')
    .optional()
    .nullable(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
