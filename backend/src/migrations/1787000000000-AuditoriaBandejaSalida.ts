import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Convierte `auditoria_cambio` en la bandeja de salida hacia los sistemas que
 * siguen el organigrama (ver GacetaSyncService).
 *
 * Las columnas nuevas son nulas o con valor por defecto, así que las filas que
 * ya existan quedan como "sin unidad afectada" y no se envían: la migración no
 * dispara una avalancha de eventos históricos al aplicarse.
 */
export class AuditoriaBandejaSalida1787000000000 implements MigrationInterface {
  name = 'AuditoriaBandejaSalida1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "auditoria_cambio"
        ADD COLUMN IF NOT EXISTS "unidad_afectada_id" bigint,
        ADD COLUMN IF NOT EXISTS "enviado_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "intentos" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "ultimo_intento_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "ultimo_error" character varying(512)
    `);

    // El barrido pregunta siempre lo mismo: "eventos del organigrama sin
    // entregar, del más viejo al más nuevo". Índice parcial para que esa
    // consulta no crezca con el histórico ya entregado, que es casi todo.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auditoria_pendientes"
        ON "auditoria_cambio" ("created_at")
        WHERE "enviado_at" IS NULL AND "unidad_afectada_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auditoria_unidad"
        ON "auditoria_cambio" ("unidad_afectada_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_auditoria_tabla"
        ON "auditoria_cambio" ("tabla_afectada")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_auditoria_tabla"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_auditoria_unidad"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_auditoria_pendientes"`);
    await queryRunner.query(`
      ALTER TABLE "auditoria_cambio"
        DROP COLUMN IF EXISTS "ultimo_error",
        DROP COLUMN IF EXISTS "ultimo_intento_at",
        DROP COLUMN IF EXISTS "intentos",
        DROP COLUMN IF EXISTS "enviado_at",
        DROP COLUMN IF EXISTS "unidad_afectada_id"
    `);
  }
}
