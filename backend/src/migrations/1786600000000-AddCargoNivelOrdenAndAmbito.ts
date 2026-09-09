import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCargoNivelOrdenAndAmbito1786600000000
  implements MigrationInterface
{
  name = 'AddCargoNivelOrdenAndAmbito1786600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cargo" ADD "nivel_orden" smallint`,
    );
    await queryRunner.query(
      `ALTER TABLE "cargo" ADD "ambito" character varying(8)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cargo_nivel_orden" ON "cargo" ("nivel_orden" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_cargo_nivel_orden"`);
    await queryRunner.query(`ALTER TABLE "cargo" DROP COLUMN "ambito"`);
    await queryRunner.query(`ALTER TABLE "cargo" DROP COLUMN "nivel_orden"`);
  }
}
