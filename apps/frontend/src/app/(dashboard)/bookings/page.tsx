'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMyBookings } from '@/hooks/useBookings';
import { BookingRow } from '@/components/bookings/BookingRow';
import { BookingFilters } from '@/components/bookings/BookingFilters';
import type { FilterTab } from '@/components/bookings/BookingFilters';
import { EmptyState } from '@/components/shared/EmptyState';
import { SkeletonBookingRow } from '@/components/shared/SkeletonBookingRow';
import { UserAccountShell } from '@/components/account/UserAccountShell';
import { History, MapPin, FileText, Settings } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { BookingStatus } from '@/types';
import type { Booking, Court } from '@/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CancelledBy } from '@court-booking/shared';
import Image from 'next/image';
import { formatDateByTimezone } from '@/lib/datetime';
import { normalizeImageUrl, shouldBypassImageOptimizer } from '@/lib/image';
import { useRuntimeSettings, runtimeSettingDefaults } from '@/hooks/useRuntimeSettings';

type BookingWithCourt = Booking & { court: Court };

type VenueStat = {
  courtId: string;
  courtName: string;
  address: string;
  imageUrl: string | null;
  totalBookings: number;
  totalSpent: number;
  lastPlayedAt: string;
};

// ==================== COMPONENT ====================

