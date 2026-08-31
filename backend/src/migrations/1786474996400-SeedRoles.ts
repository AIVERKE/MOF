import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedRoles1786474996400 implements MigrationInterface {
  name = 'SeedRoles1786474996400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "rol" ("codigo", "descripcion", "activo")
      VALUES
        ('ADMIN', 'Administrador del sistema', true),
        ('OPERADOR', 'Operador con permisos de gestión', true),
        ('USER', 'Usuario de consulta', true)
      ON CONFLICT ("codigo") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "rol"
      WHERE "codigo" IN ('ADMIN', 'OPERADOR', 'USER')
    `);
  }
}
