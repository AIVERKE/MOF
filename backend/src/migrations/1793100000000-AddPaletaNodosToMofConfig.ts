import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Paleta de nodos del organigrama: colores que se asignan por posición de la
 * Clase cuando ni la unidad ni su Clase tienen color. Arranca con los 8
 * colores que el front tenía fijos (`INTENSE_NODE_PALETTE`).
 */
export class AddPaletaNodosToMofConfig1793100000000 implements MigrationInterface {
  name = 'AddPaletaNodosToMofConfig1793100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mof_config" ADD COLUMN IF NOT EXISTS "paleta_nodos" jsonb NOT NULL DEFAULT '["#1D4ED8","#B91C1C","#047857","#B45309","#6D28D9","#BE185D","#0369A1","#C2410C"]'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mof_config" DROP COLUMN IF EXISTS "paleta_nodos"`,
    );
  }
}
