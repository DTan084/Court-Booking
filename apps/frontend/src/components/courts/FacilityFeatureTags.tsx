import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
    <div className={cn('flex flex-wrap gap-2', className)}>
      {displayFeatures.map((feature) => {
        const label = feature.name;
        const icon = feature.icon ?? 'SPORT';
        return (
          <Badge key={feature.id} variant="secondary" className="bg-slate-100 text-slate-700">
            <span className="mr-1">{icon}</span>
            {label}
          </Badge>
        );
      })}
      {hiddenCount > 0 && (
        <Badge variant="secondary" className="bg-slate-100 text-slate-500">
          +{hiddenCount} more
        </Badge>
      )}
    </div>
  );
}
