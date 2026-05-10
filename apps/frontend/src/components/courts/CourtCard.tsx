import Link from 'next/link';
import { MapPin, DollarSign } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { SportType, CourtStatus } from '@/types';
import type { Court } from '@/types';

interface CourtCardProps {
  court: Court;
}

// Sport type labels in Vietnamese
const sportTypeLabels: Record<SportType, string> = {
  [SportType.BADMINTON]: 'Cầu lông',
  [SportType.TENNIS]: 'Tennis',
  [SportType.FOOTBALL]: 'Bóng đá',
  [SportType.BASKETBALL]: 'Bóng rổ',
  [SportType.VOLLEYBALL]: 'Bóng chuyền',
};

// Sport type colors
const sportTypeColors: Record<SportType, string> = {
  [SportType.BADMINTON]: 'bg-blue-100 text-blue-700',
  [SportType.TENNIS]: 'bg-green-100 text-green-700',
  [SportType.FOOTBALL]: 'bg-orange-100 text-orange-700',
  [SportType.BASKETBALL]: 'bg-purple-100 text-purple-700',
  [SportType.VOLLEYBALL]: 'bg-pink-100 text-pink-700',
};

// Status labels and colors
const statusConfig: Record<CourtStatus, { label: string; color: string }> = {
  ACTIVE: { label: 'Hoạt động', color: 'bg-green-100 text-green-700' },
  INACTIVE: { label: 'Tạm ngưng', color: 'bg-gray-100 text-gray-700' },
};

export function CourtCard({ court }: CourtCardProps) {
  const sportLabel = sportTypeLabels[court.sportType];
  const sportColor = sportTypeColors[court.sportType];
  const statusInfo = statusConfig[court.status];

  return (
    <Link
      href={`/courts/${court.id}`}
      className={cn(
        'group block rounded-lg border bg-card p-6 shadow-sm transition-all',
        'hover:shadow-md hover:border-primary/50',
        court.status === CourtStatus.INACTIVE && 'opacity-75',
      )}
    >
      {/* Header: Name and Status */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {court.name}
        </h3>
        <span
          className={cn('shrink-0 rounded-full px-2 py-1 text-xs font-medium', statusInfo.color)}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Sport Type Badge */}
      <div className="mb-3">
        <span className={cn('inline-block rounded-full px-3 py-1 text-xs font-medium', sportColor)}>
          {sportLabel}
        </span>
      </div>

      {/* Address */}
      <div className="mb-4 flex items-start gap-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
        <p className="line-clamp-2">{court.address}</p>
      </div>

      {/* Price */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          <span>Giá tham khảo</span>
        </div>
        <div className="text-lg font-semibold text-primary">
          {formatCurrency(court.pricePerHour)}/giờ
        </div>
      </div>
    </Link>
  );
}
