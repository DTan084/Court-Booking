import { CourtType } from '@court-booking/shared';

export const COURT_TYPE_LABELS: Record<CourtType, { label: string; color: string }> = {
  [CourtType.INDOOR]: { label: 'Indoor', color: 'blue' },
  [CourtType.OUTDOOR]: { label: 'Outdoor', color: 'green' },
};
