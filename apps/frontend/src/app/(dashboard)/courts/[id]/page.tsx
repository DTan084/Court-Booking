'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { useCourt } from '@/hooks/useCourt';
import { useTimeSlots } from '@/hooks/useTimeSlots';
import { useSchedule } from '@/hooks/useSchedule';
import { useCreateBooking } from '@/hooks/useBookings';
import { Button } from '@/components/ui/button';
import { CourtGallery } from '@/components/courts/CourtGallery';
import { CourtTypeBadge } from '@/components/courts/CourtTypeBadge';
import { FacilityFeatureTags } from '@/components/courts/FacilityFeatureTags';
import { buildLocalISO, cn, formatCurrency, formatDate } from '@/lib/utils';
import { BookingStatus, CourtStatus } from '@/types';
import type { CourtTimeSlot, Feature } from '@/types';

function getDaySlots(timeSlots: CourtTimeSlot[], selectedDate: Date) {
  const dayOfWeek = selectedDate.getDay();
  return timeSlots
    .filter((slot) => slot.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.startHour - b.startHour);
}

function isConsecutive(slots: CourtTimeSlot[]) {
  if (slots.length <= 1) return true;
  const sorted = [...slots].sort((a, b) => a.startHour - b.startHour);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i - 1].endHour !== sorted[i].startHour) return false;
  }
  return true;
}

function computeTotalPrice(slots: CourtTimeSlot[]) {
  return slots.reduce((sum, slot) => sum + Number(slot.price), 0);
}

function getSlotBookingState(
  slot: CourtTimeSlot,
  selectedDate: Date,
  bookings: Array<{ startTime: string; endTime: string; status: BookingStatus }> | undefined,
): 'available' | 'pending' | 'confirmed' {
  if (!bookings || bookings.length === 0) return 'available';
  const slotStart = buildLocalISO(selectedDate, slot.startHour);
  const slotEnd = buildLocalISO(selectedDate, slot.endHour === 24 ? 0 : slot.endHour);

  for (const booking of bookings) {
    const overlap =
      new Date(booking.startTime) < new Date(slotEnd) &&
      new Date(booking.endTime) > new Date(slotStart);
    if (!overlap) continue;
    if (booking.status === BookingStatus.CONFIRMED) return 'confirmed';
    if (booking.status === BookingStatus.PENDING_PAYMENT) return 'pending';
  }
  return 'available';
}

