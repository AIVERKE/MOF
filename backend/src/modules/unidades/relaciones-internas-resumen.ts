export type RelacionInternaItem = {
  relacionadaId: number;
  nombre?: string | null;
  sigla?: string | null;
};

export type UnidadUniverso = {
  id: number;
  claseId: number | null;
  claseNombre: string | null;
  tipoId: number | null;
  tipoNombre: string | null;
};

export type RelacionInternaResumida = {
  nombre: string;
  sigla?: string | null;
};

/** Grupos más chicos no se resumen (ej: RECTORADO tiene una sola unidad). */
export const MIN_GRUPO_RESUMEN = 3;

type Grupo = { nombre: string; ids: number[] };

function agrupar(
  universo: UnidadUniverso[],
  idOf: (u: UnidadUniverso) => number | null,
  nombreOf: (u: UnidadUniverso) => string | null,
): Grupo[] {
  const map = new Map<number, Grupo>();
  for (const u of universo) {
    const key = idOf(u);
    const nombre = (nombreOf(u) || '').trim();
    if (key == null || !nombre) continue;
    if (!map.has(key)) map.set(key, { nombre, ids: [] });
    map.get(key)!.ids.push(u.id);
  }
  return [...map.values()];
}

/**
 * Reemplaza los grupos completamente relacionados por una sola línea para el PDF.
 * Primero por Tipo funcional, luego por Instancia (clase) sobre lo que queda.
 * Los grupos parciales se listan unidad por unidad.
 */
export function resumirRelacionesInternas(
  relacionadas: RelacionInternaItem[],
  universo: UnidadUniverso[],
  unidadId: number,
): RelacionInternaResumida[] {
  const candidatos = universo.filter((u) => u.id !== unidadId);
  const relacionadasIds = new Set(
    relacionadas.map((r) => Number(r.relacionadaId)),
  );
  const restantes = new Set(relacionadasIds);
  const resumenes: RelacionInternaResumida[] = [];

  const colapsar = (grupos: Grupo[], etiqueta: (g: Grupo) => string) => {
    for (const g of grupos.sort((a, b) => a.nombre.localeCompare(b.nombre))) {
      if (g.ids.length < MIN_GRUPO_RESUMEN) continue;
      if (!g.ids.every((id) => relacionadasIds.has(id))) continue;
      // Grupo ya cubierto entero por un resumen anterior: no repetirlo.
      if (!g.ids.some((id) => restantes.has(id))) continue;
      resumenes.push({ nombre: etiqueta(g) });
      g.ids.forEach((id) => restantes.delete(id));
    }
  };

  colapsar(
    agrupar(
      candidatos,
      (u) => u.tipoId,
      (u) => u.tipoNombre,
    ),
    (g) =>
      `TODAS LAS UNIDADES DE TIPO ${g.nombre.toUpperCase()} (${g.ids.length})`,
  );
  colapsar(
    agrupar(
      candidatos,
      (u) => u.claseId,
      (u) => u.claseNombre,
    ),
    (g) => `TODAS LAS ${g.nombre.toUpperCase()} (${g.ids.length})`,
  );

  const individuales = relacionadas
    .filter((r) => restantes.has(Number(r.relacionadaId)))
    .map((r) => ({ nombre: r.nombre ?? '', sigla: r.sigla ?? null }));

  return [...resumenes, ...individuales];
}

export type CoordinacionInternaTexto = { id: number; descripcion: string };

export type RelacionInternaUnidad = {
  id: number;
  relacionadaId: number;
  codigo?: string | null;
  nombre?: string | null;
  sigla?: string | null;
  tipo?: string | null;
};

export type RelacionamientoInternoItem =
  | { orden: number; origen: 'TEXTO'; id: number; descripcion: string }
  | {
      orden: number;
      origen: 'UNIDAD';
      id: number;
      descripcion: string;
      relacionadaId: number;
      codigo: string | null;
      sigla: string | null;
      tipo: string | null;
    };

/**
 * Lista única y numerada de la sección "Relacionamiento y coordinación interna":
 * primero los textos libres, luego las unidades vinculadas, cada grupo en su orden de alta.
 */
export function consolidarRelacionamientoInterno(
  textos: CoordinacionInternaTexto[],
  unidades: RelacionInternaUnidad[],
): RelacionamientoInternoItem[] {
  const items: RelacionamientoInternoItem[] = [];
  for (const t of textos) {
    items.push({
      orden: items.length + 1,
      origen: 'TEXTO',
      id: t.id,
      descripcion: t.descripcion,
    });
  }
  for (const u of unidades) {
    items.push({
      orden: items.length + 1,
      origen: 'UNIDAD',
      id: u.id,
      descripcion: u.nombre ?? u.sigla ?? '',
      relacionadaId: u.relacionadaId,
      codigo: u.codigo ?? null,
      sigla: u.sigla ?? null,
      tipo: u.tipo ?? null,
    });
  }
  return items;
}

/** Recorta, colapsa espacios y descarta textos vacíos o repetidos, conservando el orden. */
export function normalizarCoordinacionesInternas(
  items: readonly unknown[],
): string[] {
  const vistos = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const raw =
      item && typeof item === 'object'
        ? (item as { descripcion?: unknown }).descripcion
        : item;
    if (typeof raw !== 'string') continue;
    const texto = raw.replace(/\s+/g, ' ').trim();
    if (!texto || vistos.has(texto)) continue;
    vistos.add(texto);
    result.push(texto);
  }
  return result;
}
