import { Pool } from 'pg';
import {
  emptyStats,
  logStats,
  PhaseStats,
  EtlOptions,
  OrganigramaSource,
  columnExists,
  tableExists,
} from '../legacy-client';

export async function migrateUnidadFuncion(
  legacy: Pool,
  target: Pool,
  options: EtlOptions,
  organigrama: OrganigramaSource,
): Promise<PhaseStats> {
  const stats = emptyStats('5-unidad_funcion');
  const schema = organigrama;
  const idCol = schema === 'mof' ? 'id' : 'unidad_funcion_id';
  const src = await legacy.query<{
    unidad_funcion_id: string;
    unidad: string | null;
    funcion: string | null;
    base_legal: string | null;
  }>(
    `SELECT ${idCol} AS unidad_funcion_id, unidad, funcion, base_legal
     FROM ${schema}.unidad_funcion`,
  );

  const ordenByUnidad = new Map<string, number>();

  for (const row of src.rows) {
    if (!row.unidad || !row.funcion) {
      stats.skipped += 1;
      continue;
    }
    const orden = (ordenByUnidad.get(row.unidad) || 0) + 1;
    ordenByUnidad.set(row.unidad, orden);

    if (options.dryRun) {
      stats.inserted += 1;
      continue;
    }

    try {
      const exists = await target.query(`SELECT 1 FROM unidad WHERE id = $1`, [
        row.unidad,
      ]);
      if (!exists.rowCount) {
        stats.skipped += 1;
        continue;
      }
      await target.query(
        `INSERT INTO unidad_funcion (id, unidad_id, orden, funcion, base_legal, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5, now(), now())
         ON CONFLICT (id) DO UPDATE SET
           unidad_id = EXCLUDED.unidad_id,
           orden = EXCLUDED.orden,
           funcion = EXCLUDED.funcion,
           base_legal = EXCLUDED.base_legal,
           updated_at = now(),
           deleted_at = NULL`,
        [
          row.unidad_funcion_id,
          row.unidad,
          orden,
          row.funcion.slice(0, 1024),
          row.base_legal ? row.base_legal.slice(0, 1024) : null,
        ],
      );
      stats.inserted += 1;
    } catch (e) {
      stats.errors.push(
        `unidad_funcion ${row.unidad_funcion_id}: ${(e as Error).message}`,
      );
    }
  }

  if (!options.dryRun && src.rows.length) {
    await target.query(
      `SELECT setval(pg_get_serial_sequence('unidad_funcion', 'id'), GREATEST((SELECT MAX(id) FROM unidad_funcion), 1))`,
    );
  }

  logStats(stats);
  return stats;
}

export async function migrateUnidadDependencia(
  legacy: Pool,
  target: Pool,
  options: EtlOptions,
  organigrama: OrganigramaSource,
): Promise<PhaseStats> {
  const stats = emptyStats('6-unidad_dependencia');
  const src = await legacy.query<{
    unidad: string | null;
    dependencia: string | null;
  }>(`SELECT unidad, dependencia FROM ${organigrama}.unidad_dependencia`);

  for (const row of src.rows) {
    if (!row.unidad || !row.dependencia || row.unidad === row.dependencia) {
      stats.skipped += 1;
      continue;
    }
    if (options.dryRun) {
      stats.inserted += 1;
      continue;
    }
    try {
      const both = await target.query(
        `SELECT COUNT(*)::int AS c FROM unidad WHERE id IN ($1, $2)`,
        [row.unidad, row.dependencia],
      );
      if (Number(both.rows[0]?.c) < 2) {
        stats.skipped += 1;
        continue;
      }
      await target.query(
        `INSERT INTO unidad_dependencia_funcional (unidad_id, dependencia_id, created_at, updated_at)
         VALUES ($1,$2, now(), now())
         ON CONFLICT (unidad_id, dependencia_id) DO UPDATE SET
           updated_at = now(),
           deleted_at = NULL`,
        [row.unidad, row.dependencia],
      );
      stats.inserted += 1;
    } catch (e) {
      stats.errors.push(
        `dependencia ${row.unidad}->${row.dependencia}: ${(e as Error).message}`,
      );
    }
  }
  logStats(stats);
  return stats;
}

