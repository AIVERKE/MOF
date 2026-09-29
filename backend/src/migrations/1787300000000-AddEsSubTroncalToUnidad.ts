import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEsSubTroncalToUnidad1787300000000 implements MigrationInterface {
  name = 'AddEsSubTroncalToUnidad1787300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "unidad" ADD COLUMN IF NOT EXISTS "es_sub_troncal" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "unidad" DROP COLUMN IF EXISTS "es_sub_troncal"`,
    );
  }
}
