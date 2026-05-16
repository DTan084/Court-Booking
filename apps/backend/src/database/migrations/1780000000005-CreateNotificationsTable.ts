import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsTable1780000000005 implements MigrationInterface {
  name = 'CreateNotificationsTable1780000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "notifications_type_enum" AS ENUM(
        'BOOKING_CONFIRMED',
        'PAYMENT_REMINDER',
        'BOOKING_REMINDER',
        'BOOKING_EXPIRED',
        'BOOKING_CANCELLED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" "notifications_type_enum" NOT NULL,
        "title" character varying(255) NOT NULL,
        "message" text NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "booking_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user_id" ON "notifications" ("user_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications" 
      ADD CONSTRAINT "FK_notifications_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications" 
      ADD CONSTRAINT "FK_notifications_booking_id" 
      FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_booking_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_notifications_user_id"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "notifications_type_enum"`);
  }
}
