import { cn } from '@/lib/utils';
import { resolveFeatureIcon } from '@/lib/feature-icons';
import type { Feature } from '@/types';

interface FacilityFeatureTagsProps {
  features: Feature[];
  maxVisible?: number;
  className?: string;
}

export function FacilityFeatureTags({ features, maxVisible, className }: FacilityFeatureTagsProps) {
  if (!features || features.length === 0) return null;

  const displayFeatures = maxVisible ? features.slice(0, maxVisible) : features;
  const hiddenCount = maxVisible ? Math.max(0, features.length - maxVisible) : 0;

  return (
    <div className={cn('flex flex-wrap gap-2.5', className)}>
      {displayFeatures.map((feature) => {
        const label = feature.name;
        const Icon = resolveFeatureIcon({ icon: feature.icon, name: feature.name });
        return (
          <span
            key={feature.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            {Icon ? <Icon className="h-3.5 w-3.5 text-slate-500" /> : null}
            <span className="max-w-[160px] truncate">{label}</span>
          </span>
        );
      })}
      {hiddenCount > 0 && (
        <span className="inline-flex items-center rounded-full border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
}
