import { MigrationInterface, QueryRunner } from 'typeorm';

export class CourtBookingV3Core1783000000000 implements MigrationInterface {
  name = 'CourtBookingV3Core1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sport_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(50) NOT NULL,
        "icon" character varying(100),
        "color" character(7),
        "is_active" boolean NOT NULL DEFAULT true,
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sport_types" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sport_types_name" UNIQUE ("name")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "sport_types" ("name","icon","color","display_order")
      VALUES
        ('Bóng đá','⚽','#4CAF50',1),
        ('Cầu lông','🏸','#2196F3',2),
        ('Tennis','🎾','#FF9800',3),
        ('Bóng rổ','🏀','#FF5722',4),
        ('Bóng chuyền','🏐','#9C27B0',5),
        ('Pickleball','🏓','#00BCD4',6)
      ON CONFLICT ("name") DO NOTHING
    `);

    await queryRunner.query(
      `ALTER TABLE "courts" ADD COLUMN IF NOT EXISTS "is_featured" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "courts" ADD COLUMN IF NOT EXISTS "max_players" integer`);
    await queryRunner.query(`ALTER TABLE "courts" ADD COLUMN IF NOT EXISTS "sport_type_id" uuid`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_courts_sport_type_id" ON "courts" ("sport_type_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_courts_is_featured" ON "courts" ("is_featured")`,
    );
    await queryRunner.query(`
      UPDATE "courts"
      SET "sport_type_id" = st.id
      FROM "sport_types" st
      WHERE (
        (courts.sport_type = 'FOOTBALL' AND st.name = 'BÃ³ng Ä‘Ã¡')
        OR (courts.sport_type = 'BADMINTON' AND st.name = 'Cáº§u lÃ´ng')
        OR (courts.sport_type = 'TENNIS' AND st.name = 'Tennis')
        OR (courts.sport_type = 'BASKETBALL' AND st.name = 'BÃ³ng rá»•')
        OR (courts.sport_type = 'VOLLEYBALL' AND st.name = 'BÃ³ng chuyá»n')
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "features" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "icon" character varying(100),
        "category" character varying(50),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_features" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_features_name" UNIQUE ("name")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "features" ("name","icon","category")
      VALUES
        ('MÃ¡i che','ðŸ ','CÆ¡ sá»Ÿ váº­t cháº¥t'),
        ('ÄÃ¨n ban Ä‘Ãªm','ðŸ’¡','CÆ¡ sá»Ÿ váº­t cháº¥t'),
        ('Wifi','ðŸ“¶','Dá»‹ch vá»¥'),
        ('BÃ£i Ä‘á»— xe','ðŸ…¿ï¸','CÆ¡ sá»Ÿ váº­t cháº¥t'),
        ('PhÃ²ng thay Ä‘á»“','ðŸšª','CÆ¡ sá»Ÿ váº­t cháº¥t'),
        ('Camera an ninh','ðŸ“·','An toÃ n')
      ON CONFLICT ("name") DO NOTHING
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "court_features" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "court_id" uuid NOT NULL,
        "feature_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_court_features" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_court_feature_pair" UNIQUE ("court_id", "feature_id"),
        CONSTRAINT "FK_court_features_court" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_court_features_feature" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_court_features_court_id" ON "court_features" ("court_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "slot_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_slot_templates" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "slot_template_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "template_id" uuid NOT NULL,
        "day_of_week" smallint NOT NULL,
        "start_hour" time NOT NULL,
        "end_hour" time NOT NULL,
        "price" decimal(10,2) NOT NULL,
        CONSTRAINT "PK_slot_template_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_slot_template_items_day" CHECK ("day_of_week" BETWEEN 0 AND 6),
        CONSTRAINT "UQ_slot_template_item_unique" UNIQUE ("template_id", "day_of_week", "start_hour"),
        CONSTRAINT "FK_slot_template_items_template" FOREIGN KEY ("template_id") REFERENCES "slot_templates"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "court_time_slots"
      ADD COLUMN IF NOT EXISTS "template_id" uuid,
      ADD CONSTRAINT "FK_court_time_slots_template" FOREIGN KEY ("template_id") REFERENCES "slot_templates"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(
      `CREATE TYPE "public"."bookings_booking_source_enum" AS ENUM('ONLINE','ADMIN','WALK_IN')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."bookings_cancelled_by_enum" AS ENUM('USER','SYSTEM','ADMIN')`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "booking_source" "public"."bookings_booking_source_enum" NOT NULL DEFAULT 'ONLINE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "guest_name" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "guest_phone" character varying(20)`,
    );
    await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "note" text`);
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "transaction_id" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "checked_in_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancelled_by" "public"."bookings_cancelled_by_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancelled_reason" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancellation_note" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "refunded_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "refund_amount" decimal(10,2)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_bookings_transaction_id" ON "bookings" ("transaction_id") WHERE "transaction_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_booking_source" ON "bookings" ("booking_source")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_booking_source"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_bookings_transaction_id"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "refund_amount"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "refunded_at"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "cancellation_note"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "cancelled_reason"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "cancelled_by"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "checked_in_at"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "transaction_id"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "note"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "guest_phone"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "guest_name"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "booking_source"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."bookings_cancelled_by_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."bookings_booking_source_enum"`);

    await queryRunner.query(
      `ALTER TABLE "court_time_slots" DROP CONSTRAINT IF EXISTS "FK_court_time_slots_template"`,
    );
    await queryRunner.query(`ALTER TABLE "court_time_slots" DROP COLUMN IF EXISTS "template_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "slot_template_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "slot_templates"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_court_features_court_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "court_features"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "features"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_courts_is_featured"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_courts_sport_type_id"`);
    await queryRunner.query(`ALTER TABLE "courts" DROP COLUMN IF EXISTS "sport_type_id"`);
    await queryRunner.query(`ALTER TABLE "courts" DROP COLUMN IF EXISTS "max_players"`);
    await queryRunner.query(`ALTER TABLE "courts" DROP COLUMN IF EXISTS "is_featured"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sport_types"`);
  }
}
