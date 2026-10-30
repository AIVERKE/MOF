import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Filas SIA por unidad de tipo Carrera (aprobados, reprobados, matriculados).
 * Generada con `migration:generate`, depurada para dejar solo lo de `unidad_sia`.
 */
export class CreateUnidadSia1792764747904 implements MigrationInterface {
  name = 'CreateUnidadSia1792764747904';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "unidad_sia" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "id" BIGSERIAL NOT NULL, "unidad_id" bigint NOT NULL, "aprobados" integer, "reprobados" integer, "matriculados" integer, CONSTRAINT "CHK_unidad_sia_matriculados" CHECK ("matriculados" IS NULL OR "matriculados" >= 0), CONSTRAINT "CHK_unidad_sia_reprobados" CHECK ("reprobados" IS NULL OR "reprobados" >= 0), CONSTRAINT "CHK_unidad_sia_aprobados" CHECK ("aprobados" IS NULL OR "aprobados" >= 0), CONSTRAINT "PK_6067b3c9974be97796e62468835" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unidad_sia_unidad" ON "unidad_sia" ("unidad_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad_sia" ADD CONSTRAINT "FK_9f69b69cbfc18d92349c5999e9d" FOREIGN KEY ("unidad_id") REFERENCES "unidad"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "unidad_sia" DROP CONSTRAINT "FK_9f69b69cbfc18d92349c5999e9d"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_unidad_sia_unidad"`);
    await queryRunner.query(`DROP TABLE "unidad_sia"`);
  }
}