function BookingsPageContent() {
  const { data: settings } = useRuntimeSettings();
  const timezone = settings?.defaultTimezone ?? runtimeSettingDefaults.defaultTimezone;
  const locale = 'vi-VN';
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [expandedSections, setExpandedSections] = useState<{
    live: boolean;
    past: boolean;
    pending: boolean;
    completed: boolean;
    cancelled: boolean;
    venues: boolean;
  }>({
    live: false,
    past: false,
    pending: false,
    completed: false,
    cancelled: false,
    venues: false,
  });
  const [status, setStatus] = useState<BookingStatus | undefined>(undefined);
  const [statusGroup, setStatusGroup] = useState<'failed' | undefined>(undefined);
  const [fromDate, setFromDate] = useState<string | undefined>(undefined);
  const [toDate, setToDate] = useState<string | undefined>(undefined);

  const limit = 50;

  const { data, isLoading } = useMyBookings({
    page: 1,
    limit,
    status,
    statusGroup,
    fromDate,
    toDate,
  });
  const { data: allBookingsData } = useMyBookings({
    page: 1,
    limit: 50,
    fromDate,
    toDate,
  });

  const handleFilterChange = useCallback(
    (filters: {
      tab: FilterTab;
      status?: BookingStatus;
      statusGroup?: 'failed';
      fromDate?: string;
      toDate?: string;
    }) => {
      setActiveTab(filters.tab);
      setStatus(filters.status);
      setStatusGroup(filters.statusGroup);
      setFromDate(filters.fromDate);
      setToDate(filters.toDate);
    },
    [],
  );

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

  const bookings = (data?.data ?? []) as BookingWithCourt[];
  const now = new Date();
  const liveAndUpcoming = bookings.filter((booking) => {
    if (
      booking.status === BookingStatus.PENDING_PAYMENT ||
      booking.status === BookingStatus.CONFIRMED
    ) {
      return new Date(booking.endTime) >= now;
    }
    return false;
  });
  const pastBookings = bookings.filter((booking) => {
    const isTerminal =
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.EXPIRED;
    return isTerminal || new Date(booking.endTime) < now;
  });
  const PREVIEW_COUNT = 5;
  const pastBookingsToShow = expandedSections.past
    ? pastBookings
    : pastBookings.slice(0, PREVIEW_COUNT);
  const liveAndUpcomingToShow = expandedSections.live
    ? liveAndUpcoming
    : liveAndUpcoming.slice(0, PREVIEW_COUNT);

  const allBookings = (allBookingsData?.data ?? []) as BookingWithCourt[];
  const paidPastBookings = allBookings.filter((booking) => {
    const isPast = new Date(booking.endTime) < now;
    const isPaidByTimestamp = !!booking.paidAt || !!booking.refundedAt;
    const isPaidByStatus =
      booking.status === BookingStatus.COMPLETED ||
      (booking.status === BookingStatus.CANCELLED && (!!booking.refundedAt || !!booking.paidAt));
    return isPast && (isPaidByTimestamp || isPaidByStatus);
  });

  const pastVenueStats = paidPastBookings.reduce<Record<string, VenueStat>>((acc, booking) => {
    if (!booking.court?.id) return acc;
    const key = booking.court.id;
    const existing = acc[key];
    const bookingEnd = new Date(booking.endTime).toISOString();

    if (!existing) {
      acc[key] = {
        courtId: booking.court.id,
        courtName: booking.court.name,
        address: booking.court.address,
        imageUrl: booking.court.images?.[0]?.url ?? null,
        totalBookings: 1,
        totalSpent: Number(booking.totalPrice),
        lastPlayedAt: bookingEnd,
      };
      return acc;
    }

    existing.totalBookings += 1;
    existing.totalSpent += Number(booking.totalPrice);
    if (new Date(bookingEnd) > new Date(existing.lastPlayedAt)) {
      existing.lastPlayedAt = bookingEnd;
    }
    return acc;
  }, {});

  const pastVenues = Object.values(pastVenueStats).sort(
    (a, b) => new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime(),
  );
  const VENUES_PREVIEW_COUNT = 3;
  const pastVenuesToShow = expandedSections.venues
    ? pastVenues
    : pastVenues.slice(0, VENUES_PREVIEW_COUNT);

  const renderCompactPastList = (list: BookingWithCourt[]) => (
    <div className="space-y-4">
      {list.map((booking) => {
        const isSystemCancelled =
          booking.status === BookingStatus.CANCELLED &&
          (booking.cancelledBy === CancelledBy.SYSTEM ||
            /system|maintenance|emergency/i.test(
              `${booking.cancelledReason ?? ''} ${booking.cancellationNote ?? ''}`,
            ));
        const isUserCancelled =
          booking.status === BookingStatus.CANCELLED && booking.cancelledBy === CancelledBy.USER;
        const isAdminCancelled =
          booking.status === BookingStatus.CANCELLED && booking.cancelledBy === CancelledBy.ADMIN;
        const isCancelledPaid = booking.status === BookingStatus.CANCELLED && !!booking.paidAt;
        const refundPending =
          booking.status === BookingStatus.CANCELLED &&
          !booking.refundedAt &&
          (isSystemCancelled || isAdminCancelled || isCancelledPaid);
        const refundProcessed = booking.status === BookingStatus.CANCELLED && !!booking.refundedAt;
        const title = booking.court?.name ?? 'Unknown court';
        const statusLabel = isSystemCancelled
          ? 'System Cancelled'
          : isUserCancelled
            ? 'Cancelled by User'
            : isAdminCancelled
              ? 'Admin Cancelled'
              : booking.status === BookingStatus.CANCELLED
                ? 'Cancelled'
                : booking.status;
        const cancellationText =
          booking.cancellationNote || booking.cancelledReason || 'No reason provided';

        return (
          <div
            key={booking.id}
            id={`booking-${booking.id}`}
            className="relative flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 transition-all hover:shadow-md"
          >
            {booking.status !== BookingStatus.COMPLETED && (
              <div
                className={cn(
                  'absolute bottom-0 left-0 top-0 w-1',
                  isSystemCancelled ? 'bg-red-400/50' : 'bg-slate-300',
                )}
              />
            )}
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  isSystemCancelled
                    ? 'bg-red-50 text-red-600'
                    : booking.status === BookingStatus.COMPLETED
                      ? 'bg-slate-50 text-slate-400'
                      : 'bg-slate-50 text-slate-500',
                )}
              >
                {isSystemCancelled ? (
                  <Settings className="h-4 w-4" />
                ) : (
                  <History className="h-4 w-4" />
                )}
              </div>
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-800">{title}</h4>
                  <span
                    className={cn(
                      'rounded border px-2 py-0.5 text-[10px] font-bold uppercase',
                      booking.status === BookingStatus.COMPLETED &&
                        'border-green-100 bg-green-50 text-green-600',
                      booking.status === BookingStatus.EXPIRED &&
                        'border-red-100 bg-red-50 text-red-600',
                      isSystemCancelled && 'border-red-100 bg-red-50 text-red-600',
                      isAdminCancelled && 'border-rose-100 bg-rose-50 text-rose-600',
                      isUserCancelled && 'border-slate-200 bg-slate-50 text-slate-500',
                    )}
                  >
                    {statusLabel}
                  </span>
                  {refundPending && (
                    <span className="rounded border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-700">
                      Refund Pending
                    </span>
                  )}
                  {refundProcessed && (
                    <span className="rounded border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700">
                      Refund Processed
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-[12px] text-slate-400">
                  <span>{formatDateByTimezone(booking.startTime, timezone, locale)}</span>
                  {booking.status === BookingStatus.CANCELLED ? (
                    <>
                      <span>{formatCurrency(booking.totalPrice)}</span>
                      <span
                        className={cn(
                          'italic',
                          isSystemCancelled || isAdminCancelled
                            ? 'text-red-500/80'
                            : 'text-slate-500',
                        )}
                      >
                        {cancellationText}
                      </span>
                    </>
                  ) : (
                    <span>{formatCurrency(booking.totalPrice)}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSystemCancelled ? (
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = '/courts')}
                  className="text-xs font-bold text-slate-700"
                >
                  Find Alternative
                </Button>
              ) : (
                <button
                  onClick={() => window.location.assign(`/bookings?highlight=${booking.id}`)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-orange-600"
                >
                  <FileText className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderBookingRowPreview = (
    list: BookingWithCourt[],
    section: 'pending' | 'completed' | 'cancelled',
    viewAllLabel: string,
  ) => {
    const visible = expandedSections[section] ? list : list.slice(0, PREVIEW_COUNT);
    return (
      <>
        <div className="space-y-4">
          {visible.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              isHighlighted={highlightedId === booking.id}
            />
          ))}
        </div>
        {!expandedSections[section] && list.length > PREVIEW_COUNT && (
          <div className="pt-2 text-center">
            <button
              onClick={() => setExpandedSections((prev) => ({ ...prev, [section]: true }))}
              className="text-xs font-semibold text-slate-500 transition-colors hover:text-orange-600"
            >
              View All {list.length} {viewAllLabel}
            </button>
          </div>
        )}
      </>
    );
  };

  const renderPastVenuesSection = ({
    title = 'Past Venues',
    titleClassName = 'text-lg font-bold text-slate-900',
    showCount = false,
  }: {
    title?: string;
    titleClassName?: string;
    showCount?: boolean;
  } = {}) => (
    <section className="space-y-4 pt-6">
      <div className="flex items-center justify-between">
        <h3 className={titleClassName}>{title}</h3>
        {showCount && (
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {pastVenues.length} venues
          </span>
        )}
      </div>
      {pastVenues.length > 0 ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {pastVenuesToShow.map((venue) => (
              <article
                key={venue.courtId}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl"
              >
                <div className="relative h-40">
                  {venue.imageUrl ? (
                    <Image
                      src={normalizeImageUrl(venue.imageUrl)}
                      alt={venue.courtName}
                      fill
                      unoptimized={shouldBypassImageOptimizer(venue.imageUrl)}
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="h-full w-full bg-slate-200" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <h4 className="font-bold">{venue.courtName}</h4>
                    <p className="text-xs opacity-85">
                      Last played: {formatDateByTimezone(venue.lastPlayedAt, timezone, locale)}
                    </p>
                  </div>
                </div>
                <div className="p-5">
                  <p className="mb-3 flex items-start gap-2 text-sm text-slate-500">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{venue.address}</span>
                  </p>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {venue.totalBookings} bookings
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(venue.totalSpent)}
                    </p>
                  </div>
                  <Button
                    onClick={() => window.location.assign(`/courts/${venue.courtId}`)}
                    className="w-full bg-slate-50 text-slate-700 hover:bg-orange-600 hover:text-white"
                    variant="outline"
                  >
                    Book Again
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {!expandedSections.venues && pastVenues.length > VENUES_PREVIEW_COUNT && (
            <div className="pt-2 text-center">
              <button
                onClick={() => setExpandedSections((prev) => ({ ...prev, venues: true }))}
                className="text-xs font-semibold text-slate-500 transition-colors hover:text-orange-600"
              >
                View All {pastVenues.length} Past Entries
              </button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          title="No visited venues yet"
          description="Venues you have played at will appear here once you have past bookings."
        />
      )}
    </section>
  );

  return (
    <UserAccountShell
      title="My Bookings"
      subtitle="Manage and track your court reservations across all venues."
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button asChild className="bg-orange-600 hover:bg-orange-700 text-white">
            <Link href="/courts">Book New Court</Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-8">
          <BookingFilters onFilterChange={handleFilterChange} />
        </div>

        {/* Content */}
        {isLoading ? (
          // Loading Skeleton
          <SkeletonBookingRow count={5} />
        ) : (
          <>
            {activeTab === 'all' ? (
              <>
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">Live & Upcoming</h2>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {liveAndUpcoming.length} bookings
                    </span>
                  </div>
                  {liveAndUpcoming.length > 0 ? (
                    <>
                      <div className="space-y-4">
                        {liveAndUpcomingToShow.map((booking) => (
                          <BookingRow
                            key={booking.id}
                            booking={booking}
                            isHighlighted={highlightedId === booking.id}
                          />
                        ))}
                      </div>
                      {!expandedSections.live && liveAndUpcoming.length > PREVIEW_COUNT && (
                        <div className="pt-2 text-center">
                          <button
                            onClick={() => setExpandedSections((prev) => ({ ...prev, live: true }))}
                            className="text-xs font-semibold text-slate-500 transition-colors hover:text-orange-600"
                          >
                            View All {liveAndUpcoming.length} Live & Upcoming Entries
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <EmptyState
                      title="No upcoming bookings"
                      description="You do not have any pending or confirmed bookings in the near future."
                    />
                  )}
                </section>

                <section className="space-y-4 pt-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">Past Bookings</h2>
                  </div>
                  {pastBookings.length > 0 ? (
                    <>
                      {renderCompactPastList(pastBookingsToShow)}
                      {!expandedSections.past && pastBookings.length > PREVIEW_COUNT && (
                        <div className="pt-2 text-center">
                          <button
                            onClick={() => setExpandedSections((prev) => ({ ...prev, past: true }))}
                            className="text-xs font-semibold text-slate-500 transition-colors hover:text-orange-600"
                          >
                            View All {pastBookings.length} Past Entries
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <EmptyState
                      title="No booking history"
                      description="Completed, cancelled, or expired bookings will be displayed here."
                    />
                  )}
                </section>
              </>
            ) : (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">
                    {activeTab === 'pending'
                      ? 'Pending Payment'
                      : activeTab === 'completed'
                        ? 'Completed Bookings'
                        : 'Cancelled / Expired Bookings'}
                  </h2>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {bookings.length} bookings
                  </span>
                </div>
                {activeTab === 'pending' ? (
                  bookings.length > 0 ? (
                    renderBookingRowPreview(bookings, 'pending', 'Pending Entries')
                  ) : (
                    <EmptyState
                      title="No pending payments"
                      description="You don't have any bookings waiting for payment. Book a new court to continue."
                      action={{
                        label: 'Book Now',
                        href: '/courts',
                      }}
                    />
                  )
                ) : (
                  <>
                    {bookings.length > 0 ? (
                      renderBookingRowPreview(
                        bookings,
                        activeTab === 'completed' ? 'completed' : 'cancelled',
                        activeTab === 'completed'
                          ? 'Completed Entries'
                          : 'Cancelled / Expired Entries',
                      )
                    ) : (
                      <EmptyState
                        title={
                          activeTab === 'completed'
                            ? 'No completed bookings'
                            : 'No cancelled/expired bookings'
                        }
                        description="No data matching the current filter. You can book a new court to get started."
                        action={{
                          label: 'Book Now',
                          href: '/courts',
                        }}
                      />
                    )}
                  </>
                )}
              </section>
            )}
            {renderPastVenuesSection({
              titleClassName:
                activeTab === 'all'
                  ? 'text-xl font-bold text-slate-900'
                  : 'text-lg font-bold text-slate-900',
              showCount: activeTab === 'all',
            })}
          </>
        )}
      </div>
    </UserAccountShell>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<SkeletonBookingRow count={5} />}>
      <BookingsPageContent />
    </Suspense>
  );
}
