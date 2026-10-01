import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUniqueSiglaInUnidad1787500000000 implements MigrationInterface {
  name = 'DropUniqueSiglaInUnidad1787500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "unidad" DROP CONSTRAINT IF EXISTS "UQ_07cd99340fb171274e5bfed5963"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_07cd99340fb171274e5bfed596"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_07cd99340fb171274e5bfed596" ON "unidad" ("sigla") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Falla si existen unidades con siglas repetidas; deben resolverse antes de revertir.
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_07cd99340fb171274e5bfed596"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_07cd99340fb171274e5bfed596" ON "unidad" ("sigla") `,
    );
    await queryRunner.query(
      `ALTER TABLE "unidad" ADD CONSTRAINT "UQ_07cd99340fb171274e5bfed5963" UNIQUE ("sigla")`,
    );
  }
}
