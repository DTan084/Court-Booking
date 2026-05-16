import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReminderFlags1780000000006 implements MigrationInterface {
  name = 'AddReminderFlags1780000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "payment_reminder_sent" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "booking_reminder_sent" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "booking_reminder_sent"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "payment_reminder_sent"`);
  }
}
