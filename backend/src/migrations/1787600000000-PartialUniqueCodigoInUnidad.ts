import { MigrationInterface, QueryRunner } from 'typeorm';

export class PartialUniqueCodigoInUnidad1787600000000 implements MigrationInterface {
  name = 'PartialUniqueCodigoInUnidad1787600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "unidad" DROP CONSTRAINT IF EXISTS "UQ_861ec82ab1c13cb0a2ee94d10a1"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_861ec82ab1c13cb0a2ee94d10a"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_unidad_codigo_activo" ON "unidad" ("codigo") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Falla si existen unidades (activas o borradas) con códigos repetidos; deben resolverse antes de revertir.
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_unidad_codigo_activo"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_861ec82ab1c13cb0a2ee94d10a" ON "unidad" ("codigo") `,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" ADD CONSTRAINT "UQ_861ec82ab1c13cb0a2ee94d10a1" UNIQUE ("codigo")`,
    );
  }
}
