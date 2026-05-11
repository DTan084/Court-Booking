import { FacilityFeature } from '@court-booking/shared';
import { FACILITY_FEATURE_LABELS } from '@/lib/court-features';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FacilityFeatureTagsProps {
  features: FacilityFeature[];
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
        const { label, icon } = FACILITY_FEATURE_LABELS[feature];
        return (
          <Badge key={feature} variant="secondary" className="bg-slate-100 text-slate-700">
            <span className="mr-1">{icon}</span>
            {label}
          </Badge>
        );
      })}
      {hiddenCount > 0 && (
        <Badge variant="secondary" className="bg-slate-100 text-slate-500">
          +{hiddenCount} tiện ích khác
        </Badge>
      )}
    </div>
  );
}
