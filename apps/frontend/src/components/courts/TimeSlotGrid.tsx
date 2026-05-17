'use client';

import { Clock } from 'lucide-react';
import { cn, formatCurrency, isSlotBooked } from '@/lib/utils';
import type { CourtTimeSlot, BookedRange } from '@/types';

interface TimeSlotGridProps {
  timeSlots: CourtTimeSlot[];
  bookedRanges: BookedRange[];
  selectedStart?: number;
  selectedEnd?: number;
  currentHour?: number;
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
                ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-50'
                : booked
                  ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-70'
                  : isSelected
                    ? 'cursor-pointer border-blue-400 bg-blue-100 ring-2 ring-blue-300 hover:bg-blue-200'
                    : clickable
                      ? 'cursor-pointer border-green-200 bg-green-50 hover:border-green-300 hover:bg-green-100 hover:shadow-sm'
                      : 'border-gray-200 bg-white',
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {String(slot.startHour).padStart(2, '0')}:00 -{' '}
                {String(slot.endHour).padStart(2, '0')}:00
              </span>
            </div>

            {!unavailable ? (
              <div className="mb-2 text-lg font-semibold text-primary">
                {formatCurrency(slot.price)}
              </div>
            ) : (
              <div className="mb-2 text-sm font-medium text-slate-500">Unavailable</div>
            )}

            <div>
              {isPast ? (
                <span className="inline-block rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                  Ended
                </span>
              ) : booked ? (
                <span className="inline-block rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700">
                  Booked
                </span>
              ) : isSelected ? (
                <span className="inline-block rounded-full bg-blue-200 px-2 py-1 text-xs font-medium text-blue-700">
                  Selected
                </span>
              ) : (
                <span className="inline-block rounded-full bg-green-200 px-2 py-1 text-xs font-medium text-green-700">
                  Available
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
