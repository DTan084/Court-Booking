import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropBookingLegacyPaymentColumns1800000000005 implements MigrationInterface {
  name = 'DropBookingLegacyPaymentColumns1800000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "payment_method"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "refunded_at"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "refund_amount"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_method" varchar(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "refunded_at" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "refund_amount" decimal(10,2)`,
    );
  }
}
