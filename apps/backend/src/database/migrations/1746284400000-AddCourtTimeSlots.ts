import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCourtTimeSlots1746284400000 implements MigrationInterface {
  name = 'AddCourtTimeSlots1746284400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.courts') IS NOT NULL THEN
          CREATE TABLE IF NOT EXISTS "court_time_slots" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "court_id" uuid NOT NULL,
            "day_of_week" smallint NOT NULL,
            "start_hour" smallint NOT NULL,
            "end_hour" smallint NOT NULL,
            "price" numeric(10,2) NOT NULL,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_court_time_slots" PRIMARY KEY ("id"),
            CONSTRAINT "FK_court_time_slots_court" FOREIGN KEY ("court_id")
              REFERENCES "courts"("id") ON DELETE CASCADE
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_court_time_slots_court_day"
      ON "court_time_slots" ("court_id", "day_of_week")
    `);

    // Keep price_per_hour as reference price for display in court list
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_court_time_slots_court_day"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "court_time_slots"`);
  }
}
