import { Pool } from 'pg';
import { emptyStats, logStats, EtlOptions, PhaseStats } from '../legacy-client';

const CATALOGS = {
  tipo: [
    { codigo: 'A', descripcion: 'Administrativo' },
    { codigo: 'B', descripcion: 'Sustantivo (Académico)' },
    { codigo: 'C', descripcion: 'Asesoramiento' },
  ],
  nivel: [
    { codigo: 'D', descripcion: 'Directorio' },
    { codigo: 'E', descripcion: 'Ejecutivo' },
    { codigo: 'O', descripcion: 'Operativo' },
  ],
  relacion: [
    { codigo: 'L', descripcion: 'Lineal' },
    { codigo: 'S', descripcion: 'Staff' },
  ],
};

async function upsertCatalog(
  target: Pool,
  table: string,
  rows: { codigo: string; descripcion: string }[],
  options: EtlOptions,
  stats: PhaseStats,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (options.dryRun) {
      stats.inserted += 1;
      map.set(row.codigo, -1);
      continue;
    }
    const res = await target.query<{ id: number }>(
      `INSERT INTO ${table} (codigo, descripcion, activo, created_at, updated_at)
       VALUES ($1, $2, true, now(), now())
       ON CONFLICT (codigo) DO UPDATE SET
         descripcion = EXCLUDED.descripcion,
         activo = true,
         updated_at = now(),
         deleted_at = NULL
       RETURNING id`,
      [row.codigo, row.descripcion],
    );
    map.set(row.codigo, Number(res.rows[0].id));
    stats.inserted += 1;
  }
  return map;
}

export type CatalogMaps = {
  tipo: Map<string, number>;
  nivel: Map<string, number>;
  relacion: Map<string, number>;
};

export async function migrateCatalogs(
  target: Pool,
  options: EtlOptions,
): Promise<CatalogMaps> {
  const stats = emptyStats('0-catalogs');
  const tipo = await upsertCatalog(
    target,
    'catalogo_tipo',
    CATALOGS.tipo,
    options,
    stats,
  );
  const nivel = await upsertCatalog(
    target,
    'catalogo_nivel',
    CATALOGS.nivel,
    options,
    stats,
  );
  const relacion = await upsertCatalog(
    target,
    'catalogo_relacion',
    CATALOGS.relacion,
    options,
    stats,
  );

  if (!options.dryRun) {
    // reload maps in case of conflict-only updates
    for (const [table, map] of [
      ['catalogo_tipo', tipo],
      ['catalogo_nivel', nivel],
      ['catalogo_relacion', relacion],
    ] as const) {
      const rows = await target.query<{ id: number; codigo: string }>(
        `SELECT id, codigo FROM ${table} WHERE deleted_at IS NULL`,
      );
      map.clear();
      for (const r of rows.rows) map.set(r.codigo, Number(r.id));
    }
  }

  logStats(stats);
  return { tipo, nivel, relacion };
}
