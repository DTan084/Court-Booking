import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Consolidated migration — complete schema from scratch.
 * Replaces the entire original migration chain (23 files) that had
 * cross-referencing issues (columns created after indexes that referenced them).
 *
 * Run: pnpm --filter @court-booking/backend migration:run
 */
export class InitialFullSchema1800000000000 implements MigrationInterface {
  name = 'InitialFullSchema1800000000000';
  // Must be false: CREATE EXTENSION and ALTER TYPE cannot run inside a transaction
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Extensions ────────────────────────────────────────────────────────────
    // Run outside any open transaction
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "btree_gist"`);

    // ── Enums ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."users_role_enum" AS ENUM('USER','ADMIN');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."courts_status_enum" AS ENUM('ACTIVE','INACTIVE','MAINTENANCE');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."courts_court_type_enum" AS ENUM('INDOOR','OUTDOOR');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."bookings_status_enum" AS ENUM('PENDING_PAYMENT','CONFIRMED','CANCELLED','COMPLETED','EXPIRED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."bookings_booking_source_enum" AS ENUM('ONLINE','ADMIN','WALK_IN');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."bookings_cancelled_by_enum" AS ENUM('USER','SYSTEM','ADMIN');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."notifications_type_enum" AS ENUM(
          'BOOKING_CONFIRMED','BOOKING_CANCELLED','BOOKING_REMINDER',
          'PAYMENT_REMINDER','SYSTEM_ANNOUNCEMENT','BOOKING_COMPLETED'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    // ── Users ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"            uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "name"          varchar(100)  NOT NULL,
        "email"         varchar(255)  NOT NULL,
        "password_hash" varchar(255)  NOT NULL,
        "role"          "public"."users_role_enum" NOT NULL DEFAULT 'USER',
        "phone"         varchar(20),
        "avatar_url"    varchar(500),
        "dob"           date,
        "updated_at"    TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email")`);

    // ── Refresh Tokens ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id"         uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"    uuid          NOT NULL,
        "token"      varchar(255)  NOT NULL,
        "expires_at" TIMESTAMPTZ   NOT NULL,
        "revoked"    boolean       NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_refresh_tokens_token" UNIQUE ("token"),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")`,
    );

    // ── Sport Types ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sport_types" (
        "id"            uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "name"          varchar(50)   NOT NULL,
        "icon"          varchar(100),
        "color"         char(7),
        "is_active"     boolean       NOT NULL DEFAULT true,
        "display_order" integer       NOT NULL DEFAULT 0,
        "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sport_types" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sport_types_name" UNIQUE ("name")
      )
    `);

    // ── Features ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "features" (
        "id"          uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "name"        varchar(100)  NOT NULL,
        "icon"        varchar(100),
        "category"    varchar(50),
        "is_active"   boolean       NOT NULL DEFAULT true,
        "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_features" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_features_name" UNIQUE ("name")
      )
    `);

    // ── Slot Templates ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "slot_templates" (
        "id"          uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "name"        varchar(100)  NOT NULL,
        "description" text,
        "is_active"   boolean       NOT NULL DEFAULT true,
        "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_slot_templates" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "slot_template_items" (
        "id"          uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "template_id" uuid         NOT NULL,
        "day_of_week" smallint     NOT NULL,
        "start_hour"  time         NOT NULL,
        "end_hour"    time         NOT NULL,
        "price"       decimal(10,2) NOT NULL,
        CONSTRAINT "PK_slot_template_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_slot_template_items_day" CHECK ("day_of_week" BETWEEN 0 AND 6),
        CONSTRAINT "UQ_slot_template_item_unique" UNIQUE ("template_id","day_of_week","start_hour"),
        CONSTRAINT "FK_slot_template_items_template" FOREIGN KEY ("template_id") REFERENCES "slot_templates"("id") ON DELETE CASCADE
      )
    `);

    // ── Courts ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "courts" (
        "id"              uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "name"            varchar(150)  NOT NULL,
        "address"         text          NOT NULL,
        "district"        varchar(100),
        "description"     text,
        "price_per_hour"  numeric(10,2) NOT NULL DEFAULT 150000,
        "status"          "public"."courts_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "court_type"      "public"."courts_court_type_enum" NOT NULL DEFAULT 'OUTDOOR',
        "is_featured"     boolean       NOT NULL DEFAULT false,
        "max_players"     integer,
        "sport_type_id"   uuid,
        "deleted_at"      TIMESTAMPTZ,
        "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_courts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_courts_sport_type" FOREIGN KEY ("sport_type_id") REFERENCES "sport_types"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_courts_status" ON "courts" ("status") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_courts_district" ON "courts" ("district") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_courts_sport_type_id" ON "courts" ("sport_type_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_courts_is_featured" ON "courts" ("is_featured")`,
    );

    // ── Court Images ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "court_images" (
        "id"          uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "court_id"    uuid          NOT NULL,
        "url"         varchar(500)  NOT NULL,
        "alt_text"    varchar(200),
        "display_order" integer     NOT NULL DEFAULT 0,
        "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_court_images" PRIMARY KEY ("id"),
        CONSTRAINT "FK_court_images_court" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_court_images_court_id" ON "court_images" ("court_id", "display_order")`,
    );

    // ── Court Time Slots ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "court_time_slots" (
        "id"          uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "court_id"    uuid          NOT NULL,
        "template_id" uuid,
        "day_of_week" smallint      NOT NULL,
        "start_hour"  smallint      NOT NULL,
        "end_hour"    smallint      NOT NULL,
        "price"       numeric(10,2) NOT NULL,
        "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_court_time_slots" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_court_time_slots_day" CHECK ("day_of_week" BETWEEN 0 AND 6),
        CONSTRAINT "CHK_court_time_slots_hours" CHECK ("start_hour" < "end_hour"),
        CONSTRAINT "UQ_court_time_slot_unique" UNIQUE ("court_id","day_of_week","start_hour"),
        CONSTRAINT "FK_court_time_slots_court" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_court_time_slots_template" FOREIGN KEY ("template_id") REFERENCES "slot_templates"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_court_time_slots_court_day" ON "court_time_slots" ("court_id","day_of_week")`,
    );

    // ── Court Features ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "court_features" (
        "id"          uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "court_id"    uuid        NOT NULL,
        "feature_id"  uuid        NOT NULL,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_court_features" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_court_feature_pair" UNIQUE ("court_id","feature_id"),
        CONSTRAINT "FK_court_features_court" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_court_features_feature" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_court_features_court_id" ON "court_features" ("court_id")`,
    );

    // ── Bookings ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bookings" (
        "id"                  uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"             uuid,
        "court_id"            uuid          NOT NULL,
        "start_time"          TIMESTAMPTZ   NOT NULL,
        "end_time"            TIMESTAMPTZ   NOT NULL,
        "status"              "public"."bookings_status_enum" NOT NULL DEFAULT 'PENDING_PAYMENT',
        "total_price"         numeric(10,2) NOT NULL,
        "payment_deadline"    TIMESTAMPTZ,
        "paid_at"             TIMESTAMPTZ,
        "payment_method"      varchar(50),
        "expired_at"          TIMESTAMPTZ,
        "completed_at"        TIMESTAMPTZ,
        "checked_in_at"       TIMESTAMPTZ,
        "cancelled_at"        TIMESTAMPTZ,
        "cancelled_by"        "public"."bookings_cancelled_by_enum",
        "cancelled_reason"    varchar(100),
        "cancellation_note"   text,
        "refunded_at"         TIMESTAMPTZ,
        "refund_amount"       decimal(10,2),
        "booking_source"      "public"."bookings_booking_source_enum" NOT NULL DEFAULT 'ONLINE',
        "guest_name"          varchar(100),
        "guest_phone"         varchar(20),
        "note"                text,
        "booking_reminder_sent"  boolean   NOT NULL DEFAULT false,
        "payment_reminder_sent"  boolean   NOT NULL DEFAULT false,
        "created_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bookings" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_bookings_time_range" CHECK ("start_time" < "end_time"),
        CONSTRAINT "CHK_bookings_total_price_non_negative" CHECK ("total_price" >= 0),
        CONSTRAINT "FK_bookings_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_bookings_court" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_user_id" ON "bookings" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_court_id" ON "bookings" ("court_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_status" ON "bookings" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_court_time_status" ON "bookings" ("court_id","start_time","status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_pending_deadline" ON "bookings" ("payment_deadline") WHERE status = 'PENDING_PAYMENT'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_confirmed_endtime" ON "bookings" ("end_time") WHERE status = 'CONFIRMED'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_booking_source" ON "bookings" ("booking_source")`,
    );

    // ── Notifications ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id"          uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"     uuid          NOT NULL,
        "booking_id"  uuid,
        "type"        "public"."notifications_type_enum" NOT NULL,
        "title"       varchar(200)  NOT NULL,
        "message"     text          NOT NULL,
        "is_read"     boolean       NOT NULL DEFAULT false,
        "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notifications_user_is_read" ON "notifications" ("user_id","is_read")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notifications_user_created_at" ON "notifications" ("user_id","created_at" DESC)`,
    );

    // ── System Settings ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "id"          uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "key"         varchar(100)  NOT NULL,
        "value"       text          NOT NULL,
        "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_system_settings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_system_settings_key" UNIQUE ("key")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "system_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bookings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "court_features"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "court_time_slots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "court_images"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "courts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "slot_template_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "slot_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "features"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sport_types"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."notifications_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."bookings_cancelled_by_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."bookings_booking_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."bookings_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."courts_court_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."courts_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
  }
}