export default function CourtDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlots, setSelectedSlots] = useState<Array<{ startHour: number; endHour: number }>>(
    [],
  );

  const { mutate: createBooking, isPending } = useCreateBooking();
  const { data: court, isLoading: courtLoading, error: courtError } = useCourt(params.id);
  const { data: timeSlots, isLoading: slotsLoading } = useTimeSlots(params.id);
  const { data: bookings } = useSchedule(params.id, formatDate(selectedDate));

  if (courtError) {
    toast.error('Court not found');
    router.push('/courts');
    return null;
  }

  if (courtLoading || slotsLoading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-8">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-4">
            <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-36 animate-pulse rounded-2xl bg-slate-200" />
          </div>
          <div className="lg:col-span-4 h-96 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!court || !timeSlots) return null;
  const displayFeatures: Array<Feature> = (court.featureItems ?? []) as Feature[];

  const isInactive = court.status === CourtStatus.INACTIVE;
  const daySlots = getDaySlots(timeSlots, selectedDate);

  const now = new Date();
  const isToday = formatDate(now) === formatDate(selectedDate);
  const currentHour = now.getHours();

  const selectedSlotObjects = daySlots
    .filter((slot) =>
      selectedSlots.some((s) => s.startHour === slot.startHour && s.endHour === slot.endHour),
    )
    .sort((a, b) => a.startHour - b.startHour);

  const slotsConsecutive = isConsecutive(selectedSlotObjects);
  const startHour = selectedSlotObjects[0]?.startHour;
  const endHour = selectedSlotObjects[selectedSlotObjects.length - 1]?.endHour;
  const totalPrice = computeTotalPrice(selectedSlotObjects);

  const handlePrevDate = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() - 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (next < today) return;
    setSelectedDate(next);
    setSelectedSlots([]);
  };

  const handleNextDate = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
    setSelectedSlots([]);
  };

  const toggleSlot = (slot: CourtTimeSlot) => {
    const exists = selectedSlots.some(
      (s) => s.startHour === slot.startHour && s.endHour === slot.endHour,
    );
    if (exists) {
      setSelectedSlots((prev) =>
        prev.filter((s) => !(s.startHour === slot.startHour && s.endHour === slot.endHour)),
      );
      return;
    }
    setSelectedSlots((prev) => [...prev, { startHour: slot.startHour, endHour: slot.endHour }]);
  };

  const handleCreateBooking = () => {
    if (!startHour || !endHour || selectedSlotObjects.length === 0) {
      toast.error('Please select at least one timeslot');
      return;
    }
    if (!slotsConsecutive) {
      toast.error('Selected slots must be consecutive');
      return;
    }

    const startTime = buildLocalISO(selectedDate, startHour);
    const endTime = buildLocalISO(selectedDate, endHour === 24 ? 0 : endHour);

    createBooking(
      { courtId: params.id, startTime, endTime },
      {
        onSuccess: (data) => {
          setSelectedSlots([]);
          router.push(`/checkout/${data.id}`);
        },
      },
    );
  };

  const openDatePicker = () => {
    if (!dateInputRef.current) return;
    if (typeof dateInputRef.current.showPicker === 'function') {
      dateInputRef.current.showPicker();
    } else {
      dateInputRef.current.focus();
      dateInputRef.current.click();
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-8 md:py-10">
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-12">
        <section className="space-y-6 lg:col-span-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <CourtGallery images={court.images ?? []} courtName={court.name} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-[#0b1c30]">{court.name}</h1>
                <div className="mt-3 flex items-center gap-2">
                  <CourtTypeBadge courtType={court.courtType} />
                  {court.isFeatured && (
                    <span className="rounded-full bg-[#fd933d] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#301400]">
                      Featured
                    </span>
                  )}
                </div>
                <p className="mt-3 flex items-center gap-2 text-slate-600">
                  <MapPin className="h-4 w-4" />
                  {court.address}
                </p>
                {court.maxPlayers ? (
                  <p className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
                    <Users className="h-4 w-4 text-slate-500" />
                    Max players: <span className="font-semibold">{court.maxPlayers}</span>
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-4xl font-black text-[#944a00]">
                  {formatCurrency(court.pricePerHour)}
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  per hour
                </p>
              </div>
            </div>

            {isInactive && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Court is temporarily unavailable</p>
                  <p className="text-sm">Please select another court for booking.</p>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-100 bg-[#f8f9ff] p-4">
              <h2 className="mb-3 text-lg font-bold text-[#0b1c30]">Facility Features</h2>
              <FacilityFeatureTags features={displayFeatures} />
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <h2 className="mb-3 text-lg font-bold text-[#0b1c30]">About This Court</h2>
              {court.description?.trim() ? (
                <div className="prose prose-slate max-w-none text-slate-600">
                  <ReactMarkdown>{court.description}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-slate-400">Chưa có mô tả cho sân này</p>
              )}
            </div>
          </div>
        </section>

        <aside className="lg:col-span-4">
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-bold tracking-tight text-[#0b1c30]">
                Availability Schedule
              </h3>
              <button
                type="button"
                onClick={openDatePicker}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-[#fd933d] hover:text-[#944a00]"
                title="Select date"
              >
                <Calendar className="h-4 w-4" />
              </button>
              <input
                ref={dateInputRef}
                type="date"
                className="sr-only"
                min={formatDate(new Date())}
                value={formatDate(selectedDate)}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setSelectedDate(new Date(`${e.target.value}T00:00:00`));
                  setSelectedSlots([]);
                }}
              />
            </div>

            <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-[#f8f9ff] p-2">
              <button
                onClick={handlePrevDate}
                className="rounded-md p-2 text-slate-600 transition hover:bg-slate-200"
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-sm font-semibold text-slate-700">{formatDate(selectedDate)}</div>
              <button
                onClick={handleNextDate}
                className="rounded-md p-2 text-slate-600 transition hover:bg-slate-200"
                type="button"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid max-h-[360px] grid-cols-2 gap-3 overflow-y-auto pr-1">
              {daySlots.length === 0 && (
                <div className="col-span-2 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  No timeslots for this date.
                </div>
              )}
              {daySlots.map((slot) => {
                const bookingState = getSlotBookingState(slot, selectedDate, bookings);
                const booked = bookingState !== 'available';
                const isPast = isToday && slot.startHour <= currentHour;
                const isSelected = selectedSlots.some(
                  (s) => s.startHour === slot.startHour && s.endHour === slot.endHour,
                );
                const disabled = booked || isInactive || isPast;

                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleSlot(slot)}
                    className={cn(
                      'rounded-lg border p-3 text-left transition',
                      disabled && 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400',
                      !disabled &&
                        !isSelected &&
                        'border-slate-300 bg-white hover:border-[#fd933d] hover:bg-orange-50 hover:shadow-sm',
                      isSelected &&
                        'border-2 border-[#fd933d] bg-orange-50 text-[#944a00] shadow-[0_0_0_2px_rgba(253,147,61,0.2)]',
                    )}
                  >
                    <p className="text-sm font-semibold">
                      {String(slot.startHour).padStart(2, '0')}:00 -{' '}
                      {String(slot.endHour).padStart(2, '0')}:00
                    </p>
                    <p className="mt-1 text-xs">
                      {bookingState === 'confirmed'
                        ? 'Booked'
                        : bookingState === 'pending'
                          ? 'Held (pending payment)'
                          : isPast
                            ? 'Past'
                            : formatCurrency(slot.price)}
                    </p>
                    {bookingState === 'pending' && (
                      <p className="mt-1 text-[10px] font-semibold text-amber-700">May open soon</p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 border-t border-slate-200 pt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Review Booking
              </p>

              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Date</span>
                  <span className="font-medium text-slate-800">{formatDate(selectedDate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Selected slots</span>
                  <span className="font-medium text-slate-800">{selectedSlotObjects.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Time range</span>
                  <span className="font-medium text-slate-800">
                    {startHour !== undefined && endHour !== undefined
                      ? `${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00`
                      : 'Select slots'}
                  </span>
                </div>
              </div>

              {selectedSlotObjects.length > 0 && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-[#f8f9ff] p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Price Breakdown
                  </p>
                  <div className="space-y-1">
                    {selectedSlotObjects.map((slot) => (
                      <div
                        key={`${slot.startHour}-${slot.endHour}`}
                        className="flex items-center justify-between text-sm text-slate-700"
                      >
                        <span>
                          {String(slot.startHour).padStart(2, '0')}:00 -{' '}
                          {String(slot.endHour).padStart(2, '0')}:00
                        </span>
                        <span className="font-medium">{formatCurrency(Number(slot.price))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!slotsConsecutive && selectedSlotObjects.length > 1 && (
                <p className="mt-3 text-xs font-medium text-amber-700">
                  Selected slots are not consecutive. Please select adjacent slots only.
                </p>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="font-bold text-slate-700">Total</span>
                <span className="text-2xl font-black text-[#944a00]">
                  {formatCurrency(totalPrice || court.pricePerHour)}
                </span>
              </div>

              <Button
                type="button"
                className="mt-4 h-12 w-full bg-[#944a00] text-white hover:bg-[#7f3f00]"
                disabled={
                  selectedSlotObjects.length === 0 || !slotsConsecutive || isInactive || isPending
                }
                onClick={handleCreateBooking}
              >
                {isPending ? 'Processing...' : 'Review & Pay'}
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {selectedSlotObjects.length > 0 && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {selectedSlotObjects.length} slot(s) selected
        </div>
      )}
    </div>
  );
}
