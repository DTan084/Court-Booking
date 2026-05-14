import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserDob1785000000000 implements MigrationInterface {
  name = 'AddUserDob1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "dob" DATE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "dob"`);
  }
}
