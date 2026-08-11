import {
  createLegacyPool,
  createTargetPool,
  parseCliArgs,
  PhaseStats,
} from './legacy-client';
import { migrateCatalogs } from './mappers/catalogs';
import { migrateTipoUnidad } from './mappers/tipo-unidad';
import { migratePersona } from './mappers/persona';
import { migrateCargo } from './mappers/cargo';
import { migrateUnidad } from './mappers/unidad';
import {
  migrateAsignaciones,
  migrateRelaciones,
  migrateUnidadDependencia,
  migrateUnidadFuncion,
  migrateUnidadParentHist,
} from './mappers/children';

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

async function main(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  console.log(
    `ETL umsa → MOF  dryRun=${options.dryRun} truncate=${options.truncate}`,
  );

  const legacy = createLegacyPool();
  const target = createTargetPool();
  const allStats: PhaseStats[] = [];

  try {
    await legacy.query('SELECT 1');
    await target.query('SELECT 1');
    console.log('Conexiones OK (legacy + target)');

    // verify umsa schema exists
    const schema = await legacy.query(
      `SELECT 1 FROM information_schema.schemata WHERE schema_name = 'umsa'`,
    );
    if (!schema.rowCount) {
      throw new Error(
        'Schema umsa no encontrado en LEGACY_DB. Restaura umsa_db.sql en umsa_legacy.',
      );
    }

    if (options.truncate && !options.dryRun) {
      console.log('Truncando tablas destino MOF...');
      await target.query(TRUNCATE_SQL);
    } else if (options.truncate && options.dryRun) {
      console.log('[dry-run] omitiendo TRUNCATE');
    }

    const catalogs = await migrateCatalogs(target, options);
    allStats.push(await migrateTipoUnidad(legacy, target, options));
    allStats.push(await migratePersona(legacy, target, options));
    allStats.push(await migrateCargo(legacy, target, options));
    allStats.push(await migrateUnidad(legacy, target, catalogs, options));
    allStats.push(await migrateUnidadFuncion(legacy, target, options));
    allStats.push(await migrateUnidadDependencia(legacy, target, options));
    allStats.push(await migrateRelaciones(legacy, target, options));
    allStats.push(await migrateUnidadParentHist(legacy, target, options));
    allStats.push(await migrateAsignaciones(legacy, target, options));

    console.log('\n=== Resumen ===');
    let hardErrors = 0;
    for (const s of allStats) {
      hardErrors += s.errors.length;
      console.log(
        `${s.phase}: +${s.inserted} ~${s.updated} skip=${s.skipped} err=${s.errors.length}`,
      );
    }

    // verification counts
    if (!options.dryRun) {
      console.log('\n=== Counts destino ===');
      const tables = [
        'catalogo_tipo',
        'catalogo_nivel',
        'catalogo_relacion',
        'tipo_unidad',
        'persona',
        'cargo',
        'unidad',
        'unidad_funcion',
        'unidad_dependencia_funcional',
        'unidad_relacion_externa',
        'unidad_relacion_interna',
        'unidad_jerarquia_hist',
        'cargo_unidad',
        'asignacion_cargo',
      ];
      for (const t of tables) {
        const r = await target.query<{ c: string }>(
          `SELECT COUNT(*)::text AS c FROM ${t}`,
        );
        console.log(`  ${t}: ${r.rows[0].c}`);
      }

      console.log('\n=== Counts origen (umsa) ===');
      const legacyTables = [
        'tipo_unidad',
        'persona',
        'cargo',
        'unidad',
        'unidad_funcion',
        'unidad_dependencia',
        'unidad_relexterno',
        'unidad_relinterno',
        'unidad_parent',
        'asignacion_personal',
      ];
      for (const t of legacyTables) {
        const r = await legacy.query<{ c: string }>(
          `SELECT COUNT(*)::text AS c FROM umsa.${t}`,
        );
        console.log(`  umsa.${t}: ${r.rows[0].c}`);
      }
    }

    if (hardErrors > 0) {
      console.error(`\nETL finalizado con ${hardErrors} errores.`);
      process.exitCode = 1;
    } else {
      console.log('\nETL finalizado OK.');
    }
  } catch (e) {
    console.error('ETL falló:', e);
    process.exitCode = 1;
  } finally {
    await legacy.end();
    await target.end();
  }
}

main();
