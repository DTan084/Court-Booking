import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOverlapConstraint1778942827464 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist;`);
    await queryRunner.query(`
            ALTER TABLE "bookings"
            ADD CONSTRAINT "no_overlapping_bookings"
            EXCLUDE USING gist (
                "court_id" WITH =,
                tstzrange("start_time", "end_time") WITH &&
            ) WHERE ("status" IN ('CONFIRMED', 'COMPLETED'));
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "no_overlapping_bookings";`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS btree_gist;`);
  }
}
