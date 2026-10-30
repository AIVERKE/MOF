import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bloque de Planificación Estratégica en la ficha de la unidad: switch de
 * aplicabilidad, porcentaje 0–100 y descripción.
 */
export class AddPlanificacionEstrategicaToUnidad1792800000000 implements MigrationInterface {
  name = 'AddPlanificacionEstrategicaToUnidad1792800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "unidad" ADD COLUMN IF NOT EXISTS "planificacion_estrategica_aplica" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" ADD COLUMN IF NOT EXISTS "planificacion_estrategica_valor" numeric(5,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" ADD COLUMN IF NOT EXISTS "planificacion_estrategica" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" ADD CONSTRAINT "CHK_unidad_planificacion_estrategica_valor" CHECK ("planificacion_estrategica_valor" IS NULL OR ("planificacion_estrategica_valor" >= 0 AND "planificacion_estrategica_valor" <= 100))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "unidad" DROP CONSTRAINT IF EXISTS "CHK_unidad_planificacion_estrategica_valor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" DROP COLUMN IF EXISTS "planificacion_estrategica"`,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" DROP COLUMN IF EXISTS "planificacion_estrategica_valor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" DROP COLUMN IF EXISTS "planificacion_estrategica_aplica"`,
    );
  }
}
