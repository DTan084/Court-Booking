import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEnumToUppercase1778320675641 implements MigrationInterface {
  name = 'UpdateEnumToUppercase1778320675641';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop dependent indexes/constraints first
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_pending_deadline"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_confirmed_endtime"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_user_time_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_overlap_check"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_courts_district"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_court_time_status"`); // common index name

    // 1. SportType conversion
    await queryRunner.query(
      `ALTER TYPE "public"."courts_sporttype_enum" RENAME TO "courts_sporttype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."courts_sporttype_enum" AS ENUM('BADMINTON', 'TENNIS', 'FOOTBALL', 'BASKETBALL', 'VOLLEYBALL')`,
    );
    await queryRunner.query(
      `ALTER TABLE "courts" ALTER COLUMN "sportType" TYPE "public"."courts_sporttype_enum" USING UPPER("sportType"::text)::"public"."courts_sporttype_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."courts_sporttype_enum_old"`);

    // 2. BookingStatus conversion
    await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TYPE "public"."bookings_status_enum" RENAME TO "bookings_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."bookings_status_enum" AS ENUM('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'EXPIRED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "status" TYPE "public"."bookings_status_enum" USING UPPER("status"::text)::"public"."bookings_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT'`,
    );
    await queryRunner.query(`DROP TYPE "public"."bookings_status_enum_old"`);

    // 3. UserRole conversion
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`,
    );
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('USER', 'ADMIN')`);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING UPPER("role"::text)::"public"."users_role_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER'`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);

    // Recreate indexes
    await queryRunner.query(
      `CREATE INDEX "idx_courts_district" ON "courts" ("district") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_pending_deadline" ON "bookings" ("payment_deadline") WHERE status = 'PENDING_PAYMENT'`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_confirmed_endtime" ON "bookings" ("end_time") WHERE status = 'CONFIRMED'`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_court_time_status" ON "bookings" ("court_id", "start_time", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_pending_deadline"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_confirmed_endtime"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_court_time_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_courts_district"`);

    // 1. SportType conversion back to lowercase
    await queryRunner.query(
      `ALTER TYPE "public"."courts_sporttype_enum" RENAME TO "courts_sporttype_enum_upper"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."courts_sporttype_enum" AS ENUM('badminton', 'tennis', 'football', 'basketball', 'volleyball')`,
    );
    await queryRunner.query(
      `ALTER TABLE "courts" ALTER COLUMN "sportType" TYPE "public"."courts_sporttype_enum" USING LOWER("sportType"::text)::"public"."courts_sporttype_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."courts_sporttype_enum_upper"`);

    // 2. BookingStatus conversion back to lowercase (legacy set)
    await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TYPE "public"."bookings_status_enum" RENAME TO "bookings_status_enum_upper"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."bookings_status_enum" AS ENUM('confirmed', 'cancelled', 'completed')`,
    );
    await queryRunner.query(`
      ALTER TABLE "bookings"
      ALTER COLUMN "status" TYPE "public"."bookings_status_enum"
      USING (
        CASE
          WHEN "status"::text IN ('PENDING_PAYMENT', 'EXPIRED') THEN 'confirmed'
          ELSE LOWER("status"::text)
        END
      )::"public"."bookings_status_enum"
    `);
    await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'confirmed'`);
    await queryRunner.query(`DROP TYPE "public"."bookings_status_enum_upper"`);

    // 3. UserRole conversion back to lowercase
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_upper"`,
    );
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin')`);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING LOWER("role"::text)::"public"."users_role_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_upper"`);

    // Recreate legacy indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_user_time_status" ON "bookings" ("user_id", "start_time" DESC, "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_bookings_overlap_check" ON "bookings" ("court_id", "start_time", "end_time", "status")`,
    );
  }
}
