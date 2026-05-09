import { MigrationInterface, QueryRunner } from 'typeorm';

export class BookingStatusPayment1780000000003 implements MigrationInterface {
  name = 'BookingStatusPayment1780000000003';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add new enum values (PostgreSQL requires individual ALTER TYPE statements)
    await queryRunner.query(
      `ALTER TYPE "bookings_status_enum" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT'`,
    );
    await queryRunner.query(`ALTER TYPE "bookings_status_enum" ADD VALUE IF NOT EXISTS 'EXPIRED'`);
    await queryRunner.query(
      `ALTER TYPE "bookings_status_enum" ADD VALUE IF NOT EXISTS 'CONFIRMED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "bookings_status_enum" ADD VALUE IF NOT EXISTS 'CANCELLED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "bookings_status_enum" ADD VALUE IF NOT EXISTS 'COMPLETED'`,
    );

    // 2. Add payment columns to bookings
    await queryRunner.query(`
      ALTER TABLE "bookings"
        ADD COLUMN IF NOT EXISTS "payment_deadline"  TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "paid_at"           TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "payment_method"    VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "payment_ref"       VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "expired_at"        TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "completed_at"      TIMESTAMP WITH TIME ZONE
    `);

    // 3. Index for cron job: PENDING_PAYMENT bookings past their deadline
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_bookings_pending_deadline"
        ON "bookings" ("payment_deadline")
        WHERE status = 'PENDING_PAYMENT'
    `);

    // 4. Index for auto-complete: CONFIRMED bookings past end_time
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_bookings_confirmed_endtime"
        ON "bookings" ("end_time")
        WHERE status = 'CONFIRMED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_confirmed_endtime"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_pending_deadline"`);
    await queryRunner.query(`
      ALTER TABLE "bookings"
        DROP COLUMN IF EXISTS "completed_at",
        DROP COLUMN IF EXISTS "expired_at",
        DROP COLUMN IF EXISTS "payment_ref",
        DROP COLUMN IF EXISTS "payment_method",
        DROP COLUMN IF EXISTS "paid_at",
        DROP COLUMN IF EXISTS "payment_deadline"
    `);
    // Note: PostgreSQL does not support removing enum values.
    // PENDING_PAYMENT and EXPIRED will remain in the enum after rollback.
  }
}
