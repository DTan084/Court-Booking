'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { useMyBookings } from '@/hooks/useBookings';
import { BookingRow } from '@/components/bookings/BookingRow';
import { BookingFilters } from '@/components/bookings/BookingFilters';
import { EmptyState } from '@/components/shared/EmptyState';
import { SkeletonBookingRow } from '@/components/shared/SkeletonBookingRow';
import { Pagination } from '@/components/shared/Pagination';
import type { BookingStatus } from '@/types';

// ==================== COMPONENT ====================

function BookingsPageContent() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<BookingStatus | undefined>(undefined);
  const [fromDate, setFromDate] = useState<string | undefined>(undefined);
  const [toDate, setToDate] = useState<string | undefined>(undefined);

  const limit = 10;

  const { data, isLoading } = useMyBookings({
    page,
    limit,
    status,
    fromDate,
    toDate,
  });

  const handleFilterChange = useCallback(
    (filters: { status?: BookingStatus; fromDate?: string; toDate?: string }) => {
      setStatus(filters.status);
      setFromDate(filters.fromDate);
      setToDate(filters.toDate);
      setPage(1); // Reset to first page when filters change
    },
    [],
  );

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // REQ-24.9: Handle deep linking with highlight
  const searchParams = useSearchParams();
  const highlightedId = searchParams.get('highlight');

  useEffect(() => {
    if (highlightedId && !isLoading && data?.data) {
      const element = document.getElementById(`booking-${highlightedId}`);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }
  }, [highlightedId, isLoading, data]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-8 w-8 text-orange-600" />
            <h1 className="text-3xl font-bold text-slate-900">My Bookings</h1>
          </div>
          <p className="text-slate-500">
            Manage and track your court reservations across all venues.
          </p>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-8">
          <BookingFilters onFilterChange={handleFilterChange} />
        </div>

        {/* Content */}
        {isLoading ? (
          // Loading Skeleton
          <SkeletonBookingRow count={5} />
        ) : data && data.data.length > 0 ? (
          // Booking List
          <>
            <div className="space-y-4">
              {data.data.map((booking) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  isHighlighted={highlightedId === booking.id}
                />
              ))}
            </div>

            {/* Pagination */}
            {data.meta?.totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination
                  page={page}
                  totalPages={data.meta.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        ) : (
          // Empty State
          <EmptyState
            title="Bạn chưa có lịch đặt sân nào"
            description="Hãy bắt đầu đặt sân để trải nghiệm dịch vụ của chúng tôi"
            action={{
              label: 'Đặt sân ngay',
              href: '/courts',
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<SkeletonBookingRow count={5} />}>
      <BookingsPageContent />
    </Suspense>
  );
}
