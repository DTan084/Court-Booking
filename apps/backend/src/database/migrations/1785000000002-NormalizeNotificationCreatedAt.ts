import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeNotificationCreatedAt1785000000002 implements MigrationInterface {
  name = 'NormalizeNotificationCreatedAt1785000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ALTER COLUMN "created_at" TYPE TIMESTAMPTZ
      USING "created_at" AT TIME ZONE 'UTC'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ALTER COLUMN "created_at" TYPE TIMESTAMP
      USING "created_at" AT TIME ZONE 'UTC'
    `);
  }
}
