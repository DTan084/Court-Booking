import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeatureIsActive1787000000000 implements MigrationInterface {
  name = 'AddFeatureIsActive1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "features"
      ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "features"
      DROP COLUMN IF EXISTS "is_active"
    `);
  }
}
