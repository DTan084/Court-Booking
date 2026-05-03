import { createCourtSchema } from './create-court.dto';
import { z } from 'zod';
import { CourtStatus } from '../../../database/entities/court.entity';

export const updateCourtSchema = createCourtSchema.partial().extend({
  status: z.nativeEnum(CourtStatus).optional(),
});

export type UpdateCourtDto = z.infer<typeof updateCourtSchema>;
