/**
 * Reglas de texto del PDF con el formato oficial del MOF.
 *
 * En la BD los nombres de unidad llevan prefijos de agrupación
 * ("FMENTM - DEC - UNIDAD DE ADMINISTRACIÓN DESCONCENTRADA",
 * "FMENTM - FACULTAD DE MEDICINA, … - DECANATO") y van en MAYÚSCULAS; el
 * documento oficial muestra solo la denominación ("Unidad de Administración
 * Desconcentrada", "Decanato") y la facultad en el encabezado.
 */

/** Encabezado de las unidades que no dependen de una facultad. */
export const ADMINISTRACION_CENTRAL = 'ADMINISTRACIÓN CENTRAL';

/** Un único token de sigla seguido de guion: "FMENTM - ", "DEC-", "CARR.TS-", "FO.DEC-". */
const PREFIJO_SIGLA = /^[A-ZÁÉÍÓÚÑÜ0-9.]{2,10}\s*[-–]\s*/u;

/** "FACULTAD DE … - " delante de la denominación ("… - DECANATO"). */
const PREFIJO_FACULTAD = /^FACULTAD\s+DE\s+[^-–]+?\s*[-–]\s*/iu;

/** "FACULTAD DE …" hasta "-DECANATO", hasta el siguiente " - " o hasta el final. */
const FACULTAD_EN_NOMBRE =
  /(FACULTAD\s+DE\s+.+?)\s*(?:[-–]\s*DECANATO\b|\s[-–]\s|$)/iu;

const CONECTORES = new Set([
  'de',
  'del',
  'la',
  'las',
  'los',
  'el',
  'y',
  'e',
  'o',
  'u',
  'en',
  'a',
  'al',
  'con',
  'para',
  'por',
  'sin',
]);

const SIGLAS = new Set([
  'UMSA',
  'DAF',
  'TVU',
  'IDR',
  'IRD',
  'DU',
  'CEPIES',
  'HCU',
  'POA',
  'SIA',
  'DANA',
  'TIC',
]);

const PALABRA = /\([^)]*\)|[\p{L}\p{N}]+/gu;
const VOCAL = /[AEIOUÁÉÍÓÚÜ]/u;
/** Abreviaturas sin vocales que no son siglas. */
const ABREVIATURAS = new Set(['DR', 'SR', 'SRS']);
const ROMANO = /^[IVX]{1,4}$/u;
/** Sigla corta al final tras " - ": "INSTITUTO DE ELECTRÓNICA APLICADA - IEA". */
const SIGLA_FINAL = /\s[-–]\s*([\p{Lu}]{2,5})$/u;

/** Denominación de la unidad sin los prefijos de agrupación. */
export function nombreCorto(nombre: string | null | undefined): string {
  const original = (nombre ?? '').replace(/\s+/g, ' ').trim();
  let actual = original;
  for (;;) {
    const siguiente = actual
      .replace(PREFIJO_SIGLA, '')
      .replace(PREFIJO_FACULTAD, '')
      .trim();
    if (siguiente === actual) break;
    actual = siguiente;
  }
  return actual || original;
}

/**
 * Tipo título en español para textos guardados en MAYÚSCULAS. Un texto que ya
 * trae minúsculas se respeta tal cual.
 */
export function tituloEs(texto: string | null | undefined): string {
  const value = (texto ?? '').replace(/[ \t]+/g, ' ').trim();
  if (!value || /\p{Ll}/u.test(value)) return value;

  const siglaFinal = SIGLA_FINAL.exec(value);
  const siglaFinalAt = siglaFinal ? value.length - siglaFinal[1].length : -1;

  let index = 0;
  return value.replace(PALABRA, (word: string, offset: number) => {
    const first = index === 0;
    index++;
    if (word.startsWith('(')) {
      // Una sola palabra corta entre paréntesis es la sigla: "(IBBA)", "(UPCED)".
      const inner = word.slice(1, -1).trim();
      return /^[\p{L}\p{N}.]{1,8}$/u.test(inner)
        ? word
        : `(${tituloEs(inner)})`;
    }
    if (offset === siglaFinalAt) return word;
    if (/^\p{N}+$/u.test(word)) return word;
    const lower = word.toLocaleLowerCase('es');
    if (!first && CONECTORES.has(lower)) return lower;
    if (SIGLAS.has(word) || ROMANO.test(word)) return word;
    if (word.length > 1 && !VOCAL.test(word) && !ABREVIATURAS.has(word)) {
      return word;
    }
    return lower.charAt(0).toLocaleUpperCase('es') + lower.slice(1);
  });
}

/**
 * E. Nivel jerárquico como lo pide el formato: solo el nivel, sin su
 * subcategoría. El catálogo trae "Ejecutivo Estratégico Facultativo",
 * "Ejecutivo Operativo", etc.; el MOF muestra "Ejecutivo". "Operativo" y
 * "Directorio" quedan igual.
 */
export function nivelMof(nivel: string | null | undefined): string {
  const [primera = ''] = tituloEs(nivel).split(' ');
  return primera;
}

/**
 * F. Tipo de unidad como lo pide el formato: sin la aclaración entre
 * paréntesis. "Sustantivo (Académico)" → "Sustantivo".
 */
export function tipoUnidadMof(tipo: string | null | undefined): string {
  return tituloEs((tipo ?? '').replace(/\s*\([^)]*\)/g, ''));
}

/** "FACULTAD DE …" contenida en el nombre (el del Decanato), en mayúsculas. */
export function facultadDesdeNombre(
  nombre: string | null | undefined,
): string | null {
  const match = FACULTAD_EN_NOMBRE.exec((nombre ?? '').trim());
  if (!match) return null;
  const facultad = match[1].replace(/\s+/g, ' ').trim();
  return facultad ? facultad.toLocaleUpperCase('es') : null;
}

/** Nombre de unidad tal como lo muestra el formato oficial. */
export function nombreUnidadMof(nombre: string | null | undefined): string {
  return tituloEs(nombreCorto(nombre));
}

/**
 * Nombres de una lista de unidades en el formato oficial. Si dos quedan
 * iguales al quitar los prefijos ("Unidad de Administración Desconcentrada"
 * de dos facultades), se les agrega su primera sigla: "… (FMENTM)".
 */
export function nombresUnidadesMof(
  nombres: (string | null | undefined)[],
): string[] {
  const originales = nombres
    .map((n) => (n ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const cortos = originales.map((n) => nombreUnidadMof(n));
  const veces = new Map<string, number>();
  cortos.forEach((c) => {
    const key = c.toLocaleLowerCase('es');
    veces.set(key, (veces.get(key) ?? 0) + 1);
  });
  return cortos.map((corto, i) => {
    if ((veces.get(corto.toLocaleLowerCase('es')) ?? 0) < 2) return corto;
    const sigla = PREFIJO_SIGLA.exec(originales[i])?.[0]
      .replace(/[-–\s]+$/u, '')
      .replace(/\.$/, '');
    return sigla ? `${corto} (${sigla})` : corto;
  });
}
