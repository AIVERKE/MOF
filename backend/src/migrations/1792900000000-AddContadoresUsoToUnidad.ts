import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Métricas de uso por unidad: aperturas de la ficha técnica y descargas del
 * PDF. Las unidades existentes arrancan en 0.
 */
export class AddContadoresUsoToUnidad1792900000000 implements MigrationInterface {
  name = 'AddContadoresUsoToUnidad1792900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "unidad" ADD COLUMN IF NOT EXISTS "vistas_count" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" ADD COLUMN IF NOT EXISTS "descargas_count" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" ADD CONSTRAINT "CHK_unidad_vistas_count" CHECK ("vistas_count" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" ADD CONSTRAINT "CHK_unidad_descargas_count" CHECK ("descargas_count" >= 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "unidad" DROP CONSTRAINT IF EXISTS "CHK_unidad_descargas_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" DROP CONSTRAINT IF EXISTS "CHK_unidad_vistas_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" DROP COLUMN IF EXISTS "descargas_count"`,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" DROP COLUMN IF EXISTS "vistas_count"`,
    );
  }
}
