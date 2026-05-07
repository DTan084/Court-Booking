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
  onSlotSelect?: (startHour: number, endHour: number) => void;
}

export function CourtSchedule({
  courtId,
  timeSlots,
  selectedDate,
  onDateChange,
  onSlotSelect,
}: CourtScheduleProps) {
  const formattedDate = formatDate(selectedDate);
  const { data: bookings, isLoading } = useSchedule(courtId, formattedDate);

  // Convert bookings to BookedRange[] using local hours
  // Backend stores timestamps with timezone — getHours() gives correct local hour
  const bookedRanges = useMemo<BookedRange[]>(() => {
    if (!bookings) return [];
    return bookings.map((booking) => {
      const start = new Date(booking.startTime);
      const end = new Date(booking.endTime);
      return {
        startHour: start.getHours(),
        endHour: end.getHours() || 24,
      };
    });
  }, [bookings]);

  // Use local day-of-week — consistent with how user sees the calendar
  const dayOfWeek = selectedDate.getDay();
  const daySlots = useMemo(
    () => timeSlots.filter((slot) => slot.dayOfWeek === dayOfWeek),
    [timeSlots, dayOfWeek],
  );

  // Pass current local hour only when viewing today — to grey out past slots
  const now = new Date();
  const isToday = formattedDate === formatDate(now);
  const currentHour = isToday ? now.getHours() : undefined;

  // Min date for date picker = today (local)
  const minDate = formatDate(now);

  return (
    <div className="space-y-4">
      {/* Date Picker */}
      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <input
          type="date"
          value={formattedDate}
          min={minDate}
          onChange={(e) => {
            if (!e.target.value) return;
            // Parse as local date by appending T00:00 without Z
            const newDate = new Date(`${e.target.value}T00:00:00`);
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
        <TimeSlotGrid
          timeSlots={daySlots}
          bookedRanges={bookedRanges}
          currentHour={currentHour}
          onSlotSelect={onSlotSelect}
        />
      )}
    </div>
  );
}
