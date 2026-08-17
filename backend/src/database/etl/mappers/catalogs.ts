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
    { codigo: 'F', descripcion: 'Funcional' },
  ],
};

function normalizeDesc(value: string | null | undefined): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function codigoFromMofTipo(descripcion: string | null): string {
  const d = normalizeDesc(descripcion);
  if (d.includes('ADMINISTRATIV')) return 'A';
  if (d.includes('ASESOR')) return 'C';
  if (d.includes('SUSTANTIV')) return 'B';
  if (d.includes('ORGANO') || d.includes('DELIBERATIV')) return 'N';
  return 'Z';
}

function codigoFromMofNivel(descripcion: string | null): string {
  const d = normalizeDesc(descripcion);
  if (d.includes('DIRECTOR')) return 'D';
  if (d.includes('OPERATIV')) return 'O';
  if (d.includes('EJECUTIV')) return 'E';
  return 'E';
}

function codigoFromMofRelacion(descripcion: string | null): string {
  const d = normalizeDesc(descripcion);
  if (d.includes('LINEAL')) return 'L';
  if (d.includes('STAFF')) return 'S';
  if (d.includes('FUNCIONAL')) return 'F';
  return 'X';
}

async function upsertCatalog(
  target: Pool,
  table: string,
  rows: { codigo: string; descripcion: string; activo?: boolean }[],
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
       VALUES ($1, $2, $3, now(), now())
       ON CONFLICT (codigo) DO UPDATE SET
         descripcion = EXCLUDED.descripcion,
         activo = EXCLUDED.activo,
         updated_at = now(),
         deleted_at = NULL
       RETURNING id`,
      [row.codigo, row.descripcion, row.activo !== false],
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
  tipoBySourceId: Map<number, number>;
  nivelBySourceId: Map<number, number>;
  relacionBySourceId: Map<number, number>;
};

async function reloadCodigoMap(
  target: Pool,
  table: string,
  map: Map<string, number>,
): Promise<void> {
  const rows = await target.query<{ id: number; codigo: string }>(
    `SELECT id, codigo FROM ${table} WHERE deleted_at IS NULL`,
  );
  map.clear();
  for (const r of rows.rows) map.set(r.codigo, Number(r.id));
}

async function mapMofCatalog(
  legacy: Pool,
  target: Pool,
  options: EtlOptions,
  stats: PhaseStats,
  sourceTable: 'tipo' | 'nivel' | 'relacion',
  destTable: string,
  codigoMap: Map<string, number>,
  resolveCodigo: (descripcion: string | null) => string,
): Promise<Map<number, number>> {
  const bySource = new Map<number, number>();
  const src = await legacy.query<{
    id: number;
    descripcion: string | null;
    activo: boolean | null;
  }>(`SELECT id, descripcion, activo FROM mof.${sourceTable}`);

  for (const row of src.rows) {
    const codigo = resolveCodigo(row.descripcion);
    if (!codigoMap.has(codigo) && !options.dryRun) {
      const inserted = await upsertCatalog(
        target,
        destTable,
        [
          {
            codigo,
            descripcion: row.descripcion || codigo,
            activo: row.activo !== false,
          },
        ],
        options,
        stats,
      );
      for (const [k, v] of inserted) codigoMap.set(k, v);
    } else if (!codigoMap.has(codigo) && options.dryRun) {
      codigoMap.set(codigo, -1);
      stats.inserted += 1;
    }
    const destId = codigoMap.get(codigo);
    if (destId != null) bySource.set(Number(row.id), destId);
  }
  return bySource;
}

export async function migrateCatalogs(
  legacy: Pool,
  target: Pool,
  options: EtlOptions,
  organigrama: 'mof' | 'umsa',
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
    await reloadCodigoMap(target, 'catalogo_tipo', tipo);
    await reloadCodigoMap(target, 'catalogo_nivel', nivel);
    await reloadCodigoMap(target, 'catalogo_relacion', relacion);
  }

  let tipoBySourceId = new Map<number, number>();
  let nivelBySourceId = new Map<number, number>();
  let relacionBySourceId = new Map<number, number>();

  if (organigrama === 'mof') {
    tipoBySourceId = await mapMofCatalog(
      legacy,
      target,
      options,
      stats,
      'tipo',
      'catalogo_tipo',
      tipo,
      codigoFromMofTipo,
    );
    nivelBySourceId = await mapMofCatalog(
      legacy,
      target,
      options,
      stats,
      'nivel',
      'catalogo_nivel',
      nivel,
      codigoFromMofNivel,
    );
    relacionBySourceId = await mapMofCatalog(
      legacy,
      target,
      options,
      stats,
      'relacion',
      'catalogo_relacion',
      relacion,
      codigoFromMofRelacion,
    );
  }

  logStats(stats);
  return {
    tipo,
    nivel,
    relacion,
    tipoBySourceId,
    nivelBySourceId,
    relacionBySourceId,
  };
}
