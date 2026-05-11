import { z } from 'zod';

export const addCourtImageSchema = z.object({
  url: z.string().url({ message: 'URL hình ảnh không hợp lệ' }),
  altText: z.string().max(200).optional(),
  displayOrder: z.number().int().min(0).optional().default(0),
});

export type AddCourtImageDto = z.infer<typeof addCourtImageSchema>;
