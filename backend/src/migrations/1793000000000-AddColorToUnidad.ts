import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Color propio de la unidad en el organigrama. `NULL` hereda el color de su
 * Clase (`tipo_unidad.color`); las unidades existentes arrancan heredando.
 */
export class AddColorToUnidad1793000000000 implements MigrationInterface {
  name = 'AddColorToUnidad1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "unidad" ADD COLUMN IF NOT EXISTS "color" varchar(7) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" ADD CONSTRAINT "CHK_unidad_color" CHECK ("color" IS NULL OR "color" ~ '^#[0-9A-F]{6}$')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "unidad" DROP CONSTRAINT IF EXISTS "CHK_unidad_color"`,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" DROP COLUMN IF EXISTS "color"`,
    );
  }
}
