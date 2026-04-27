// TODO: Booking types
// - Booking interface
// - BookingStatus enum

export enum BookingStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export interface Booking {
  id: string;
  courtId: string;
  userId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}
