'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCourt } from '@/hooks/useCourt';
import { useTimeSlots } from '@/hooks/useTimeSlots';
import { useSchedule } from '@/hooks/useSchedule';
import { useCreateBooking } from '@/hooks/useBookings';
import { Button } from '@/components/ui/button';
import { buildLocalISO, cn, formatCurrency, formatDate, isSlotBooked } from '@/lib/utils';
import { CourtStatus } from '@/types';
import type { SportType, BookedRange, CourtTimeSlot } from '@/types';

const sportTypeLabels: Record<SportType, string> = {
  BADMINTON: 'Badminton',
  TENNIS: 'Tennis',
  FOOTBALL: 'Football',
  BASKETBALL: 'Basketball',
  VOLLEYBALL: 'Volleyball',
};

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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="space-y-6 lg:col-span-8">
          <div className="grid h-[440px] grid-cols-1 gap-2 overflow-hidden rounded-2xl md:grid-cols-3">
            <div className="relative md:col-span-2">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBx1TSQ96QiXngH7tf-dEnwN2R_pjMhwAqhgqxkyLmvBRouW0VbbFRHxouuGGUgZgIKZjX8Vk8yxh1wH8f5MX2JhXY-Wfv0-j4Pk4iFA_22KPEGg9iiGmUDuLfhWfMsjn4Hp-58lJH1oQOtUdk3gUfMGcJIDpYjd5l7Dw6ICXIswqkM0IjYlYGjNcMXTI98jUZnSu7OVf6w73PDx_PIaxDgbyqbGwCTVBwcucEokKtxw6uHdYYsNChJ4F4BM7tdipk4QiyC0sAdw"
                alt={court.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 rounded-full bg-[#fd933d] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#301400]">
                {sportTypeLabels[court.sportType]}
              </div>
            </div>
            <div className="hidden grid-rows-2 gap-2 md:grid">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqYPUQ8CqCuWxcSKVgB6UQVcfTbOxzWkMenDLLHEEDOgTP81QD54nNPrcTapGQsm3d6wOTFW-5ITp-7t2Xs-7EUGYw01QNT6u4AEpMpHk8_emcs2hToy7NWzMU4Z3s8V6e8pXed7FElz4TNTSdMj_WLBKTQxopru4SSVJTByt1OmvmY-XY3TL9SaGNw2kcoP5mFFfwYqmFl7MWjqv8rhIkdgfOFq-sPvuhfPaRRgGKbEAnWslQAMHz0gyV0-wNm1DQE6ClakrNXQ"
                alt="Court detail"
                className="h-full w-full object-cover"
              />
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuDGqlwmHB0HODaMHvOJ9O1E_46sCdHUN4IjulyUWIce4BDOGswQ7tirMieW5ml17MpEflg4BbcDIreYGmlxkeSkCs9PEQZptE7VTNp2-qCfL65IWL8lZ9JLuVrboDpPIA0QRBHuWO2_tnzM3QhgKRbbGP6yJBfHhET6cO5wiboCqM0DyhFkOttkMIYZjXNvLnW7B5r70XOuu0p6u9vBt94SO0byciN_vizyXUH_wtEpCPlm9JJ0yom_rmdfREBK_K3V8ogfLt3w"
                alt="Court detail"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-[#0b1c30]">
                  {court.name}
                </h1>
                <p className="mt-2 flex items-center gap-2 text-slate-600">
                  <MapPin className="h-4 w-4" />
                  {court.address}
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black text-[#944a00]">
                  {formatCurrency(court.pricePerHour)}
                </p>
                <p className="text-sm text-slate-500">per hour</p>
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

            <h2 className="mb-4 text-xl font-bold text-[#0b1c30]">Facility Features</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {['Pro Lighting', 'Free Parking', 'Gear Rental', 'Climate Control'].map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-[#f8f9ff] p-3"
                >
                  <ShieldCheck className="h-4 w-4 text-[#944a00]" />
                  <span className="text-sm font-medium text-slate-700">{f}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <h2 className="mb-3 text-xl font-bold text-[#0b1c30]">About This Court</h2>
              <p className="leading-relaxed text-slate-600">
                {court.description?.trim()
                  ? court.description
                  : 'This court is maintained for high-performance training and competitive matches, with stable lighting, quality surface conditions, and on-site support amenities.'}
              </p>
            </div>
          </div>
        </section>

        <aside className="lg:col-span-4">
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-[#0b1c30]">Availability Schedule</h3>
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
              <div className="text-sm font-semibold text-slate-700">
                {selectedDate.toLocaleDateString()}
              </div>
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
                const booked = isSlotBooked(slot.startHour, slot.endHour, bookedRanges);
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
                        'border-slate-300 bg-white hover:border-[#fd933d] hover:bg-orange-50',
                      isSelected && 'border-2 border-[#fd933d] bg-orange-50 text-[#944a00]',
                    )}
                  >
                    <p className="text-sm font-semibold">
                      {String(slot.startHour).padStart(2, '0')}:00 -{' '}
                      {String(slot.endHour).padStart(2, '0')}:00
                    </p>
                    <p className="mt-1 text-xs">
                      {booked ? 'Booked' : isPast ? 'Past' : formatCurrency(slot.price)}
                    </p>
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
                  <span className="font-medium text-slate-800">
                    {selectedDate.toLocaleDateString()}
                  </span>
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