export async function migrateRelaciones(
  legacy: Pool,
  target: Pool,
  options: EtlOptions,
  organigrama: OrganigramaSource,
): Promise<PhaseStats> {
  const stats = emptyStats('7-relaciones');
  const extId = organigrama === 'mof' ? 'id' : 'unidad_relexterno_id';
  const intId = organigrama === 'mof' ? 'id' : 'unidad_relinterno_id';

  const externos = await legacy.query<{
    unidad_relexterno_id: string;
    unidad: string | null;
    descripcion: string | null;
  }>(
    `SELECT ${extId} AS unidad_relexterno_id, unidad, descripcion
     FROM ${organigrama}.unidad_relexterno`,
  );

  for (const row of externos.rows) {
    if (!row.unidad || !row.descripcion) {
      stats.skipped += 1;
      continue;
    }
    if (options.dryRun) {
      stats.inserted += 1;
      continue;
    }
    try {
      await target.query(
        `INSERT INTO unidad_relacion_externa (id, unidad_id, descripcion, created_at, updated_at)
         VALUES ($1,$2,$3, now(), now())
         ON CONFLICT (id) DO UPDATE SET
           unidad_id = EXCLUDED.unidad_id,
           descripcion = EXCLUDED.descripcion,
           updated_at = now(),
           deleted_at = NULL`,
        [row.unidad_relexterno_id, row.unidad, row.descripcion.slice(0, 1024)],
      );
      stats.inserted += 1;
    } catch (e) {
      stats.errors.push(
        `relexterno ${row.unidad_relexterno_id}: ${(e as Error).message}`,
      );
    }
  }

  const internos = await legacy.query<{
    unidad_relinterno_id: string;
    unidad: string | null;
    relacion: string | null;
  }>(
    `SELECT ${intId} AS unidad_relinterno_id, unidad, relacion
     FROM ${organigrama}.unidad_relinterno`,
  );

  for (const row of internos.rows) {
    if (!row.unidad || !row.relacion) {
      stats.skipped += 1;
      continue;
    }
    if (options.dryRun) {
      stats.inserted += 1;
      continue;
    }
    try {
      await target.query(
        `INSERT INTO unidad_relacion_interna (id, unidad_id, relacionada_id, created_at, updated_at)
         VALUES ($1,$2,$3, now(), now())
         ON CONFLICT (id) DO UPDATE SET
           unidad_id = EXCLUDED.unidad_id,
           relacionada_id = EXCLUDED.relacionada_id,
           updated_at = now(),
           deleted_at = NULL`,
        [row.unidad_relinterno_id, row.unidad, row.relacion],
      );
      stats.inserted += 1;
    } catch (e) {
      stats.errors.push(
        `relinterno ${row.unidad_relinterno_id}: ${(e as Error).message}`,
      );
    }
  }

  if (!options.dryRun) {
    await target.query(
      `SELECT setval(pg_get_serial_sequence('unidad_relacion_externa', 'id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM unidad_relacion_externa), 1))`,
    );
    await target.query(
      `SELECT setval(pg_get_serial_sequence('unidad_relacion_interna', 'id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM unidad_relacion_interna), 1))`,
    );
  }

  logStats(stats);
  return stats;
}

export async function migrateUnidadParentHist(
  legacy: Pool,
  target: Pool,
  options: EtlOptions,
): Promise<PhaseStats> {
  const stats = emptyStats('8-unidad_jerarquia_hist');
  if (!(await tableExists(legacy, 'umsa', 'unidad_parent'))) {
    console.log('[8-unidad_jerarquia_hist] tabla umsa.unidad_parent no existe (no-op)');
    logStats(stats);
    return stats;
  }

  const src = await legacy.query<{
    unidad_parent_id: string;
    unidad: string;
    parent: string | null;
    razon: string | null;
    registro: Date | null;
  }>(
    `SELECT unidad_parent_id, unidad, parent, razon, registro FROM umsa.unidad_parent`,
  );

  if (src.rows.length === 0) {
    console.log('[8-unidad_jerarquia_hist] sin filas (no-op)');
    logStats(stats);
    return stats;
  }

  for (const row of src.rows) {
    if (options.dryRun) {
      stats.inserted += 1;
      continue;
    }
    try {
      await target.query(
        `INSERT INTO unidad_jerarquia_hist (
           id, unidad_id, parent_id_anterior, parent_id_nuevo, razon, changed_at
         ) VALUES ($1,$2,NULL,$3,$4, COALESCE($5, now()))
         ON CONFLICT (id) DO UPDATE SET
           unidad_id = EXCLUDED.unidad_id,
           parent_id_nuevo = EXCLUDED.parent_id_nuevo,
           razon = EXCLUDED.razon,
           changed_at = EXCLUDED.changed_at`,
        [
          row.unidad_parent_id,
          row.unidad,
          row.parent,
          row.razon,
          row.registro,
        ],
      );
      stats.inserted += 1;
    } catch (e) {
      stats.errors.push(
        `unidad_parent ${row.unidad_parent_id}: ${(e as Error).message}`,
      );
    }
  }

  if (!options.dryRun && src.rows.length) {
    await target.query(
      `SELECT setval(pg_get_serial_sequence('unidad_jerarquia_hist', 'id'), GREATEST((SELECT MAX(id) FROM unidad_jerarquia_hist), 1))`,
    );
  }

  logStats(stats);
  return stats;
}

