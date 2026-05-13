'use client';

import { useMemo, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Button } from '@/components/ui/button';
import { useCourts } from '@/hooks/useCourts';
import { useCreateAdminBooking } from '@/hooks/useBookings';
import { useSchedule } from '@/hooks/useSchedule';
import { formatDate } from '@/lib/utils';

export default function AdminNewBookingPage() {
  const [courtId, setCourtId] = useState('');
  const [date, setDate] = useState(formatDate(new Date()));
  const [startHour, setStartHour] = useState('');
  const [endHour, setEndHour] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [note, setNote] = useState('');

  const { data: courtsData } = useCourts({ page: 1, limit: 100 });
  const courts = courtsData?.data ?? [];
  const { data: schedule } = useSchedule(courtId, date);
  const { mutate: createAdminBooking, isPending } = useCreateAdminBooking();

  const blockedHours = useMemo(() => {
    if (!schedule) return new Set<number>();
    const set = new Set<number>();
    for (const b of schedule) {
      const start = new Date(b.startTime).getHours();
      const end = new Date(b.endTime).getHours();
      for (let hour = start; hour < end; hour += 1) set.add(hour);
    }
    return set;
  }, [schedule]);

  const submit = () => {
    if (!courtId || !startHour || !endHour) return;
    createAdminBooking({
      courtId,
      startTime: new Date(`${date}T${startHour}:00`).toISOString(),
      endTime: new Date(`${date}T${endHour}:00`).toISOString(),
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
      <div className="mx-auto max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <select
            value={courtId}
            onChange={(e) => setCourtId(e.target.value)}
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
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          />
          <input
            placeholder="Start hour (e.g. 09:00)"
            value={startHour}
            onChange={(e) => setStartHour(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          />
          <input
            placeholder="End hour (e.g. 10:00)"
            value={endHour}
            onChange={(e) => setEndHour(e.target.value)}
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
          rows={4}
        />

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p className="mb-2 font-semibold text-slate-800">Booked hours on selected date:</p>
          {blockedHours.size === 0
            ? 'No blocked slots'
            : Array.from(blockedHours)
                .sort((a, b) => a - b)
                .map((h) => `${String(h).padStart(2, '0')}:00`)
                .join(', ')}
        </div>

        <Button onClick={submit} disabled={isPending} className="bg-[#944a00] hover:bg-[#7f3f00]">
          {isPending ? 'Creating...' : 'Create Admin Booking'}
        </Button>
      </div>
    </AdminShell>
  );
}
