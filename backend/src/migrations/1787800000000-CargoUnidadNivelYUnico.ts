import { MigrationInterface, QueryRunner } from 'typeorm';

export class CargoUnidadNivelYUnico1787800000000 implements MigrationInterface {
  name = 'CargoUnidadNivelYUnico1787800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cargo_unidad" ADD COLUMN IF NOT EXISTS "nivel_orden" smallint NULL`,
    );

    // Conserva una fila por (unidad, cargo): primero la activa, luego la de menor id.
    await queryRunner.query(`
      WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY unidad_id, cargo_id
                 ORDER BY activo DESC, id ASC
               ) AS rn
        FROM "cargo_unidad"
        WHERE deleted_at IS NULL
      )
      UPDATE "cargo_unidad" cu
      SET deleted_at = now(), activo = false, updated_at = now()
      FROM ranked r
      WHERE cu.id = r.id AND r.rn > 1
    `);

    await queryRunner.query(`
      UPDATE "cargo_unidad" cu
      SET nivel_orden = c.nivel_orden
      FROM "cargo" c
      WHERE c.id = cu.cargo_id AND cu.nivel_orden IS NULL
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_6d4c270f3561571dede3a9b181"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_cargo_unidad_unidad_cargo" ON "cargo_unidad" ("unidad_id", "cargo_id") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."UQ_cargo_unidad_unidad_cargo"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6d4c270f3561571dede3a9b181" ON "cargo_unidad" ("unidad_id", "cargo_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "cargo_unidad" DROP COLUMN IF EXISTS "nivel_orden"`,
    );
  }
}
