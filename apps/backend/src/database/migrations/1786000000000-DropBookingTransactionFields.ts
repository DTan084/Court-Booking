import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropBookingTransactionFields1786000000000 implements MigrationInterface {
  name = 'DropBookingTransactionFields1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_bookings_transaction_id_not_null"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_bookings_transaction_id"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "transaction_id"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "payment_ref"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "transaction_id" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_ref" character varying`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_bookings_transaction_id_not_null" ON "bookings" ("transaction_id") WHERE "transaction_id" IS NOT NULL`,
    );
  }
}
