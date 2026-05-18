import Link from 'next/link';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { normalizeImageUrl, shouldBypassImageOptimizer } from '@/lib/image';
import { CourtStatus } from '@/types';
import type { Court, Feature } from '@/types';
import { CourtTypeBadge } from './CourtTypeBadge';
import { FacilityFeatureTags } from './FacilityFeatureTags';

interface CourtCardProps {
  court: Court;
}

const placeholderImage =
  'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=80';

export function CourtCard({ court }: CourtCardProps) {
  const inactive = court.status === CourtStatus.INACTIVE;
  const displayFeatures: Array<Feature> = (court.featureItems ?? []) as Feature[];
  const primaryImageUrl = normalizeImageUrl(court.images?.[0]?.url) || placeholderImage;
  const primaryImageUnoptimized = shouldBypassImageOptimizer(court.images?.[0]?.url);

  return (
    <Link
      href={`/courts/${court.id}`}
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
        inactive && 'opacity-70',
      )}
    >
      <div className="relative h-52 overflow-hidden">
        <Image
          src={primaryImageUrl}
          alt={court.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          unoptimized={primaryImageUnoptimized}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <CourtTypeBadge courtType={court.courtType} />
          {court.isFeatured && (
            <span className="rounded-full bg-[#fd933d] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#301400]">
              Featured
            </span>
          )}
        </div>
        {inactive && (
          <span className="absolute right-4 top-4 rounded-full bg-slate-900/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
            Inactive
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 text-xl font-bold text-[#0b1c30]">{court.name}</h3>
        </div>

        <div className="mb-3 flex items-start gap-2 text-sm text-slate-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="line-clamp-2">{court.address}</p>
        </div>
        {court.description?.trim() && (
          <p className="mb-2 line-clamp-2 text-sm text-slate-600">
            {court.description.length > 50
              ? `${court.description.slice(0, 50).trim()}...`
              : court.description}
          </p>
        )}
        <FacilityFeatureTags
          features={displayFeatures}
          maxVisible={2}
          className="mb-4 min-h-[32px]"
        />

        <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 pt-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Starting From
            </p>
            <p className="text-xl font-black text-[#0b1c30]">
              {formatCurrency(court.pricePerHour)}
              <span className="ml-1 text-sm font-medium text-slate-500">/hour</span>
            </p>
          </div>
          <span className="inline-flex w-full items-center justify-center rounded-lg bg-[#131b2e] px-3 py-2 text-xs font-bold uppercase tracking-wide text-white">
            View Schedule
          </span>
        </div>
      </div>
    </Link>
  );
}
