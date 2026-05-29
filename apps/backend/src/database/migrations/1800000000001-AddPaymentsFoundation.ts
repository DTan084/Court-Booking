import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentsFoundation1800000000001 implements MigrationInterface {
  name = 'AddPaymentsFoundation1800000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."payments_status_enum" AS ENUM(
          'PENDING',
          'PROCESSING',
          'SUCCESS',
          'FAILED',
          'CANCELLED',
          'REFUNDED',
          'PARTIAL_REFUND',
          'RECONCILING'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."payment_events_direction_enum" AS ENUM('IN', 'OUT');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_providers" (
        "id"          uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "code"        varchar(20)  NOT NULL UNIQUE,
        "name"        varchar(100) NOT NULL,
        "is_active"   boolean      NOT NULL DEFAULT true,
        "config"      jsonb,
        "created_at"  timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_providers" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id"                uuid            NOT NULL DEFAULT uuid_generate_v4(),
        "booking_id"        uuid            NOT NULL,
        "provider_code"     varchar(20)     NOT NULL,
        "amount"            decimal(12,2)   NOT NULL,
        "currency"          char(3)         NOT NULL DEFAULT 'VND',
        "amount_in_usd"     decimal(10,4),
        "status"            "public"."payments_status_enum" NOT NULL DEFAULT 'PENDING',
        "provider_txn_id"   varchar(200),
        "provider_order_id" varchar(200),
        "provider_ref_code" varchar(200),
        "provider_raw"      jsonb,
        "initiated_at"      timestamptz     NOT NULL DEFAULT now(),
        "completed_at"      timestamptz,
        "refunded_at"       timestamptz,
        "refund_amount"     decimal(12,2),
        "initiated_by"      uuid,
        "created_at"        timestamptz     NOT NULL DEFAULT now(),
        "updated_at"        timestamptz     NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payments_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_payments_provider" FOREIGN KEY ("provider_code") REFERENCES "payment_providers"("code") ON DELETE RESTRICT,
        CONSTRAINT "FK_payments_initiated_by" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_events" (
        "id"          uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "payment_id"  uuid         NOT NULL,
        "event_type"  varchar(50)  NOT NULL,
        "direction"   "public"."payment_events_direction_enum" NOT NULL,
        "payload"     jsonb        NOT NULL,
        "ip_address"  inet,
        "is_verified" boolean,
        "created_at"  timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payment_events_payment" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_payments_booking" ON "payments" ("booking_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_payments_provider_status" ON "payments" ("provider_code", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_payments_txn" ON "payments" ("provider_txn_id") WHERE "provider_txn_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_payments_provider_order" ON "payments" ("provider_code", "provider_order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_payment_events_payment_created" ON "payment_events" ("payment_id", "created_at" DESC)`,
    );

    await queryRunner.query(`
      ALTER TABLE "bookings"
      ADD COLUMN IF NOT EXISTS "successful_payment_id" uuid;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "bookings"
        ADD CONSTRAINT "FK_bookings_successful_payment"
        FOREIGN KEY ("successful_payment_id")
        REFERENCES "payments"("id")
        ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_successful_payment_id" ON "bookings" ("successful_payment_id")`,
    );

    await queryRunner.query(`
      INSERT INTO "payment_providers" ("code", "name")
      VALUES
        ('VNPAY', 'VNPay'),
        ('MOMO', 'MoMo'),
        ('PAYPAL', 'PayPal')
      ON CONFLICT ("code") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_successful_payment_id"`);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "bookings" DROP CONSTRAINT "FK_bookings_successful_payment";
      EXCEPTION WHEN undefined_object THEN NULL; END $$;
    `);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "successful_payment_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payment_events_payment_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_payments_provider_order"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_txn"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_provider_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_booking"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "payment_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_providers"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."payment_events_direction_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."payments_status_enum"`);
  }
}
