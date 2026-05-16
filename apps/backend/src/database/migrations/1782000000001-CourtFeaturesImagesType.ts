import { MigrationInterface, QueryRunner } from 'typeorm';

export class CourtFeaturesImagesType1782000000001 implements MigrationInterface {
  name = 'CourtFeaturesImagesType1782000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tweak `courts` table
    await queryRunner.query(`CREATE TYPE "public"."court_type_enum" AS ENUM('INDOOR', 'OUTDOOR')`);
    await queryRunner.query(
      `ALTER TABLE "courts" ADD "court_type" "public"."court_type_enum" NOT NULL DEFAULT 'OUTDOOR'`,
    );
    await queryRunner.query(`ALTER TABLE "courts" ADD "description" TEXT`);
    await queryRunner.query(`ALTER TABLE "courts" ADD "features" TEXT[] NOT NULL DEFAULT '{}'`);

    // Add indices on courts
    await queryRunner.query(
      `CREATE INDEX "idx_courts_court_type" ON "courts" ("court_type") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_courts_features_gin" ON "courts" USING GIN ("features")`,
    );

    // Create court_images
    await queryRunner.query(`
      CREATE TABLE "court_images" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "court_id" uuid NOT NULL,
        "url" character varying(500) NOT NULL,
        "alt_text" character varying(200),
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_court_images" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key for court_images
    await queryRunner.query(
      `ALTER TABLE "court_images" ADD CONSTRAINT "FK_court_images_court" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Add index for court_images
    await queryRunner.query(
      `CREATE INDEX "idx_court_images_court_id" ON "court_images" ("court_id", "display_order")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index and foreign key of court_images
    await queryRunner.query(`DROP INDEX "public"."idx_court_images_court_id"`);
    await queryRunner.query(`ALTER TABLE "court_images" DROP CONSTRAINT "FK_court_images_court"`);

    // Drop court_images table
    await queryRunner.query(`DROP TABLE "court_images"`);

    // Drop indices on courts
    await queryRunner.query(`DROP INDEX "public"."idx_courts_features_gin"`);
    await queryRunner.query(`DROP INDEX "public"."idx_courts_court_type"`);

    // Drop columns from courts
    await queryRunner.query(`ALTER TABLE "courts" DROP COLUMN "features"`);
    await queryRunner.query(`ALTER TABLE "courts" DROP COLUMN "description"`);
    await queryRunner.query(`ALTER TABLE "courts" DROP COLUMN "court_type"`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE "public"."court_type_enum"`);
  }
}
