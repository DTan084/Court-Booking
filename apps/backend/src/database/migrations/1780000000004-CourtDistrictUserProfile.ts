import { MigrationInterface, QueryRunner } from 'typeorm';

export class CourtDistrictUserProfile1780000000004 implements MigrationInterface {
  name = 'CourtDistrictUserProfile1780000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // REQ-21.1: Add district to courts
    await queryRunner.query(`
      ALTER TABLE "courts"
        ADD COLUMN IF NOT EXISTS "district" VARCHAR(100)
    `);

    // Index for case-insensitive district filter (REQ-21.3)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_courts_district"
        ON "courts" (LOWER("district"))
        WHERE "deleted_at" IS NULL
    `);

    // REQ-22.1: Add phone and avatar_url to users
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "phone"      VARCHAR(20),
        ADD COLUMN IF NOT EXISTS "avatar_url" VARCHAR(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "avatar_url"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "phone"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_courts_district"`);
    await queryRunner.query(`ALTER TABLE "courts" DROP COLUMN IF EXISTS "district"`);
  }
}
