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
