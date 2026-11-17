import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El tipo y el detalle de un programa pasan a ser opcionales: solo el
 * `nombre` sigue siendo obligatorio.
 */
export class ProgramaTipoDetalleOpcionales1793800000000 implements MigrationInterface {
  name = 'ProgramaTipoDetalleOpcionales1793800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "programa" ALTER COLUMN "tipo_programa_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "programa" ALTER COLUMN "detalle" DROP NOT NULL`,
    );
  }

  /** Falla si quedan programas sin tipo: hay que asignarles uno antes de revertir. */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "programa" SET "detalle" = '' WHERE "detalle" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "programa" ALTER COLUMN "detalle" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "programa" ALTER COLUMN "tipo_programa_id" SET NOT NULL`,
    );
  }
}
