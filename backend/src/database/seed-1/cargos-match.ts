/**
 * Normalización y alias para matching Excel ↔ catálogo UMSA de cargos.
 */

export type CargoAmbito = 'ADM' | 'ACAD';

export interface CargoDatasetRow {
  codigo: string;
  nombre: string;
  ambito: CargoAmbito;
  nivelOrden: number | null;
  cargaHoraria?: number | null;
  matchAliases: string[];
}

/** Colapsa espacios, trim, upper, quita acentos. */
export function normalizeCargoName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[/\-_.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/** Slug corto para codigo: letras/números y guiones. */
export function slugCargo(nombre: string): string {
  return normalizeCargoName(nombre)
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/**
 * Alias Excel → nombres ya existentes en el snapshot UMSA.
 * Claves = nombre normalizado del Excel (normalizeCargoName).
 */
export const EXCEL_TO_EXISTING_ALIASES: Record<string, string[]> = {
  RECTORA: ['RECTOR/A', 'RECTORA', 'RECTOR'],
  VICERRECTOR: ['VICERRECTOR/A', 'VICERRECTOR'],
  DEFENSOR: [
    'DEFENSOR/A  UNIVERSITARIO',
    'DEFENSOR/A UNIVERSITARIO',
    'DEFENSOR UNIVERSITARIO',
    'DEFENSOR',
  ],
  'SECRETARIO GENERAL': ['SECRETARIO/A GENERAL', 'SECRETARIO GENERAL'],
  'SECRETARIO ACADEMICO': [
    'SECRETARIO/A ACADÉMICO',
    'SECRETARIO ACADÉMICO',
    'SECRETARIO/A ACADEMICO',
    'SECRETARIO ACADEMICO',
  ],
  'JEFE DE DIVISION': ['JEFE DE DIVISIÓN', 'JEFE DE DIVISION'],
  'JEFE DE SECCION': ['JEFE DE SECCIÓN', 'JEFE DE SECCION'],
  DECANO: ['DECANO/A', 'DECANO'],
  VICEDECANO: ['VICEDECANO/A', 'VICEDECANO'],
  'JEDE DIRECTOR DE CARRERA': [
    'DIRECTOR/A DE CARRERA',
    'JEFE/DIRECTOR DE CARRERA',
    'JEDE/DIRECTOR DE CARRERA',
    'DIRECTOR DE CARRERA',
  ],
  'DIRECTOR DE INSTITUTO': ['DIRECTOR/A DE INSTITUTO', 'DIRECTOR DE INSTITUTO'],
};

export function buildMatchAliases(excelNombre: string): string[] {
  const key = normalizeCargoName(excelNombre);
  const mapped = EXCEL_TO_EXISTING_ALIASES[key];
  const aliases = new Set<string>([excelNombre.trim()]);
  if (mapped) {
    for (const a of mapped) aliases.add(a);
  }
  return [...aliases];
}

export function buildCodigo(
  ambito: CargoAmbito,
  nombre: string,
  nivelOrden: number | null,
): string {
  const slug = slugCargo(nombre);
  if (ambito === 'ADM' && nivelOrden != null) {
    return `ADM-${nivelOrden}-${slug}`.slice(0, 64);
  }
  return `ACAD-${slug}`.slice(0, 64);
}

/**
 * Elige el mejor match entre candidatos: activo primero, luego menor id.
 */
export function pickBestMatch<T extends { activo: boolean; id: string | number }>(
  candidates: T[],
): T | null {
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => {
    if (a.activo !== b.activo) return a.activo ? -1 : 1;
    return Number(a.id) - Number(b.id);
  })[0];
}

/**
 * Deduplica filas exactas (mismo nombre normalizado + mismo nivel + mismo ámbito).
 */
export function dedupeRows(rows: CargoDatasetRow[]): CargoDatasetRow[] {
  const seen = new Set<string>();
  const out: CargoDatasetRow[] = [];
  for (const row of rows) {
    const key = `${row.ambito}|${row.nivelOrden ?? 'null'}|${normalizeCargoName(row.nombre)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}
