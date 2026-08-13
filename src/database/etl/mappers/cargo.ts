import { Pool } from 'pg';
import {
  emptyStats,
  logStats,
  PhaseStats,
  EtlOptions,
  columnExists,
} from '../legacy-client';

export async function migrateCargo(
  legacy: Pool,
  target: Pool,
  options: EtlOptions,
): Promise<PhaseStats> {
  const stats = emptyStats('3-cargo');
  const idCol = (await columnExists(legacy, 'umsa', 'cargo', 'cargo_id'))
    ? 'cargo_id'
    : 'id';
  const activoExpr = (await columnExists(legacy, 'umsa', 'cargo', 'estado'))
    ? 'estado'
    : 'activo';
  const src = await legacy.query<{
    cargo_id: string;
    descripcion: string | null;
    estado: boolean | null;
  }>(
    `SELECT ${idCol} AS cargo_id, descripcion, ${activoExpr} AS estado FROM umsa.cargo`,
  );

  for (const row of src.rows) {
    const nombre = (row.descripcion || `Cargo ${row.cargo_id}`).slice(0, 255);
    const descripcion = row.descripcion
      ? row.descripcion.slice(0, 512)
      : null;
    const activo = row.estado === null || row.estado === undefined ? true : !!row.estado;

    if (options.dryRun) {
      stats.inserted += 1;
      continue;
    }

    try {
      await target.query(
        `INSERT INTO cargo (
           id, codigo, nombre, descripcion, parent_id, unico_en_unidad, activo,
           created_at, updated_at, deleted_at
         ) VALUES ($1, NULL, $2, $3, NULL, false, $4, now(), now(), NULL)
         ON CONFLICT (id) DO UPDATE SET
           nombre = EXCLUDED.nombre,
           descripcion = EXCLUDED.descripcion,
           activo = EXCLUDED.activo,
           updated_at = now(),
           deleted_at = NULL`,
        [row.cargo_id, nombre, descripcion, activo],
      );
      stats.inserted += 1;
    } catch (e) {
      stats.errors.push(`cargo ${row.cargo_id}: ${(e as Error).message}`);
    }
  }

  if (!options.dryRun && src.rows.length) {
    await target.query(
      `SELECT setval(pg_get_serial_sequence('cargo', 'id'), GREATEST((SELECT MAX(id) FROM cargo), 1))`,
    );
  }

  logStats(stats);
  return stats;
}
