import { Pool } from 'pg';
import {
  emptyStats,
  logStats,
  PhaseStats,
  EtlOptions,
  OrganigramaSource,
  uniqueSigla,
} from '../legacy-client';
import { CatalogMaps } from './catalogs';

type UnidadRow = {
  unidad_id: string;
  nombre: string | null;
  codigo: string;
  registro: Date | null;
  estado: string | null;
  res_creacion: string | null;
  fec_creacion: Date | null;
  nivel: string | number | null;
  tipo: string | number | null;
  objetivo: string | null;
  base_legal: string | null;
  parent: string | null;
  relacion: string | number | null;
  oficial: boolean | null;
  tipo_unidad: number | null;
  sigla: string | null;
  activo: boolean | null;
};

export async function migrateUnidad(
  legacy: Pool,
  target: Pool,
  catalogs: CatalogMaps,
  options: EtlOptions,
  organigrama: OrganigramaSource,
): Promise<PhaseStats> {
  const stats = emptyStats('4-unidad');
  const src =
    organigrama === 'mof'
      ? await legacy.query<UnidadRow>(
          `SELECT u.id AS unidad_id, u.nombre, u.codigo, u.registro, u.estado,
                  u.res_creacion, u.fec_creacion, u.nivel, u.tipo, u.objetivo,
                  NULL::text AS base_legal, u.parent, u.relacion,
                  COALESCE(c.oficial, false) AS oficial, u.clase AS tipo_unidad,
                  u.sigla, u.activo
           FROM mof.unidad u
           LEFT JOIN mof.clase c ON c.id = u.clase`,
        )
      : await legacy.query<UnidadRow>(
          `SELECT unidad_id, nombre, codigo, registro, estado, res_creacion, fec_creacion,
                  nivel, tipo, objetivo, base_legal, parent, relacion, oficial,
                  tipo_unidad, NULL::varchar AS sigla, true AS activo
           FROM umsa.unidad`,
        );

  const defaultTipo = catalogs.tipo.get('A') ?? 1;
  const defaultNivel = catalogs.nivel.get('E') ?? 1;
  const defaultRelacion = catalogs.relacion.get('L') ?? 1;

  const usedSiglas = new Set<string>();
  const usedCodigos = new Set<string>();

  const resolveCatalogId = (
    value: string | number | null,
    bySource: Map<number, number>,
    byCodigo: Map<string, number>,
    fallback: number,
  ): number => {
    if (value == null || value === '') return fallback;
    if (typeof value === 'number' || /^\d+$/.test(String(value))) {
      return bySource.get(Number(value)) ?? fallback;
    }
    return byCodigo.get(String(value).toUpperCase()) ?? fallback;
  };

  for (const row of src.rows) {
    let codigo = row.codigo;
    if (usedCodigos.has(codigo)) codigo = `${codigo}-${row.unidad_id}`.slice(0, 64);
    usedCodigos.add(codigo);

    let sigla = (row.sigla || '').trim();
    if (!sigla) sigla = uniqueSigla(codigo, row.unidad_id);
    if (sigla.length > 32) sigla = uniqueSigla(codigo, row.unidad_id);
    if (usedSiglas.has(sigla)) sigla = `${sigla.slice(0, 24)}-${row.unidad_id}`.slice(0, 32);
    usedSiglas.add(sigla);

    const tipoId = resolveCatalogId(
      row.tipo,
      catalogs.tipoBySourceId,
      catalogs.tipo,
      defaultTipo,
    );
    const nivelId = resolveCatalogId(
      row.nivel,
      catalogs.nivelBySourceId,
      catalogs.nivel,
      defaultNivel,
    );
    const relacionId = resolveCatalogId(
      row.relacion,
      catalogs.relacionBySourceId,
      catalogs.relacion,
      defaultRelacion,
    );

    const tipoUnidadId = row.tipo_unidad;
    if (tipoUnidadId == null) {
      stats.skipped += 1;
      stats.errors.push(`unidad ${row.unidad_id}: sin tipo_unidad/clase`);
      continue;
    }

    const inactive =
      row.activo === false ||
      (row.estado != null &&
        row.estado.toUpperCase() !== 'A' &&
        row.estado.trim() !== '');
    const deletedAt = inactive ? new Date() : null;

    if (options.dryRun) {
      stats.inserted += 1;
      continue;
    }

    try {
      await target.query(
        `INSERT INTO unidad (
           id, codigo, sigla, nombre, parent_id, tipo_unidad_id, tipo_id, nivel_id, relacion_id,
           oficial, objetivo, base_legal, res_creacion, fec_creacion,
           created_at, updated_at, deleted_at
         ) VALUES (
           $1,$2,$3,$4,NULL,$5,$6,$7,$8,$9,$10,$11,$12,$13,
           COALESCE($14, now()), now(), $15
         )
         ON CONFLICT (id) DO UPDATE SET
           codigo = EXCLUDED.codigo,
           sigla = EXCLUDED.sigla,
           nombre = EXCLUDED.nombre,
           tipo_unidad_id = EXCLUDED.tipo_unidad_id,
           tipo_id = EXCLUDED.tipo_id,
           nivel_id = EXCLUDED.nivel_id,
           relacion_id = EXCLUDED.relacion_id,
           oficial = EXCLUDED.oficial,
           objetivo = EXCLUDED.objetivo,
           base_legal = EXCLUDED.base_legal,
           res_creacion = EXCLUDED.res_creacion,
           fec_creacion = EXCLUDED.fec_creacion,
           updated_at = now(),
           deleted_at = EXCLUDED.deleted_at`,
        [
          row.unidad_id,
          codigo,
          sigla,
          row.nombre || codigo,
          tipoUnidadId,
          tipoId,
          nivelId,
          relacionId,
          row.oficial ?? false,
          row.objetivo,
          row.base_legal,
          row.res_creacion,
          row.fec_creacion,
          row.registro,
          deletedAt,
        ],
      );
      stats.inserted += 1;
    } catch (e) {
      stats.errors.push(`unidad ${row.unidad_id}: ${(e as Error).message}`);
    }
  }

  if (!options.dryRun) {
    for (const row of src.rows) {
      if (!row.parent) continue;
      try {
        const parentExists = await target.query(
          `SELECT 1 FROM unidad WHERE id = $1`,
          [row.parent],
        );
        if (!parentExists.rowCount) {
          stats.errors.push(
            `unidad ${row.unidad_id}: parent ${row.parent} no existe en destino`,
          );
          continue;
        }
        await target.query(
          `UPDATE unidad SET parent_id = $1, updated_at = now() WHERE id = $2`,
          [row.parent, row.unidad_id],
        );
        stats.updated += 1;
      } catch (e) {
        stats.errors.push(
          `unidad parent ${row.unidad_id}: ${(e as Error).message}`,
        );
      }
    }

    if (src.rows.length) {
      await target.query(
        `SELECT setval(pg_get_serial_sequence('unidad', 'id'), GREATEST((SELECT MAX(id) FROM unidad), 1))`,
      );
    }
  }

  logStats(stats);
  return stats;
}
