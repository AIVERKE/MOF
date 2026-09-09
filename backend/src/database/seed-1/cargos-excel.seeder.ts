import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import type { Seeder } from 'typeorm-extension';
import { Cargo } from '../../modules/cargos/entities/cargo.entity';
import {
  CargoDatasetRow,
  normalizeCargoName,
  pickBestMatch,
} from './cargos-match';

interface CargosDatasetFile {
  rows: CargoDatasetRow[];
}

function aliasKeys(row: CargoDatasetRow): string[] {
  const keys = new Set<string>();
  keys.add(normalizeCargoName(row.nombre));
  for (const a of row.matchAliases || []) {
    keys.add(normalizeCargoName(a));
  }
  return [...keys];
}

export default class CargosExcelSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const datasetPath = join(
      process.cwd(),
      'src',
      'database',
      'seed-1',
      'cargos-dataset.json',
    );
    const file = JSON.parse(
      readFileSync(datasetPath, 'utf8'),
    ) as CargosDatasetFile;
    const rows = file.rows || [];
    if (!rows.length) {
      console.log('seed:cargos: dataset vacío, nada que hacer.');
      return;
    }

    const cargoRepo = dataSource.getRepository(Cargo);
    const existing = await cargoRepo.find({ withDeleted: false });

    const byCodigo = new Map<string, Cargo>();
    const byNormName = new Map<string, Cargo[]>();
    for (const c of existing) {
      if (c.codigo) byCodigo.set(c.codigo, c);
      const key = normalizeCargoName(c.nombre);
      if (!byNormName.has(key)) byNormName.set(key, []);
      byNormName.get(key)!.push(c);
      if (c.descripcion) {
        const dk = normalizeCargoName(c.descripcion);
        if (dk !== key) {
          if (!byNormName.has(dk)) byNormName.set(dk, []);
          byNormName.get(dk)!.push(c);
        }
      }
    }

    const claimed = new Set<string>();
    let updated = 0;
    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      let match: Cargo | null = null;

      if (row.codigo && byCodigo.has(row.codigo)) {
        const c = byCodigo.get(row.codigo)!;
        if (!claimed.has(c.id)) match = c;
      }

      if (!match) {
        const candidates: Cargo[] = [];
        for (const key of aliasKeys(row)) {
          for (const c of byNormName.get(key) || []) {
            if (claimed.has(c.id)) continue;
            // No reutilizar un cargo ya etiquetado con otro nivel/ámbito.
            if (
              c.nivelOrden != null &&
              row.nivelOrden != null &&
              c.nivelOrden !== row.nivelOrden
            ) {
              continue;
            }
            if (
              c.ambito != null &&
              row.ambito != null &&
              c.ambito !== row.ambito
            ) {
              continue;
            }
            candidates.push(c);
          }
        }
        // Dedup by id
        const unique = [...new Map(candidates.map((c) => [c.id, c])).values()];
        match = pickBestMatch(unique);
      }

      if (match) {
        claimed.add(match.id);
        let dirty = false;
        if (match.nivelOrden !== row.nivelOrden) {
          match.nivelOrden = row.nivelOrden;
          dirty = true;
        }
        if (match.ambito !== row.ambito) {
          match.ambito = row.ambito;
          dirty = true;
        }
        if (!match.codigo && row.codigo) {
          // Liberar codigo de filas soft-deleted que lo retengan (unique global).
          await dataSource.query(
            `UPDATE cargo SET codigo = NULL
             WHERE codigo = $1 AND id <> $2 AND deleted_at IS NOT NULL`,
            [row.codigo, match.id],
          );
          match.codigo = row.codigo;
          dirty = true;
          byCodigo.set(row.codigo, match);
        }
        if (dirty) {
          await cargoRepo.save(match);
          updated += 1;
        } else {
          skipped += 1;
        }
        continue;
      }

      const created = await cargoRepo.save(
        cargoRepo.create({
          codigo: row.codigo,
          nombre: row.nombre.slice(0, 255),
          descripcion: row.nombre.slice(0, 512),
          parentId: null,
          unicoEnUnidad: false,
          nivelOrden: row.nivelOrden,
          ambito: row.ambito,
          activo: true,
        }),
      );
      claimed.add(created.id);
      if (created.codigo) byCodigo.set(created.codigo, created);
      const nk = normalizeCargoName(created.nombre);
      if (!byNormName.has(nk)) byNormName.set(nk, []);
      byNormName.get(nk)!.push(created);
      inserted += 1;
    }

    console.log(
      `seed:cargos listo: updated=${updated}, inserted=${inserted}, unchanged=${skipped}, totalDataset=${rows.length}`,
    );
  }
}
