import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestorePricePerHour1746284500000 implements MigrationInterface {
  name = 'RestorePricePerHour1746284500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add back price_per_hour as reference price for display
    await queryRunner.query(`
      ALTER TABLE "courts" 
      ADD COLUMN IF NOT EXISTS "price_per_hour" numeric(10,2) NOT NULL DEFAULT 150000
    `);

    // Update existing courts with their average time slot price
    await queryRunner.query(`
      UPDATE "courts" c
      SET "price_per_hour" = COALESCE(
        (SELECT AVG(price) FROM "court_time_slots" WHERE "court_id" = c.id),
        150000
      )
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Don't drop the column in down migration to avoid data loss
  }
}
