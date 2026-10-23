import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Inventario por unidad (filas de descripción y cantidad). Generada con
 * `migration:generate`, depurada para dejar solo lo de `unidad_inventario`.
 */
export class CreateUnidadInventario1792763213832 implements MigrationInterface {
  name = 'CreateUnidadInventario1792763213832';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "unidad_inventario" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "id" BIGSERIAL NOT NULL, "unidad_id" bigint NOT NULL, "descripcion" character varying(1024) NOT NULL, "cantidad" integer NOT NULL DEFAULT '1', CONSTRAINT "CHK_unidad_inventario_cantidad" CHECK ("cantidad" >= 1), CONSTRAINT "PK_2ccebf05b88aa3dda228c588dc4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_unidad_inventario_unidad" ON "unidad_inventario" ("unidad_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad_inventario" ADD CONSTRAINT "FK_988f74acab0187d5c16e3abcb56" FOREIGN KEY ("unidad_id") REFERENCES "unidad"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "unidad_inventario" DROP CONSTRAINT "FK_988f74acab0187d5c16e3abcb56"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_unidad_inventario_unidad"`,
    );
    await queryRunner.query(`DROP TABLE "unidad_inventario"`);
  }
}
