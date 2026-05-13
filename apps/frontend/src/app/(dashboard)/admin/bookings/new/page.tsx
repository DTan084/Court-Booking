'use client';

import { useMemo, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/button';
import { useCourts } from '@/hooks/useCourts';
import { useCreateAdminBooking } from '@/hooks/useBookings';
import { useSchedule } from '@/hooks/useSchedule';
import { useTimeSlots } from '@/hooks/useTimeSlots';
import { formatCurrency, formatDate } from '@/lib/utils';

type SelectedSlot = {
  startHour: number;
  endHour: number;
  price: number;
};

export default function AdminNewBookingPage() {
  const [courtId, setCourtId] = useState('');
  const [date, setDate] = useState(formatDate(new Date()));
  const [selected, setSelected] = useState<SelectedSlot | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [note, setNote] = useState('');

  const { data: courtsData } = useCourts({ page: 1, limit: 100 });
  const courts = courtsData?.data ?? [];
  const { data: schedule } = useSchedule(courtId, date);
  const { data: timeSlots } = useTimeSlots(courtId);
  const { mutate: createAdminBooking, isPending } = useCreateAdminBooking();

  const bookedRanges = useMemo(() => {
    if (!schedule) return [];
    return schedule.map((b) => ({
      start: new Date(b.startTime).getHours(),
      end: new Date(b.endTime).getHours(),
    }));
  }, [schedule]);

  const availableSlots = useMemo(() => {
    if (!timeSlots) return [];
    const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
    const slots = timeSlots.filter((s) => s.dayOfWeek === dayOfWeek);
    return slots.filter((slot) => {
      const overlap = bookedRanges.some(
        (range) => slot.startHour < range.end && slot.endHour > range.start,
      );
      return !overlap;
    });
  }, [timeSlots, date, bookedRanges]);

  const submit = () => {
    if (!courtId || !selected) return;
    createAdminBooking({
      courtId,
      startTime: new Date(
        `${date}T${String(selected.startHour).padStart(2, '0')}:00:00`,
      ).toISOString(),
      endTime: new Date(`${date}T${String(selected.endHour).padStart(2, '0')}:00:00`).toISOString(),
      guestName: guestName || undefined,
      guestPhone: guestPhone || undefined,
      note: note || undefined,
    });
  };

  return (
    <AdminShell
      title="Manual Booking"
      subtitle="Create booking on behalf of walk-in or phone customer"
    >
      <div className="mx-auto max-w-4xl space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <select
            value={courtId}
            onChange={(e) => {
              setCourtId(e.target.value);
              setSelected(null);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          >
            <option value="">Select court</option>
            {courts.map((court) => (
              <option key={court.id} value={court.id}>
                {court.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSelected(null);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          />
          <input
            placeholder="Guest name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          />
          <input
            placeholder="Guest phone"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          />
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Internal note..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          rows={3}
        />

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-800">
            Available slots on selected date
          </p>
          {availableSlots.length === 0 ? (
            <p className="text-sm text-slate-500">No available slot</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {availableSlots.map((slot) => {
                const active =
                  selected?.startHour === slot.startHour && selected?.endHour === slot.endHour;
                return (
                  <button
                    key={`${slot.id}-${slot.startHour}-${slot.endHour}`}
                    type="button"
                    onClick={() =>
                      setSelected({
                        startHour: slot.startHour,
                        endHour: slot.endHour,
                        price: Number(slot.price),
                      })
                    }
                    className={`rounded-lg border px-3 py-2 text-left text-sm ${
                      active
                        ? 'border-[#944a00] bg-orange-50 text-[#944a00]'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-orange-400'
                    }`}
                  >
                    <p className="font-semibold">
                      {String(slot.startHour).padStart(2, '0')}:00 -{' '}
                      {String(slot.endHour).padStart(2, '0')}:00
                    </p>
                    <p className="text-xs">{formatCurrency(Number(slot.price))}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selected && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <p>
              Selected: {String(selected.startHour).padStart(2, '0')}:00 -{' '}
              {String(selected.endHour).padStart(2, '0')}:00
            </p>
            <p>Price: {formatCurrency(selected.price)}</p>
          </div>
        )}

        <Button
          onClick={submit}
          disabled={isPending || !courtId || !selected}
          className="bg-[#944a00] hover:bg-[#7f3f00]"
        >
          {isPending ? 'Creating...' : 'Create Admin Booking'}
        </Button>
      </div>
    </AdminShell>
  );
}
