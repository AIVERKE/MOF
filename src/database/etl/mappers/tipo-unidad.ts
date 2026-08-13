import { Pool } from 'pg';
import {
  emptyStats,
  logStats,
  PhaseStats,
  EtlOptions,
  OrganigramaSource,
  slugCodigo,
} from '../legacy-client';

export async function migrateTipoUnidad(
  legacy: Pool,
  target: Pool,
  options: EtlOptions,
  organigrama: OrganigramaSource,
): Promise<PhaseStats> {
  const stats = emptyStats('1-tipo_unidad');
  const src =
    organigrama === 'mof'
      ? await legacy.query<{
          tipo_unidad_id: number;
          descripcion: string | null;
          peso: number | null;
          color: string | null;
          activo: boolean | null;
        }>(
          `SELECT id AS tipo_unidad_id, descripcion, orden AS peso, color, activo
           FROM mof.clase`,
        )
      : await legacy.query<{
          tipo_unidad_id: number;
          descripcion: string | null;
          peso: number | null;
          color: string | null;
          activo: boolean | null;
        }>(
          `SELECT tipo_unidad_id, descripcion, peso, color, true AS activo
           FROM umsa.tipo_unidad`,
        );

  const usedCodigos = new Set<string>();

  for (const row of src.rows) {
    let codigo = slugCodigo(row.descripcion || '', row.tipo_unidad_id);
    if (usedCodigos.has(codigo)) {
      codigo = `${codigo}${row.tipo_unidad_id}`.slice(0, 32);
    }
    usedCodigos.add(codigo);

    if (options.dryRun) {
      stats.inserted += 1;
      continue;
    }

    try {
      await target.query(
        `INSERT INTO tipo_unidad (id, codigo, descripcion, peso, color, activo, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, now(), now())
         ON CONFLICT (id) DO UPDATE SET
           codigo = EXCLUDED.codigo,
           descripcion = EXCLUDED.descripcion,
           peso = EXCLUDED.peso,
           color = EXCLUDED.color,
           activo = EXCLUDED.activo,
           updated_at = now(),
           deleted_at = NULL`,
        [
          row.tipo_unidad_id,
          codigo,
          row.descripcion || `Tipo ${row.tipo_unidad_id}`,
          row.peso ?? 0,
          row.color,
          row.activo !== false,
        ],
      );
      stats.inserted += 1;
    } catch (e) {
      stats.errors.push(
        `tipo_unidad ${row.tipo_unidad_id}: ${(e as Error).message}`,
      );
    }
  }

  if (!options.dryRun && src.rows.length) {
    await target.query(
      `SELECT setval(pg_get_serial_sequence('tipo_unidad', 'id'), GREATEST((SELECT MAX(id) FROM tipo_unidad), 1))`,
    );
  }

  logStats(stats);
  return stats;
}
