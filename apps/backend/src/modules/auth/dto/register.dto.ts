import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(50, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least 1 number'),
  phone: z
    .string()
    .regex(/^[0-9]{10,11}$/, 'Phone must be 10–11 digits')
    .optional(),
});

export type RegisterDto = z.infer<typeof registerSchema>;
