'use client';

import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { useSchedule } from '@/hooks/useSchedule';
import { formatDate } from '@/lib/utils';
import { TimeSlotGrid } from './TimeSlotGrid';
import type { CourtTimeSlot, BookedRange } from '@/types';

interface CourtScheduleProps {
  courtId: string;
  timeSlots: CourtTimeSlot[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function CourtSchedule({
  courtId,
  timeSlots,
  selectedDate,
  onDateChange,
}: CourtScheduleProps) {
  const formattedDate = formatDate(selectedDate);
  const { data: bookings, isLoading } = useSchedule(courtId, formattedDate);

  // Convert bookings to BookedRange[]
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

  // Filter time slots for the selected day of week
  const dayOfWeek = selectedDate.getDay();
  const daySlots = useMemo(
    () => timeSlots.filter((slot) => slot.dayOfWeek === dayOfWeek),
    [timeSlots, dayOfWeek],
  );

  return (
    <div className="space-y-4">
      {/* Date Picker */}
      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <input
          type="date"
          value={formattedDate}
          onChange={(e) => {
            const newDate = new Date(e.target.value);
            if (!isNaN(newDate.getTime())) {
              onDateChange(newDate);
            }
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      {/* Time Slot Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : daySlots.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">Không có khung giờ nào cho ngày này</p>
        </div>
      ) : (
        <TimeSlotGrid timeSlots={daySlots} bookedRanges={bookedRanges} />
      )}
    </div>
  );
}
