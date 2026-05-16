import { CourtType } from '@court-booking/shared';
import { COURT_TYPE_LABELS } from '@/lib/court-features';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface CourtTypeBadgeProps {
  courtType: CourtType;
  className?: string;
}

export function CourtTypeBadge({ courtType, className }: CourtTypeBadgeProps) {
  const { label } = COURT_TYPE_LABELS[courtType];

  return (
    <Badge
      variant="outline"
      className={cn(
        courtType === CourtType.INDOOR
          ? 'bg-blue-100 text-blue-700 border-blue-200'
          : 'bg-green-100 text-green-700 border-green-200',
        className,
      )}
    >
      {label}
    </Badge>
  );
}
