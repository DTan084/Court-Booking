import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenCourtTimeSlotsAndDistrictIndex1781000000000 implements MigrationInterface {
  name = 'HardenCourtTimeSlotsAndDistrictIndex1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_courts_district"`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_courts_district_lower"
      ON "courts" (LOWER("district"))
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "court_time_slots"
      ADD CONSTRAINT "CHK_court_time_slots_day_of_week"
      CHECK ("day_of_week" >= 0 AND "day_of_week" <= 6)
    `);
    await queryRunner.query(`
      ALTER TABLE "court_time_slots"
      ADD CONSTRAINT "CHK_court_time_slots_hour_range"
      CHECK (
        "start_hour" >= 0 AND "start_hour" <= 23 AND
        "end_hour" > 0 AND "end_hour" <= 24 AND
        "start_hour" < "end_hour"
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "court_time_slots"
      ADD CONSTRAINT "CHK_court_time_slots_price_non_negative"
      CHECK ("price" >= 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "court_time_slots" DROP CONSTRAINT IF EXISTS "CHK_court_time_slots_price_non_negative"`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_time_slots" DROP CONSTRAINT IF EXISTS "CHK_court_time_slots_hour_range"`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_time_slots" DROP CONSTRAINT IF EXISTS "CHK_court_time_slots_day_of_week"`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_courts_district_lower"`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_courts_district"
      ON "courts" ("district")
      WHERE "deleted_at" IS NULL
    `);
  }
}
