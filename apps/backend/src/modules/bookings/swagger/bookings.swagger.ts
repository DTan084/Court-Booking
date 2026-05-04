import { ApiProperty } from '@nestjs/swagger';

// ── Request Bodies ─────────────────────────────────────────────────────────

export class CreateBookingBody {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', format: 'uuid' })
  courtId: string;

  @ApiProperty({ example: '2026-06-15T08:00:00Z', format: 'date-time' })
  startTime: string;

  @ApiProperty({ example: '2026-06-15T10:00:00Z', format: 'date-time' })
  endTime: string;
}

// ── Response Data ──────────────────────────────────────────────────────────

export class BookingCourtData {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Sân Cầu Lông ABC' })
  name: string;

  @ApiProperty({ example: 'BADMINTON' })
  sportType: string;
}

export class BookingData {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  courtId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  userId: string;

  @ApiProperty({ example: '2026-06-15T08:00:00.000Z' })
  startTime: string;

  @ApiProperty({ example: '2026-06-15T10:00:00.000Z' })
  endTime: string;

  @ApiProperty({ example: 200000 })
  totalPrice: number;

  @ApiProperty({ example: 'CONFIRMED', enum: ['CONFIRMED', 'CANCELLED'] })
  status: string;

  @ApiProperty({ example: '2026-05-04T10:00:00.000Z' })
  createdAt: string;
}

export class BookingWithCourtData extends BookingData {
  @ApiProperty({ type: BookingCourtData, required: false })
  court?: BookingCourtData;
}

export class ScheduleBookingData {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '2026-06-15T08:00:00.000Z' })
  startTime: string;

  @ApiProperty({ example: '2026-06-15T10:00:00.000Z' })
  endTime: string;

  @ApiProperty({ example: 'CONFIRMED', enum: ['CONFIRMED', 'CANCELLED'] })
  status: string;
}

// ── Wrapped Responses ──────────────────────────────────────────────────────

export class BookingResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: BookingData })
  data: BookingData;
}

export class MyBookingsListData {
  @ApiProperty({ type: [BookingWithCourtData] })
  data: BookingWithCourtData[];

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class MyBookingsResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: MyBookingsListData })
  data: MyBookingsListData;
}

export class ScheduleResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [ScheduleBookingData] })
  data: ScheduleBookingData[];
}
