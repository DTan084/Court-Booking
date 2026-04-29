import { createCourtSchema } from './create-court.dto';
import { z } from 'zod';

export const updateCourtSchema = createCourtSchema.partial();

export type UpdateCourtDto = z.infer<typeof updateCourtSchema>;
