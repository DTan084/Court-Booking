import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeManualReviewIndexes1800000000003 implements MigrationInterface {
  name = 'OptimizeManualReviewIndexes1800000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payment_events_manual_review_lookup"
      ON "payment_events" ("payment_id", "event_type", "created_at" DESC)
      WHERE "event_type" = 'MANUAL_REVIEW_REQUIRED';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payment_events_manual_review_reason"
      ON "payment_events" (("payload"->>'reason'))
      WHERE "event_type" = 'MANUAL_REVIEW_REQUIRED';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payment_events_manual_review_reason"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payment_events_manual_review_lookup"`);
  }
}
