import { CourtType } from '@court-booking/shared';

export const COURT_TYPE_LABELS: Record<CourtType, { label: string; color: string }> = {
  [CourtType.INDOOR]: { label: 'Trong nha', color: 'blue' },
  [CourtType.OUTDOOR]: { label: 'Ngoai troi', color: 'green' },
};
