'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, DollarSign, AlertCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useCourt } from '@/hooks/useCourt';
import { useTimeSlots } from '@/hooks/useTimeSlots';
import { useSchedule } from '@/hooks/useSchedule';
import { CourtSchedule } from '@/components/courts/CourtSchedule';
import { BookingForm } from '@/components/bookings/BookingForm';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { SportType, CourtStatus, BookedRange } from '@/types';

// Sport type labels in Vietnamese
const sportTypeLabels: Record<SportType, string> = {
  badminton: 'Cầu lông',
  tennis: 'Tennis',
  football: 'Bóng đá',
  basketball: 'Bóng rổ',
  volleyball: 'Bóng chuyền',
};

// Sport type colors
const sportTypeColors: Record<SportType, string> = {
  badminton: 'bg-blue-100 text-blue-700',
  tennis: 'bg-green-100 text-green-700',
  football: 'bg-orange-100 text-orange-700',
  basketball: 'bg-purple-100 text-purple-700',
  volleyball: 'bg-pink-100 text-pink-700',
};

// Status labels and colors
const statusConfig: Record<CourtStatus, { label: string; color: string }> = {
  ACTIVE: { label: 'Hoạt động', color: 'bg-green-100 text-green-700' },
  INACTIVE: { label: 'Tạm ngưng', color: 'bg-gray-100 text-gray-700' },
};

export default function CourtDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const { data: court, isLoading: courtLoading, error: courtError } = useCourt(params.id);
  const { data: timeSlots, isLoading: slotsLoading } = useTimeSlots(params.id);
  const { data: bookings } = useSchedule(params.id, formatDate(selectedDate));

  // Convert bookings to BookedRange[] for the selected date
  const bookedRanges = useMemo<BookedRange[]>(() => {
    if (!bookings) return [];

    return bookings.map((booking) => {
      const start = new Date(booking.startTime);
      const end = new Date(booking.endTime);
      return {
        startHour: start.getHours(),
        endHour: end.getHours(),
      };
    });
  }, [bookings]);

  // Handle 404 - court not found
  if (courtError) {
    toast.error('Sân không tồn tại');
    router.push('/courts');
    return null;
  }

  // Loading state
  if (courtLoading || slotsLoading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="space-y-6">
          {/* Court info skeleton */}
          <div className="animate-pulse space-y-4 rounded-lg border bg-card p-6">
            <div className="h-8 w-2/3 rounded bg-gray-200" />
            <div className="h-4 w-1/3 rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-6 w-1/4 rounded bg-gray-200" />
          </div>
          {/* Schedule skeleton */}
          <div className="animate-pulse space-y-4 rounded-lg border bg-card p-6">
            <div className="h-6 w-1/4 rounded bg-gray-200" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 rounded-lg bg-gray-200" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!court || !timeSlots) {
    return null;
  }

  const sportLabel = sportTypeLabels[court.sportType];
  const sportColor = sportTypeColors[court.sportType];
  const statusInfo = statusConfig[court.status];
  const isInactive = court.status === 'INACTIVE';

  const handleBookingClick = () => {
    setIsBookingOpen(true);
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="space-y-6">
        {/* Court Info Card */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          {/* Header: Name and Status */}
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-foreground">{court.name}</h1>
              <span
                className={cn(
                  'inline-block rounded-full px-3 py-1 text-sm font-medium',
                  sportColor,
                )}
              >
                {sportLabel}
              </span>
            </div>
            <span
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium',
                statusInfo.color,
              )}
            >
              {statusInfo.label}
            </span>
          </div>

          {/* Inactive Warning Banner */}
          {isInactive && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <AlertCircle className="h-5 w-5 shrink-0 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-900">Sân tạm ngưng hoạt động</p>
                <p className="text-sm text-yellow-700">
                  Sân này hiện không nhận đặt chỗ. Vui lòng chọn sân khác.
                </p>
              </div>
            </div>
          )}

          {/* Address */}
          <div className="mb-4 flex items-start gap-2 text-muted-foreground">
            <MapPin className="h-5 w-5 shrink-0 mt-0.5" />
            <p>{court.address}</p>
          </div>

          {/* Price Reference */}
          <div className="flex items-center gap-2 border-t pt-4">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div>
              <span className="text-sm text-muted-foreground">Giá tham khảo: </span>
              <span className="text-lg font-semibold text-primary">
                {formatCurrency(court.pricePerHour)}/giờ
              </span>
              <p className="text-xs text-muted-foreground">(Giá thực tế theo từng khung giờ)</p>
            </div>
          </div>
        </div>

        {/* Schedule Section */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Lịch đặt sân</h2>
          </div>

          <CourtSchedule
            courtId={params.id}
            timeSlots={timeSlots}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </div>

        {/* Booking Button */}
        {!isInactive && (
          <div className="flex justify-center">
            <Button size="lg" onClick={handleBookingClick} className="min-w-[200px]">
              Đặt sân
            </Button>
          </div>
        )}

        {/* Booking Form Dialog */}
        <BookingForm
          open={isBookingOpen}
          onOpenChange={setIsBookingOpen}
          courtId={params.id}
          courtName={court.name}
          selectedDate={selectedDate}
          timeSlots={timeSlots}
          bookedRanges={bookedRanges}
        />
      </div>
    </div>
  );
}