export async function migrateAsignaciones(
  legacy: Pool,
  target: Pool,
  options: EtlOptions,
): Promise<PhaseStats> {
  const stats = emptyStats('9-asignaciones');
  const idCol = (await columnExists(
    legacy,
    'umsa',
    'asignacion_personal',
    'asignacion_personal_id',
  ))
    ? 'asignacion_personal_id'
    : 'id';
  const src = await legacy.query<{
    asignacion_personal_id: string;
    administrativo: string | null;
    unidad: string | null;
    fecha_asignacion: Date | null;
    cargo: string | null;
  }>(
    `SELECT ${idCol} AS asignacion_personal_id, administrativo, unidad, fecha_asignacion, cargo
     FROM umsa.asignacion_personal`,
  );

  if (src.rows.length === 0) {
    console.log('[9-asignaciones] sin filas en umsa.asignacion_personal (no-op)');
    logStats(stats);
    return stats;
  }

  let cargoNivelId = 1;
  if (!options.dryRun) {
    const nivel = await target.query<{ id: number }>(
      `INSERT INTO cargo_nivel (letra, nombre, orden, activo, created_at, updated_at)
       VALUES ('A', 'Nivel A', 1, true, now(), now())
       ON CONFLICT (letra) DO UPDATE SET updated_at = now()
       RETURNING id`,
    );
    cargoNivelId = Number(nivel.rows[0].id);
  }

  const admIdCol = (await columnExists(
    legacy,
    'umsa',
    'administrativo',
    'administrativo_id',
  ))
    ? 'administrativo_id'
    : 'id';

  const seenCargoUnidad = new Set<string>();

  for (const row of src.rows) {
    if (!row.unidad || !row.cargo) {
      stats.skipped += 1;
      continue;
    }
    const key = `${row.unidad}:${row.cargo}`;
    if (options.dryRun) {
      stats.inserted += 1;
      continue;
    }

    try {
      const unidadOk = await target.query(`SELECT 1 FROM unidad WHERE id = $1`, [
        row.unidad,
      ]);
      const cargoOk = await target.query(`SELECT 1 FROM cargo WHERE id = $1`, [
        row.cargo,
      ]);
      if (!unidadOk.rowCount || !cargoOk.rowCount) {
        stats.skipped += 1;
        continue;
      }

      if (!seenCargoUnidad.has(key)) {
        await target.query(
          `INSERT INTO cargo_unidad (cargo_id, unidad_id, activo, created_at, updated_at)
           VALUES ($1,$2,true, now(), now())`,
          [row.cargo, row.unidad],
        );
        seenCargoUnidad.add(key);
      }

      let idPersona: string | null = null;
      if (row.administrativo) {
        const adm = await legacy.query<{ persona: string | null }>(
          `SELECT persona FROM umsa.administrativo WHERE ${admIdCol} = $1`,
          [row.administrativo],
        );
        idPersona = adm.rows[0]?.persona ?? null;
      }

      if (idPersona) {
        await target.query(
          `INSERT INTO asignacion_cargo (
             id, id_persona, cargo_id, unidad_id, cargo_nivel_id,
             fecha_inicio, activo, created_at, updated_at
           ) VALUES ($1,$2,$3,$4,$5, COALESCE($6, CURRENT_DATE), true, now(), now())
           ON CONFLICT (id) DO UPDATE SET
             id_persona = EXCLUDED.id_persona,
             cargo_id = EXCLUDED.cargo_id,
             unidad_id = EXCLUDED.unidad_id,
             cargo_nivel_id = EXCLUDED.cargo_nivel_id,
             fecha_inicio = EXCLUDED.fecha_inicio,
             updated_at = now(),
             deleted_at = NULL`,
          [
            row.asignacion_personal_id,
            idPersona,
            row.cargo,
            row.unidad,
            cargoNivelId,
            row.fecha_asignacion,
          ],
        );
      }
      stats.inserted += 1;
    } catch (e) {
      stats.errors.push(
        `asignacion ${row.asignacion_personal_id}: ${(e as Error).message}`,
      );
    }
  }

  logStats(stats);
  return stats;
}
