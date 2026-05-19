import { ApiProperty } from '@nestjs/swagger';

// ── Request Bodies ─────────────────────────────────────────────────────────

export class CreateCourtBody {
  @ApiProperty({ example: 'ABC Badminton Court' })
  name: string;

  @ApiProperty({
    example: '3faffe20-5fd1-47f5-87d9-bcc9869422b6',
    description: 'Sport type id (required)',
  })
  sportTypeId: string;

  @ApiProperty({ example: '123 Nguyen Hue St, District 1, HCMC' })
  address: string;

  @ApiProperty({ example: 150000 })
  pricePerHour: number;

  @ApiProperty({ example: 'Tournament standard court', required: false })
  description?: string;
}

export class UpdateCourtBody {
  @ApiProperty({ example: 'ABC Badminton Court (Updated)', required: false })
  name?: string;

  @ApiProperty({ example: '3faffe20-5fd1-47f5-87d9-bcc9869422b6', required: false })
  sportTypeId?: string;

  @ApiProperty({ example: '456 Le Loi St, District 1, HCMC', required: false })
  address?: string;

  @ApiProperty({ example: 180000, required: false })
  pricePerHour?: number;

  @ApiProperty({ example: 'Court floor newly upgraded', required: false })
  description?: string;
}

export class TimeSlotBody {
  @ApiProperty({ example: 1, minimum: 0, maximum: 6, description: '0=Sun, 1=Mon, ..., 6=Sat' })
  dayOfWeek: number;

  @ApiProperty({ example: 6, minimum: 0, maximum: 23 })
  startHour: number;

  @ApiProperty({ example: 8, minimum: 1, maximum: 24 })
  endHour: number;

  @ApiProperty({ example: 100000 })
  price: number;
}

export class UpsertTimeSlotsBody {
  @ApiProperty({ type: [TimeSlotBody] })
  slots: TimeSlotBody[];
}

// ── Response Data ──────────────────────────────────────────────────────────

export class CourtData {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'ABC Badminton Court' })
  name: string;

  @ApiProperty({ example: '3faffe20-5fd1-47f5-87d9-bcc9869422b6' })
  sportTypeId: string;

  @ApiProperty({ example: '123 Nguyen Hue St, District 1, HCMC' })
  address: string;

  @ApiProperty({ example: 150000 })
  pricePerHour: number;

  @ApiProperty({ example: 'ACTIVE', enum: ['ACTIVE', 'INACTIVE'] })
  status: string;

  @ApiProperty({ example: '2026-05-04T10:00:00.000Z' })
  createdAt: string;
}

export class TimeSlotData {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 1 })
  dayOfWeek: number;

  @ApiProperty({ example: 6 })
  startHour: number;

  @ApiProperty({ example: 8 })
  endHour: number;

  @ApiProperty({ example: 100000 })
  price: number;
}

export class CourtStatsData {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  courtId: string;

  @ApiProperty({ example: 'ABC Badminton Court' })
  courtName: string;

  @ApiProperty({ example: { from: '2026-05-01', to: '2026-05-31' } })
  period: { from: string; to: string };

  @ApiProperty({ example: 42 })
  totalBookings: number;

  @ApiProperty({ example: 84.5 })
  totalHours: number;

  @ApiProperty({ example: 65.23, description: 'Percentage of available hours booked' })
  utilizationPercentage: number;

  @ApiProperty({ example: 129.5 })
  totalAvailableHours: number;
}

// ── Wrapped Responses ──────────────────────────────────────────────────────

export class CourtResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: CourtData })
  data: CourtData;
}

export class CourtsListData {
  @ApiProperty({ type: [CourtData] })
  data: CourtData[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 10 })
  totalPages: number;
}

export class CourtsListResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: CourtsListData })
  data: CourtsListData;
}

export class TimeSlotsResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [TimeSlotData] })
  data: TimeSlotData[];
}

export class CourtStatsResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: CourtStatsData })
  data: CourtStatsData;
}

export class DeleteCourtResponseData {
  @ApiProperty({ example: 'Court deleted successfully' })
  message: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;
}

export class DeleteCourtResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: DeleteCourtResponseData })
  data: DeleteCourtResponseData;
}
