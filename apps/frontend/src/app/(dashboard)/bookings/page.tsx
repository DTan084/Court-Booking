'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { useMyBookings } from '@/hooks/useBookings';
import { BookingRow } from '@/components/bookings/BookingRow';
import { BookingFilters } from '@/components/bookings/BookingFilters';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pagination } from '@/components/shared/Pagination';
import type { BookingStatus } from '@/types';

// ==================== COMPONENT ====================

export default function BookingsPage() {
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

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Lịch đặt của tôi</h1>
            <p className="text-sm text-muted-foreground">
              Quản lý và theo dõi các lịch đặt sân của bạn
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <BookingFilters onFilterChange={handleFilterChange} />
        </div>

        {/* Content */}
        {isLoading ? (
          // Loading Skeleton
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg border bg-card p-4 shadow-sm">
                <div className="space-y-3">
                  <div className="h-6 w-2/3 rounded bg-gray-200" />
                  <div className="h-4 w-1/2 rounded bg-gray-200" />
                  <div className="h-4 w-1/3 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : data && data.data.length > 0 ? (
          // Booking List
          <>
            <div className="space-y-4">
              {data.data.map((booking) => (
                <BookingRow key={booking.id} booking={booking} />
              ))}
            </div>

            {/* Pagination */}
            {data.meta.totalPages > 1 && (
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
