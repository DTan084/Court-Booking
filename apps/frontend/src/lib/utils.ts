import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CourtTimeSlot, BookedRange } from '@/types';

/**
 * Merge Tailwind CSS classes with clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format số tiền theo định dạng VND
 * Ví dụ: 150000 → "150.000 ₫"
 */
export function formatCurrency(amount: number, currency?: string): string {
  const resolvedCurrency =
    currency ||
    (typeof window !== 'undefined'
      ? window.localStorage.getItem('runtime_currency') || 'VND'
      : 'VND');
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: resolvedCurrency,
  }).format(amount);
}

/**
 * Tính totalPrice bằng cách tìm các CourtTimeSlot liên tiếp
 * bao phủ đúng khoảng [startHour, endHour].
 * Trả về null nếu khoảng thời gian không hợp lệ.
 */
export function calculateBookingPrice(
  slots: CourtTimeSlot[],
  dayOfWeek: number,
  startHour: number,
  endHour: number,
): { totalPrice: number; coveredSlots: CourtTimeSlot[] } | null {
  const daySlots = slots
    .filter((s) => s.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.startHour - b.startHour);

  const covered: CourtTimeSlot[] = [];
  let current = startHour;

  for (const slot of daySlots) {
    if (slot.startHour === current) {
      covered.push(slot);
      current = slot.endHour;
      if (current === endHour) {
        return {
          totalPrice: covered.reduce((sum, s) => sum + Number(s.price), 0),
          coveredSlots: covered,
        };
      }
    }
  }

  return null; // gap hoặc không bao phủ đủ
}

/**
 * Kiểm tra time slot có bị trùng với booking đã có không
 */
export function isSlotBooked(
  slotStartHour: number,
  slotEndHour: number,
  bookedRanges: BookedRange[],
): boolean {
  return bookedRanges.some(
    (range) => slotStartHour < range.endHour && slotEndHour > range.startHour,
  );
}

/**
 * Format Date → "YYYY-MM-DD" dùng local timezone
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Build ISO string từ date + hour theo local timezone
 * Ví dụ: date=2026-05-07, hour=8 → "2026-05-07T08:00:00+07:00"
 */
export function buildLocalISO(date: Date, hour: number): string {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  // toISOString() converts to UTC — we need local ISO
  const offset = -d.getTimezoneOffset(); // minutes
  const sign = offset >= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const hh = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const mm = String(absOffset % 60).padStart(2, '0');
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:00:00${sign}${hh}:${mm}`;
}
