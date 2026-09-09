/**
 * Lee el Excel AJUSTES_NOMINAS CARGOS_S-MAU y genera cargos-dataset.json.
 * Uso: npm run seed:cargos:extract
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import * as XLSX from 'xlsx';
import {
  buildCodigo,
  buildMatchAliases,
  CargoAmbito,
  CargoDatasetRow,
  dedupeRows,
} from './cargos-match';

const SOURCE = join(
  __dirname,
  'sources',
  'AJUSTES_NOMINAS.CARGOS_S-MAU.1.xlsx',
);
const OUT = join(__dirname, 'cargos-dataset.json');

function cellStr(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function cellNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function findHeaderRow(
  rows: unknown[][],
  colA: string,
  colB: string,
): { headerIdx: number; cargoCol: number; secondCol: number } | null {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i] || [];
    for (let j = 0; j < row.length; j++) {
      const a = cellStr(row[j]).toUpperCase();
      const b = cellStr(row[j + 1]).toUpperCase();
      if (a === colA && b.includes(colB)) {
        return { headerIdx: i, cargoCol: j, secondCol: j + 1 };
      }
    }
  }
  return null;
}

function extractSheet(
  wb: XLSX.WorkBook,
  sheetName: string,
  ambito: CargoAmbito,
  secondHeader: 'NIVEL' | 'CARGA',
): CargoDatasetRow[] {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Hoja no encontrada: ${sheetName}`);
  }
  const rawRows: unknown[] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });
  const rows: unknown[][] = rawRows.map((r) =>
    Array.isArray(r) ? (r as unknown[]) : [],
  );

  const header = findHeaderRow(
    rows,
    'CARGO',
    secondHeader === 'NIVEL' ? 'NIVEL' : 'CARGA',
  );
  if (!header) {
    throw new Error(
      `No se encontró encabezado CARGO / ${secondHeader} en ${sheetName}`,
    );
  }

  const out: CargoDatasetRow[] = [];
  for (let i = header.headerIdx + 1; i < rows.length; i++) {
    const row: unknown[] = rows[i] ?? [];
    const nombre = cellStr(row[header.cargoCol]);
    if (!nombre) continue;

    let nivelOrden: number | null = null;
    let cargaHoraria: number | null = null;
    if (ambito === 'ADM') {
      nivelOrden = cellNum(row[header.secondCol]);
      if (nivelOrden == null) continue;
    } else {
      cargaHoraria = cellNum(row[header.secondCol]);
    }

    out.push({
      codigo: buildCodigo(ambito, nombre, nivelOrden),
      nombre,
      ambito,
      nivelOrden,
      cargaHoraria,
      matchAliases: buildMatchAliases(nombre),
    });
  }
  return out;
}

function main() {
  const wb = XLSX.readFile(SOURCE);
  const adm = extractSheet(wb, 'CARGOS ADM', 'ADM', 'NIVEL');
  const acad = extractSheet(wb, 'CARGOS ACAD', 'ACAD', 'CARGA');
  const rows = dedupeRows([...adm, ...acad]);

  const payload = {
    source: 'AJUSTES_NOMINAS.CARGOS_S-MAU.1.xlsx',
    generatedAt: new Date().toISOString(),
    counts: {
      adm: rows.filter((r) => r.ambito === 'ADM').length,
      acad: rows.filter((r) => r.ambito === 'ACAD').length,
      total: rows.length,
    },
    rows,
  };

  writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf8');
  console.log(
    `Dataset escrito: ${OUT} (ADM=${payload.counts.adm}, ACAD=${payload.counts.acad}, total=${payload.counts.total})`,
  );
}

main();
