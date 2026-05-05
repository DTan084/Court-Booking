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
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
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
 * Kiểm tra booking có thể hủy không (còn hơn 2 giờ)
 */
export function canCancelBooking(startTime: string): boolean {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  return diffMs > 2 * 60 * 60 * 1000;
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
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format time to HH:mm
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
