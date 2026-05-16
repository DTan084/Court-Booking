import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnterpriseTimezoneAndSettings1785000000003 implements MigrationInterface {
  name = 'EnterpriseTimezoneAndSettings1785000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" character varying(100) NOT NULL,
        "value" text NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_system_settings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_system_settings_key" UNIQUE ("key")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "system_settings" ("key", "value")
      VALUES ('default_timezone', 'Asia/Ho_Chi_Minh')
      ON CONFLICT ("key") DO NOTHING
    `);

    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at" AT TIME ZONE 'UTC'`,
    );

    await queryRunner.query(
      `ALTER TABLE "courts" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "courts" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "courts" ALTER COLUMN "deleted_at" TYPE TIMESTAMPTZ USING "deleted_at" AT TIME ZONE 'UTC'`,
    );

    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at" AT TIME ZONE 'UTC'`,
    );

    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ USING "expires_at" AT TIME ZONE 'UTC'`,
    );

    await queryRunner.query(
      `ALTER TABLE "court_time_slots" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_time_slots" ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ USING "updated_at" AT TIME ZONE 'UTC'`,
    );

    await queryRunner.query(
      `ALTER TABLE "court_images" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "features" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "sport_types" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "slot_templates" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_features" ALTER COLUMN "created_at" TYPE TIMESTAMPTZ USING "created_at" AT TIME ZONE 'UTC'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "court_features" ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "slot_templates" ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "sport_types" ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "features" ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_images" ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC'`,
    );

    await queryRunner.query(
      `ALTER TABLE "court_time_slots" ALTER COLUMN "updated_at" TYPE TIMESTAMP USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_time_slots" ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC'`,
    );

    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "expires_at" TYPE TIMESTAMP USING "expires_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC'`,
    );

    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "updated_at" TYPE TIMESTAMP USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC'`,
    );

    await queryRunner.query(
      `ALTER TABLE "courts" ALTER COLUMN "deleted_at" TYPE TIMESTAMP USING "deleted_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "courts" ALTER COLUMN "updated_at" TYPE TIMESTAMP USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "courts" ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC'`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updated_at" TYPE TIMESTAMP USING "updated_at" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "created_at" TYPE TIMESTAMP USING "created_at" AT TIME ZONE 'UTC'`,
    );

    await queryRunner.query(`DELETE FROM "system_settings" WHERE "key" = 'default_timezone'`);
    await queryRunner.query(`DROP TABLE IF EXISTS "system_settings"`);
  }
}
