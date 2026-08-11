import { Pool } from 'pg';
import {
  emptyStats,
  logStats,
  PhaseStats,
  EtlOptions,
  uniqueSigla,
} from '../legacy-client';
import { CatalogMaps } from './catalogs';

export async function migrateUnidad(
  legacy: Pool,
  target: Pool,
  catalogs: CatalogMaps,
  options: EtlOptions,
): Promise<PhaseStats> {
  const stats = emptyStats('4-unidad');
  const src = await legacy.query<{
    unidad_id: string;
    nombre: string | null;
    codigo: string;
    registro: Date | null;
    estado: string | null;
    res_creacion: string | null;
    fec_creacion: Date | null;
    nivel: string | null;
    tipo: string | null;
    objetivo: string | null;
    base_legal: string | null;
    parent: string | null;
    relacion: string | null;
    oficial: boolean | null;
    tipo_unidad: number | null;
  }>(
    `SELECT unidad_id, nombre, codigo, registro, estado, res_creacion, fec_creacion,
            nivel, tipo, objetivo, base_legal, parent, relacion, oficial, tipo_unidad
     FROM umsa.unidad`,
  );

  const defaultTipo = catalogs.tipo.get('A') ?? 1;
  const defaultNivel = catalogs.nivel.get('E') ?? 1;
  const defaultRelacion = catalogs.relacion.get('L') ?? 1;

  const usedSiglas = new Set<string>();
  const usedCodigos = new Set<string>();

  // Pass 1: insert without parent
  for (const row of src.rows) {
    let codigo = row.codigo;
    if (usedCodigos.has(codigo)) codigo = `${codigo}-${row.unidad_id}`.slice(0, 64);
    usedCodigos.add(codigo);

    let sigla = uniqueSigla(codigo, row.unidad_id);
    if (usedSiglas.has(sigla)) sigla = `${sigla}-${row.unidad_id}`.slice(0, 32);
    usedSiglas.add(sigla);

    const tipoId =
      (row.tipo && catalogs.tipo.get(row.tipo.toUpperCase())) || defaultTipo;
    const nivelId =
      (row.nivel && catalogs.nivel.get(row.nivel.toUpperCase())) || defaultNivel;
    const relacionId =
      (row.relacion && catalogs.relacion.get(row.relacion.toUpperCase())) ||
      defaultRelacion;

    const tipoUnidadId = row.tipo_unidad;
    if (tipoUnidadId == null) {
      stats.skipped += 1;
      stats.errors.push(`unidad ${row.unidad_id}: sin tipo_unidad`);
      continue;
    }

    const deletedAt =
      row.estado && row.estado.toUpperCase() !== 'A' && row.estado.trim() !== ''
        ? new Date()
        : null;

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

  // Pass 2: set parents
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
        await target.query(`UPDATE unidad SET parent_id = $1, updated_at = now() WHERE id = $2`, [
          row.parent,
          row.unidad_id,
        ]);
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
