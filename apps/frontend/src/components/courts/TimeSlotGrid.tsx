'use client';

import { Clock } from 'lucide-react';
import { cn, formatCurrency, isSlotBooked } from '@/lib/utils';
import type { CourtTimeSlot, BookedRange } from '@/types';

interface TimeSlotGridProps {
  timeSlots: CourtTimeSlot[];
  bookedRanges: BookedRange[];
  selectedStart?: number;
  selectedEnd?: number;
  currentHour?: number; // If provided (today), slots at or before this hour are marked past
  onSlotClick?: (startHour: number, endHour: number) => void;
  onSlotSelect?: (startHour: number, endHour: number) => void;
}

export function TimeSlotGrid({
  timeSlots,
  bookedRanges,
  selectedStart,
  selectedEnd,
  currentHour,
  onSlotClick,
  onSlotSelect,
}: TimeSlotGridProps) {
  const sortedSlots = [...timeSlots].sort((a, b) => a.startHour - b.startHour);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sortedSlots.map((slot) => {
        const booked = isSlotBooked(slot.startHour, slot.endHour, bookedRanges);
        const isPast = currentHour !== undefined && slot.startHour <= currentHour;
        const unavailable = booked || isPast;
        const clickable = !unavailable && (onSlotClick || onSlotSelect);

        // Check if this slot is in the selected range
        const isSelected =
          selectedStart !== undefined &&
          selectedEnd !== undefined &&
          slot.startHour >= selectedStart &&
          slot.endHour <= selectedEnd;

        const handleClick = () => {
          if (!clickable) return;
          if (onSlotSelect) {
            onSlotSelect(slot.startHour, slot.endHour);
          } else if (onSlotClick) {
            onSlotClick(slot.startHour, slot.endHour);
          }
        };

        return (
          <button
            key={slot.id}
            onClick={handleClick}
            disabled={unavailable || (!onSlotClick && !onSlotSelect)}
            className={cn(
              'rounded-lg border p-4 text-left transition-all',
              isPast
                ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-40'
                : booked
                  ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
                  : isSelected
                    ? 'cursor-pointer border-blue-400 bg-blue-100 ring-2 ring-blue-300 hover:bg-blue-200'
                    : clickable
                      ? 'cursor-pointer border-green-200 bg-green-50 hover:border-green-300 hover:bg-green-100 hover:shadow-sm'
                      : 'border-gray-200 bg-white',
            )}
          >
            {/* Time Range */}
            <div className="mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {String(slot.startHour).padStart(2, '0')}:00 -{' '}
                {String(slot.endHour).padStart(2, '0')}:00
              </span>
            </div>

            {/* Price */}
            <div className="mb-2 text-lg font-semibold text-primary">
              {formatCurrency(slot.price)}
            </div>

            {/* Status Badge */}
            <div>
              {isPast ? (
                <span className="inline-block rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500">
                  Đã qua
                </span>
              ) : booked ? (
                <span className="inline-block rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700">
                  Đã đặt
                </span>
              ) : isSelected ? (
                <span className="inline-block rounded-full bg-blue-200 px-2 py-1 text-xs font-medium text-blue-700">
                  Đang chọn
                </span>
              ) : (
                <span className="inline-block rounded-full bg-green-200 px-2 py-1 text-xs font-medium text-green-700">
                  Còn trống
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
