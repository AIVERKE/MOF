import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marca a los usuarios que todavía no definieron su contraseña.
 *
 * El alta la hace un administrador sin elegir contraseña, así que el usuario
 * nace con este flag en `true` y solo puede entrar por el primer acceso
 * (email + C.I.). El default es `true` porque el caso normal a partir de ahora
 * es el alta sin contraseña; las filas que ya existen se bajan a `false`
 * porque su contraseña ya está definida y funcionando.
 */
export class AddDebeCambiarPasswordToUsuario1787100000000 implements MigrationInterface {
  name = 'AddDebeCambiarPasswordToUsuario1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuario"
        ADD COLUMN IF NOT EXISTS "debe_cambiar_password" boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      UPDATE "usuario" SET "debe_cambiar_password" = false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuario" DROP COLUMN IF EXISTS "debe_cambiar_password"
    `);
  }
}
