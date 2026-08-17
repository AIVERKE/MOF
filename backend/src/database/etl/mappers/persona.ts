import { Pool } from 'pg';
import { emptyStats, logStats, PhaseStats, EtlOptions } from '../legacy-client';

export async function migratePersona(
  legacy: Pool,
  target: Pool,
  options: EtlOptions,
): Promise<PhaseStats> {
  const stats = emptyStats('2-persona');
  const src = await legacy.query<{
    persona_id: string;
    nombres: string | null;
    primer_apellido: string | null;
    segundo_apellido: string | null;
    documento: string | null;
    correo: string | null;
    celular: string | null;
    estado: string | null;
    registro: Date | null;
  }>(
    `SELECT persona_id, nombres, primer_apellido, segundo_apellido, documento, correo, celular, estado, registro
     FROM umsa.persona`,
  );

  const usedCi = new Set<string>();

  for (const row of src.rows) {
    let ci = (row.documento || '').trim() || `SIN-CI-${row.persona_id}`;
    if (usedCi.has(ci)) ci = `${ci}-${row.persona_id}`.slice(0, 32);
    usedCi.add(ci);

    const deletedAt =
      row.estado && row.estado.toUpperCase() !== 'A' ? new Date() : null;

    if (options.dryRun) {
      stats.inserted += 1;
      continue;
    }

    try {
      await target.query(
        `INSERT INTO persona (
           id_persona, ci, nombre, paterno, materno, celular, email,
           created_at, updated_at, deleted_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7, COALESCE($8, now()), now(), $9)
         ON CONFLICT (id_persona) DO UPDATE SET
           ci = EXCLUDED.ci,
           nombre = EXCLUDED.nombre,
           paterno = EXCLUDED.paterno,
           materno = EXCLUDED.materno,
           celular = EXCLUDED.celular,
           email = EXCLUDED.email,
           updated_at = now(),
           deleted_at = EXCLUDED.deleted_at`,
        [
          row.persona_id,
          ci.slice(0, 32),
          row.nombres || 'SIN NOMBRE',
          row.primer_apellido,
          row.segundo_apellido,
          row.celular ? row.celular.slice(0, 32) : null,
          row.correo,
          row.registro,
          deletedAt,
        ],
      );
      stats.inserted += 1;
    } catch (e) {
      stats.errors.push(`persona ${row.persona_id}: ${(e as Error).message}`);
    }
  }

  if (!options.dryRun && src.rows.length) {
    await target.query(
      `SELECT setval(pg_get_serial_sequence('persona', 'id_persona'), GREATEST((SELECT MAX(id_persona) FROM persona), 1))`,
    );
  }

  logStats(stats);
  return stats;
}
