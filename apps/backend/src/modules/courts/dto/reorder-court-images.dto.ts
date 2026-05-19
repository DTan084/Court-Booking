import { z } from 'zod';

export const reorderCourtImagesSchema = z.object({
  images: z
    .array(
      z.object({
        imageId: z.string().min(1),
        displayOrder: z.coerce.number().int().min(0),
      }),
    )
    .min(1),
});

export type ReorderCourtImagesDto = z.infer<typeof reorderCourtImagesSchema>;
