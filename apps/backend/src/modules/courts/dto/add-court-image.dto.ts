import { z } from 'zod';

export const addCourtImageSchema = z.object({
  url: z.string().refine(
    (value) => {
      if (value.startsWith('/uploads/')) return true;
      return z.string().url().safeParse(value).success;
    },
    { message: 'Invalid image URL' },
  ),
  altText: z.string().max(200).optional(),
  displayOrder: z.number().int().min(0).optional().default(0),
});

export type AddCourtImageDto = z.infer<typeof addCourtImageSchema>;
