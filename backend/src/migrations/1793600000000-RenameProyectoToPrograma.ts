import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El bloque "Proyectos" de las unidades pasa a llamarse "Programas":
 * `proyecto` → `programa`, `tipo_proyecto` → `tipo_programa` y
 * `proyecto_unidad` → `programa_unidad`, junto con sus columnas, PK, FK,
 * índices y secuencias. Solo renombra: los datos no cambian.
 */
const TABLAS: [string, string][] = [
  ['proyecto', 'programa'],
  ['tipo_proyecto', 'tipo_programa'],
  ['proyecto_unidad', 'programa_unidad'],
];

/** [tabla (nombre nuevo), columna anterior, columna nueva] */
const COLUMNAS: [string, string, string][] = [
  ['programa', 'tipo_proyecto_id', 'tipo_programa_id'],
  ['programa_unidad', 'proyecto_id', 'programa_id'],
];

/** [tabla (nombre nuevo), restricción anterior, restricción nueva] */
const RESTRICCIONES: [string, string, string][] = [
  ['programa', 'PK_proyecto', 'PK_programa'],
  ['tipo_programa', 'PK_tipo_proyecto', 'PK_tipo_programa'],
  ['programa_unidad', 'PK_proyecto_unidad', 'PK_programa_unidad'],
  ['programa', 'FK_proyecto_tipo_proyecto', 'FK_programa_tipo_programa'],
  [
    'programa_unidad',
    'FK_proyecto_unidad_proyecto',
    'FK_programa_unidad_programa',
  ],
  ['programa_unidad', 'FK_proyecto_unidad_unidad', 'FK_programa_unidad_unidad'],
];

const INDICES: [string, string][] = [
  ['IDX_proyecto_tipo_proyecto', 'IDX_programa_tipo_programa'],
  ['IDX_proyecto_unidad_unidad', 'IDX_programa_unidad_unidad'],
];

const SECUENCIAS: [string, string][] = [
  ['proyecto_id_seq', 'programa_id_seq'],
  ['tipo_proyecto_id_seq', 'tipo_programa_id_seq'],
];

export class RenameProyectoToPrograma1793600000000 implements MigrationInterface {
  name = 'RenameProyectoToPrograma1793600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [antes, despues] of TABLAS) {
      await queryRunner.query(`ALTER TABLE "${antes}" RENAME TO "${despues}"`);
    }
    for (const [tabla, antes, despues] of COLUMNAS) {
      await queryRunner.query(
        `ALTER TABLE "${tabla}" RENAME COLUMN "${antes}" TO "${despues}"`,
      );
    }
    for (const [tabla, antes, despues] of RESTRICCIONES) {
      await queryRunner.query(
        `ALTER TABLE "${tabla}" RENAME CONSTRAINT "${antes}" TO "${despues}"`,
      );
    }
    for (const [antes, despues] of INDICES) {
      await queryRunner.query(
        `ALTER INDEX "public"."${antes}" RENAME TO "${despues}"`,
      );
    }
    for (const [antes, despues] of SECUENCIAS) {
      await queryRunner.query(
        `ALTER SEQUENCE "public"."${antes}" RENAME TO "${despues}"`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [antes, despues] of SECUENCIAS) {
      await queryRunner.query(
        `ALTER SEQUENCE "public"."${despues}" RENAME TO "${antes}"`,
      );
    }
    for (const [antes, despues] of INDICES) {
      await queryRunner.query(
        `ALTER INDEX "public"."${despues}" RENAME TO "${antes}"`,
      );
    }
    for (const [tabla, antes, despues] of RESTRICCIONES) {
      await queryRunner.query(
        `ALTER TABLE "${tabla}" RENAME CONSTRAINT "${despues}" TO "${antes}"`,
      );
    }
    for (const [tabla, antes, despues] of COLUMNAS) {
      await queryRunner.query(
        `ALTER TABLE "${tabla}" RENAME COLUMN "${despues}" TO "${antes}"`,
      );
    }
    for (const [antes, despues] of TABLAS) {
      await queryRunner.query(`ALTER TABLE "${despues}" RENAME TO "${antes}"`);
    }
  }
}
