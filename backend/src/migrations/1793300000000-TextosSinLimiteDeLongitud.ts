import { MigrationInterface, QueryRunner } from 'typeorm';

/** Columnas de texto libre que pasan de `varchar(n)` a `text`, con su largo anterior. */
const COLUMNAS: [tabla: string, columna: string, largoAnterior: number][] = [
  ['unidad', 'codigo', 64],
  ['unidad', 'sigla', 32],
  ['unidad', 'nombre', 255],
  ['unidad', 'res_creacion', 512],
  ['unidad_funcion', 'funcion', 1024],
  ['unidad_funcion', 'base_legal', 1024],
  ['unidad_inventario', 'descripcion', 1024],
  ['unidad_relacion_externa', 'descripcion', 1024],
  ['unidad_relacion_interna', 'tipo', 32],
  ['unidad_jerarquia_hist', 'razon', 512],
  ['proyecto', 'tipo', 120],
  ['cargo', 'codigo', 64],
  ['cargo', 'nombre', 255],
  ['cargo', 'descripcion', 512],
  ['cargo_nivel', 'nombre', 128],
  ['cargo_nivel', 'descripcion', 512],
  ['cargo_jerarquia_hist', 'razon', 512],
  ['asignacion_cargo_hist', 'razon', 512],
  ['tipo_unidad', 'codigo', 32],
  ['tipo_unidad', 'descripcion', 255],
];

/**
 * Quita los topes de longitud de los campos de texto de la ficha técnica,
 * inventarios, proyectos, funciones, cargos y clases. `varchar` → `text` es
 * compatible en binario: Postgres no reescribe la tabla y conserva índices
 * (incluidos los únicos de `unidad.codigo`, `cargo.codigo` y `tipo_unidad.codigo`).
 *
 * `down` vuelve a `varchar(n)` y falla si ya hay textos más largos: no se recortan
 * datos en silencio.
 */
export class TextosSinLimiteDeLongitud1793300000000 implements MigrationInterface {
  name = 'TextosSinLimiteDeLongitud1793300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [tabla, columna] of COLUMNAS) {
      await queryRunner.query(
        `ALTER TABLE "${tabla}" ALTER COLUMN "${columna}" TYPE text`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [tabla, columna, largo] of [...COLUMNAS].reverse()) {
      await queryRunner.query(
        `ALTER TABLE "${tabla}" ALTER COLUMN "${columna}" TYPE character varying(${largo})`,
      );
    }
  }
}
