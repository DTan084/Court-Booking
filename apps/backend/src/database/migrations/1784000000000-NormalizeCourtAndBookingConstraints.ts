import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeCourtAndBookingConstraints1784000000000 implements MigrationInterface {
  name = 'NormalizeCourtAndBookingConstraints1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_courts_features_gin"`);
    await queryRunner.query(`ALTER TABLE "courts" DROP COLUMN IF EXISTS "features"`);
    await queryRunner.query(`ALTER TABLE "courts" DROP COLUMN IF EXISTS "sport_type"`);
    await queryRunner.query(`ALTER TABLE "courts" DROP COLUMN IF EXISTS "sportType"`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_courts_sport_type_id'
        ) THEN
          ALTER TABLE "courts"
          ADD CONSTRAINT "FK_courts_sport_type_id"
          FOREIGN KEY ("sport_type_id") REFERENCES "sport_types"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_court_time_slots_template'
        ) THEN
          ALTER TABLE "court_time_slots"
          ADD CONSTRAINT "FK_court_time_slots_template"
          FOREIGN KEY ("template_id") REFERENCES "slot_templates"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_court_features_court_id_feature_id'
        ) THEN
          ALTER TABLE "court_features"
          ADD CONSTRAINT "UQ_court_features_court_id_feature_id"
          UNIQUE ("court_id", "feature_id");
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_slot_template_items_template_day_start'
        ) THEN
          ALTER TABLE "slot_template_items"
          ADD CONSTRAINT "UQ_slot_template_items_template_day_start"
          UNIQUE ("template_id", "day_of_week", "start_hour");
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'CHK_bookings_user_or_guest'
        ) THEN
          ALTER TABLE "bookings"
          ADD CONSTRAINT "CHK_bookings_user_or_guest"
          CHECK ("user_id" IS NOT NULL OR "guest_name" IS NOT NULL);
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      DECLARE existing_name text;
      BEGIN
        SELECT conname INTO existing_name
        FROM pg_constraint
        WHERE conrelid = 'bookings'::regclass
          AND contype = 'u'
          AND conkey = ARRAY(
            SELECT attnum::smallint FROM pg_attribute
            WHERE attrelid = 'bookings'::regclass AND attname = 'transaction_id'
          );

        IF existing_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE "bookings" DROP CONSTRAINT %I', existing_name);
        END IF;
      END$$;
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_bookings_transaction_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_bookings_transaction_id_not_null"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_bookings_transaction_id_not_null"
      ON "bookings" ("transaction_id")
      WHERE "transaction_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_bookings_transaction_id_not_null"`);
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "CHK_bookings_user_or_guest"`,
    );
    await queryRunner.query(
      `ALTER TABLE "slot_template_items" DROP CONSTRAINT IF EXISTS "UQ_slot_template_items_template_day_start"`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_features" DROP CONSTRAINT IF EXISTS "UQ_court_features_court_id_feature_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_time_slots" DROP CONSTRAINT IF EXISTS "FK_court_time_slots_template"`,
    );
    await queryRunner.query(
      `ALTER TABLE "courts" DROP CONSTRAINT IF EXISTS "FK_courts_sport_type_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "courts" ADD COLUMN IF NOT EXISTS "sport_type" character varying(32)`,
    );
    await queryRunner.query(
      `ALTER TABLE "courts" ADD COLUMN IF NOT EXISTS "features" text[] NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_courts_features_gin" ON "courts" USING GIN ("features")`,
    );
  }
}
