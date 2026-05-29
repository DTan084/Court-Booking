import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillSuccessfulPaymentId1800000000004 implements MigrationInterface {
  name = 'BackfillSuccessfulPaymentId1800000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE bookings b
      SET successful_payment_id = p.id
      FROM payments p
      WHERE b.status = 'CONFIRMED'
        AND b.successful_payment_id IS NULL
        AND p.booking_id = b.id
        AND p.status = 'SUCCESS'
        AND p.completed_at IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // no-op: irreversible data backfill
    await queryRunner.query('SELECT 1');
  }
}
