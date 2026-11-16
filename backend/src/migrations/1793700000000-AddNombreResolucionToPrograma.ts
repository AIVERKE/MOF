import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Los programas ganan `nombre` (obligatorio, para identificarlos) y
 * `resolucion` (texto libre opcional). Los programas existentes toman como
 * nombre su `detalle`, que puede editarse después desde el formulario.
 */
export class AddNombreResolucionToPrograma1793700000000 implements MigrationInterface {
  name = 'AddNombreResolucionToPrograma1793700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "programa" ADD "nombre" text`);
    await queryRunner.query(`UPDATE "programa" SET "nombre" = "detalle"`);
    await queryRunner.query(
      `ALTER TABLE "programa" ALTER COLUMN "nombre" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "programa" ADD "resolucion" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "programa" DROP COLUMN "resolucion"`);
    await queryRunner.query(`ALTER TABLE "programa" DROP COLUMN "nombre"`);
  }
}
