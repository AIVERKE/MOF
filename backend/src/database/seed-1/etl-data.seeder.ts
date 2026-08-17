import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import type { Seeder } from 'typeorm-extension';

const TRUNCATE_SQL = `
TRUNCATE TABLE
  asignacion_cargo_hist,
  asignacion_cargo,
  cargo_jerarquia_hist,
  cargo_unidad,
  cargo,
  cargo_nivel,
  unidad_jerarquia_hist,
  unidad_dependencia_funcional,
  unidad_relacion_interna,
  unidad_relacion_externa,
  unidad_funcion,
  unidad,
  tipo_unidad,
  catalogo_tipo,
  catalogo_nivel,
  catalogo_relacion,
  persona
RESTART IDENTITY CASCADE
`;

export default class EtlDataSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const force = process.argv.includes('--force');
    const [{ c }] = await dataSource.query(
      `SELECT COUNT(*)::int AS c FROM unidad`,
    );

    if (c > 0 && !force) {
      console.log(
        `Seed ETL omitido: unidad ya tiene ${c} filas. Usa npm run seed -- --force para recargar.`,
      );
      return;
    }

    if (force) {
      console.log('Truncando tablas de dominio MOF (--force)...');
      await dataSource.query(TRUNCATE_SQL);
    }

    const snapshotPath = join(
      process.cwd(),
      'src',
      'database',
      'seed-1',
      'etl-snapshot.sql',
    );
    const sql = readFileSync(snapshotPath, 'utf8');
    console.log(`Cargando snapshot ETL (${snapshotPath})...`);

    const statements = sql
      .split('\n')
      .map((line) => line.trim())
      .filter(
        (line) =>
          line.length > 0 &&
          !line.startsWith('--') &&
          line !== 'BEGIN;' &&
          line !== 'COMMIT;',
      );

    const batchSize = 80;
    for (let i = 0; i < statements.length; i += batchSize) {
      await dataSource.query(statements.slice(i, i + batchSize).join('\n'));
    }

    const counts = await dataSource.query(`
      SELECT 'catalogo_tipo' AS t, COUNT(*)::int AS c FROM catalogo_tipo
      UNION ALL SELECT 'tipo_unidad', COUNT(*)::int FROM tipo_unidad
      UNION ALL SELECT 'unidad', COUNT(*)::int FROM unidad
      UNION ALL SELECT 'unidad_funcion', COUNT(*)::int FROM unidad_funcion
      UNION ALL SELECT 'unidad_dependencia_funcional', COUNT(*)::int FROM unidad_dependencia_funcional
      UNION ALL SELECT 'cargo', COUNT(*)::int FROM cargo
      UNION ALL SELECT 'persona', COUNT(*)::int FROM persona
      UNION ALL SELECT 'cargo_unidad', COUNT(*)::int FROM cargo_unidad
    `);
    console.log('Seed ETL cargado:');
    for (const row of counts) {
      console.log(`  ${row.t}: ${row.c}`);
    }
  }
}
