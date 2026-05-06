import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  count?: number;
  className?: string;
}

export function SkeletonCard({ count = 6, className }: SkeletonCardProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={cn('rounded-lg border bg-card p-6 shadow-sm', className)}>
          {/* Image/Icon placeholder */}
          <div className="mb-4 h-12 w-12 animate-pulse rounded-md bg-muted" />

          {/* Title placeholder */}
          <div className="mb-2 h-6 w-3/4 animate-pulse rounded bg-muted" />

          {/* Sport type badge placeholder */}
          <div className="mb-3 h-5 w-20 animate-pulse rounded-full bg-muted" />

          {/* Address placeholder */}
          <div className="mb-2 h-4 w-full animate-pulse rounded bg-muted" />
          <div className="mb-4 h-4 w-2/3 animate-pulse rounded bg-muted" />

          {/* Price placeholder */}
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
            <div className="h-6 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </>
  );
}
