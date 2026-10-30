import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Proyectos de unidades de Decanato hacia abajo (`tipo` libre + `detalle`) y
 * su vínculo con una o varias unidades (proyectos conjuntos).
 */
export class CreateProyecto1793200000000 implements MigrationInterface {
  name = 'CreateProyecto1793200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "proyecto" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "id" BIGSERIAL NOT NULL, "tipo" character varying(120) NOT NULL, "detalle" text NOT NULL, CONSTRAINT "PK_proyecto" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "proyecto_unidad" ("proyecto_id" bigint NOT NULL, "unidad_id" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_proyecto_unidad" PRIMARY KEY ("proyecto_id", "unidad_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_proyecto_unidad_unidad" ON "proyecto_unidad" ("unidad_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "proyecto_unidad" ADD CONSTRAINT "FK_proyecto_unidad_proyecto" FOREIGN KEY ("proyecto_id") REFERENCES "proyecto"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "proyecto_unidad" ADD CONSTRAINT "FK_proyecto_unidad_unidad" FOREIGN KEY ("unidad_id") REFERENCES "unidad"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "proyecto_unidad" DROP CONSTRAINT "FK_proyecto_unidad_unidad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "proyecto_unidad" DROP CONSTRAINT "FK_proyecto_unidad_proyecto"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_proyecto_unidad_unidad"`);
    await queryRunner.query(`DROP TABLE "proyecto_unidad"`);
    await queryRunner.query(`DROP TABLE "proyecto"`);
  }
}
