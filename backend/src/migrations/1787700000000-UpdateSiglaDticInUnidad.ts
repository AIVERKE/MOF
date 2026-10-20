import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSiglaDticInUnidad1787700000000 implements MigrationInterface {
  name = 'UpdateSiglaDticInUnidad1787700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "unidad"
      SET "sigla" = 'DTIC'
      WHERE ("id" = '147' OR "codigo" = '1.1.0.0.16.0.0.0.0.0.0.0.0')
        AND ("sigla" = 'DTAINCN' OR "sigla" IS NULL OR "sigla" = '')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "unidad"
      SET "sigla" = 'DTAINCN'
      WHERE ("id" = '147' OR "codigo" = '1.1.0.0.16.0.0.0.0.0.0.0.0')
        AND "sigla" = 'DTIC'
    `);
  }
}
