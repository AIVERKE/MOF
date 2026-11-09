import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El tipo de proyecto deja de ser texto libre y pasa a un catálogo
 * (`tipo_proyecto`) sembrado con los tres programas oficiales. Los usuarios
 * pueden añadir tipos nuevos desde el formulario.
 *
 * Los proyectos existentes se reasignan por palabra clave: "investig" →
 * Programa Investigación; "interacc"/"extens" → Programa Interacción Social y
 * Extensión Universitaria; el resto → Programa Académico.
 */
export class CreateTipoProyecto1793500000000 implements MigrationInterface {
  name = 'CreateTipoProyecto1793500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tipo_proyecto" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "id" SERIAL NOT NULL, "descripcion" text NOT NULL, "activo" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_tipo_proyecto" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `INSERT INTO "tipo_proyecto" ("id", "descripcion") VALUES (1, 'Programa Académico'), (2, 'Programa Investigación'), (3, 'Programa Interacción Social y Extensión Universitaria')`,
    );
    await queryRunner.query(
      `SELECT setval(pg_get_serial_sequence('"tipo_proyecto"', 'id'), (SELECT MAX("id") FROM "tipo_proyecto"))`,
    );

    await queryRunner.query(
      `ALTER TABLE "proyecto" ADD "tipo_proyecto_id" integer`,
    );
    await queryRunner.query(
      `UPDATE "proyecto" SET "tipo_proyecto_id" = CASE
         WHEN "tipo" ILIKE '%investig%' THEN 2
         WHEN "tipo" ILIKE '%interacc%' OR "tipo" ILIKE '%extens%' THEN 3
         ELSE 1
       END`,
    );
    await queryRunner.query(
      `ALTER TABLE "proyecto" ALTER COLUMN "tipo_proyecto_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_proyecto_tipo_proyecto" ON "proyecto" ("tipo_proyecto_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "proyecto" ADD CONSTRAINT "FK_proyecto_tipo_proyecto" FOREIGN KEY ("tipo_proyecto_id") REFERENCES "tipo_proyecto"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "proyecto" DROP COLUMN "tipo"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "proyecto" ADD "tipo" text`);
    await queryRunner.query(
      `UPDATE "proyecto" p SET "tipo" = t."descripcion" FROM "tipo_proyecto" t WHERE t."id" = p."tipo_proyecto_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "proyecto" ALTER COLUMN "tipo" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "proyecto" DROP CONSTRAINT "FK_proyecto_tipo_proyecto"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_proyecto_tipo_proyecto"`);
    await queryRunner.query(
      `ALTER TABLE "proyecto" DROP COLUMN "tipo_proyecto_id"`,
    );
    await queryRunner.query(`DROP TABLE "tipo_proyecto"`);
  }
}
