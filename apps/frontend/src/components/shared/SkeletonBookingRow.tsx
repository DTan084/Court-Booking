interface SkeletonBookingRowProps {
  count?: number;
}

export function SkeletonBookingRow({ count = 5 }: SkeletonBookingRowProps) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="animate-pulse rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: Booking Info */}
            <div className="flex-1 space-y-3">
              {/* Court Name */}
              <div className="space-y-2">
                <div className="h-6 w-2/3 rounded bg-gray-200" />
                <div className="h-4 w-1/2 rounded bg-gray-200" />
              </div>

              {/* Date and Time */}
              <div className="flex gap-4">
                <div className="h-4 w-24 rounded bg-gray-200" />
                <div className="h-4 w-32 rounded bg-gray-200" />
              </div>

              {/* Price */}
              <div className="h-6 w-32 rounded bg-gray-200" />
            </div>

            {/* Right: Status and Actions */}
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <div className="h-7 w-24 rounded-full bg-gray-200" />
              <div className="h-9 w-20 rounded bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
