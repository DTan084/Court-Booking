import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenPaymentsIdempotency1800000000002 implements MigrationInterface {
  name = 'HardenPaymentsIdempotency1800000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_payments_provider_txn"
      ON "payments" ("provider_code", "provider_txn_id")
      WHERE "provider_txn_id" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_payments_provider_txn"`);
  }
}
