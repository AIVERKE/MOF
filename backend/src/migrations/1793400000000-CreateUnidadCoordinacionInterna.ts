import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Textos libres de la coordinación interna de una unidad (sección O del MOF).
 * Conviven con las unidades vinculadas de `unidad_relacion_interna`.
 */
export class CreateUnidadCoordinacionInterna1793400000000 implements MigrationInterface {
  name = 'CreateUnidadCoordinacionInterna1793400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "unidad_coordinacion_interna" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "id" BIGSERIAL NOT NULL, "unidad_id" bigint NOT NULL, "descripcion" text NOT NULL, CONSTRAINT "PK_unidad_coordinacion_interna" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unidad_coordinacion_interna_unidad" ON "unidad_coordinacion_interna" ("unidad_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad_coordinacion_interna" ADD CONSTRAINT "FK_unidad_coordinacion_interna_unidad" FOREIGN KEY ("unidad_id") REFERENCES "unidad"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "unidad_coordinacion_interna" DROP CONSTRAINT "FK_unidad_coordinacion_interna_unidad"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_unidad_coordinacion_interna_unidad"`,
    );
    await queryRunner.query(`DROP TABLE "unidad_coordinacion_interna"`);
  }
}
