import { ApiProperty } from '@nestjs/swagger';

/**
 * Shared Swagger response classes.
 * These are documentation-only classes — not used for runtime validation.
 */

// ── Error Response ─────────────────────────────────────────────────────────

export class ApiErrorDetail {
  @ApiProperty({ example: 'NOT_FOUND' })
  code: string;

  @ApiProperty({ example: 'Resource not found' })
  message: string;

  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: '2026-05-04T10:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/v1/courts/123' })
  path: string;

  @ApiProperty({ example: '1746350400000-abc123xyz', required: false })
  requestId?: string;
}

export class ApiErrorResponse {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ type: ApiErrorDetail })
  error: ApiErrorDetail;
}

// ── Pagination Meta ────────────────────────────────────────────────────────

export class PaginationMeta {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 10 })
  totalPages: number;
}
