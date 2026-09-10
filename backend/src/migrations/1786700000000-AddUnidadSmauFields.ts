import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnidadSmauFields1786700000000 implements MigrationInterface {
  name = 'AddUnidadSmauFields1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "unidad" ADD "tramites_atendidos" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" ADD "ejecucion_poa" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" ADD "ejecucion_presupuestaria" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" ADD "carga_horaria_programada" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" ADD "carga_horaria_ejecutada" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" ADD "infraestructura" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" ADD "ubicacion" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "unidad" DROP COLUMN "ubicacion"`);
    await queryRunner.query(`ALTER TABLE "unidad" DROP COLUMN "infraestructura"`);
    await queryRunner.query(`ALTER TABLE "unidad" DROP COLUMN "carga_horaria_ejecutada"`);
    await queryRunner.query(`ALTER TABLE "unidad" DROP COLUMN "carga_horaria_programada"`);
    await queryRunner.query(`ALTER TABLE "unidad" DROP COLUMN "ejecucion_presupuestaria"`);
    await queryRunner.query(`ALTER TABLE "unidad" DROP COLUMN "ejecucion_poa"`);
    await queryRunner.query(`ALTER TABLE "unidad" DROP COLUMN "tramites_atendidos"`);
  }
}
