import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1777777777777 implements MigrationInterface {
  name = 'AddPerformanceIndexes1777777777777';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add composite index for user bookings query (userId + startTime + status)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_bookings_user_time_status" 
      ON "bookings" ("user_id", "start_time" DESC, "status")
    `);

    // Add index for booking overlap check (courtId + startTime + endTime + status)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_bookings_overlap_check" 
      ON "bookings" ("court_id", "start_time", "end_time", "status")
    `);

    // Add index for refresh token lookup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_token" 
      ON "refresh_tokens" ("token")
    `);

    // Add index for refresh token cleanup (expiresAt)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_expires" 
      ON "refresh_tokens" ("expires_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_user_time_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_overlap_check"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_refresh_tokens_token"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_refresh_tokens_expires"`);
  }
}
