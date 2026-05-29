import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOAuthColumnsToUsers1800000000006 implements MigrationInterface {
  name = 'AddOAuthColumnsToUsers1800000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_provider" varchar(30)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_provider_user_id" varchar(255)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_auth_provider_user_id"
       ON "users" ("auth_provider", "auth_provider_user_id")
       WHERE "auth_provider" IS NOT NULL AND "auth_provider_user_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_users_auth_provider_user_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "auth_provider_user_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "auth_provider"`);
  }
}
