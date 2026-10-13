/**
 * Utilidades para la navegación progresiva por niveles en el Organigrama MOF.
 * Permite explorar el organigrama nivel por nivel:
 * - Vista inicial: solo nodo raíz y sus hijos directos de primer nivel (sin nietos).
 * - Clic en nodo: muestra exclusivamente dicho nodo y sus descendientes inmediatos (sin nietos).
 * - Subir nivel: repliega hacia el nodo padre inmediato.
 * - Breadcrumbs: traza el camino de ancestros hasta la raíz.
 */

/**
 * Obtiene el ID del padre efectivo de una unidad, considerando el modo oficial (estricto) o analítico.
 *
 * @param {Object} unidad - Unidad a consultar
 * @param {string} modo - "estricto" o "analitico"
 * @param {Map<string, Object>} [unidadesById] - Mapa opcional para resolver ancestro oficial en modo estricto
 * @returns {string|null} ID del padre efectivo en formato string, o null si es raíz
 */
export function getEffectiveParentId(unidad, modo = "analitico", unidadesById = null) {
  if (!unidad) return null;

  if (modo === "estricto" && unidadesById) {
    let currentParentId =
      unidad.parent && typeof unidad.parent === "object"
        ? unidad.parent.id
        : unidad.parent;

    while (currentParentId) {
      const parentUnit = unidadesById.get(String(currentParentId));
      if (!parentUnit) break;

      const isOficial =
        parentUnit.oficial === true ||
        parentUnit.oficial === 1 ||
        parentUnit.is_oficial === true ||
        parentUnit.is_oficial === 1 ||
        parentUnit.isOficial === true;

      if (isOficial) {
        return String(parentUnit.id);
      }

      currentParentId =
        parentUnit.parent && typeof parentUnit.parent === "object"
          ? parentUnit.parent.id
          : parentUnit.parent;
    }
    return null;
  }

  const p =
    unidad.parent && typeof unidad.parent === "object"
      ? unidad.parent.id
      : unidad.parent;
  return p !== null && p !== undefined && String(p).trim() !== ""
    ? String(p).trim()
    : null;
}

/**
 * Precalcula la cantidad de hijos directos que tiene cada unidad en el conjunto dado.
 *
 * @param {Array<Object>} sourceUnits - Lista de unidades
 * @param {string} modo - "estricto" o "analitico"
 * @param {Map<string, Object>} [unidadesById] - Mapa opcional de unidades
 * @returns {Map<string, number>} Mapa { [unidadId]: cantidadDeHijosDirectos }
 */
export function getChildrenCountMap(sourceUnits, modo = "analitico", unidadesById = null) {
  const countMap = new Map();
  if (!Array.isArray(sourceUnits)) return countMap;

  for (const u of sourceUnits) {
    const pId = getEffectiveParentId(u, modo, unidadesById);
    if (pId) {
      countMap.set(pId, (countMap.get(pId) || 0) + 1);
    }
  }
  return countMap;
}

/**
 * Identifica los nodos raíz en el conjunto dado (unidades sin padre o cuyo padre no está en la lista).
 *
 * @param {Array<Object>} sourceUnits - Lista de unidades
 * @param {string} modo - "estricto" o "analitico"
 * @param {Map<string, Object>} [unidadesById] - Mapa opcional de unidades
 * @returns {Array<Object>} Lista de nodos raíz
 */
export function getRootUnits(sourceUnits, modo = "analitico", unidadesById = null) {
  if (!Array.isArray(sourceUnits) || sourceUnits.length === 0) return [];

  const idSet = new Set(sourceUnits.map((u) => String(u.id)));
  return sourceUnits.filter((u) => {
    const pId = getEffectiveParentId(u, modo, unidadesById);
    return !pId || !idSet.has(pId);
  });
}

/**
 * Calcula las unidades que deben visualizarse en el lienzo según el estado de navegación:
 * - Si fullTree = true: devuelve todas las unidades.
 * - Si activeNodeId == null: devuelve las raíces y sus hijos directos de primer nivel (sin nietos).
 * - Si activeNodeId != null: devuelve la unidad activa y sus hijos directos (sin nietos).
 *   Si la unidad activa no se encuentra, retrocede al estado inicial de raíces.
 *
 * @param {Array<Object>} sourceUnits - Lista de unidades en el modo actual
 * @param {string|number|null} activeNodeId - ID del nodo activo seleccionado
 * @param {boolean} [fullTree=false] - Si es true, retorna el árbol completo
 * @param {string} [modo="analitico"] - "estricto" o "analitico"
 * @param {Map<string, Object>} [unidadesById] - Mapa opcional de unidades
 * @returns {{ visibleUnits: Array<Object>, activeNode: Object|null, isAtRoot: boolean }}
 */
export function getVisibleUnits(
  sourceUnits,
  activeNodeId = null,
  fullTree = false,
  modo = "analitico",
  unidadesById = null,
) {
  if (!Array.isArray(sourceUnits) || sourceUnits.length === 0) {
    return { visibleUnits: [], activeNode: null, isAtRoot: true };
  }

  if (fullTree) {
    return { visibleUnits: [...sourceUnits], activeNode: null, isAtRoot: true };
  }

  const byId = new Map();
  sourceUnits.forEach((u) => byId.set(String(u.id), u));

  const strActiveId =
    activeNodeId !== null && activeNodeId !== undefined
      ? String(activeNodeId).trim()
      : null;

  if (strActiveId && byId.has(strActiveId)) {
    const activeNode = byId.get(strActiveId);
    const directChildren = sourceUnits.filter((u) => {
      const pId = getEffectiveParentId(u, modo, unidadesById);
      return pId === strActiveId;
    });

    return {
      visibleUnits: [activeNode, ...directChildren],
      activeNode,
      isAtRoot: false,
    };
  }

  // Vista inicial por defecto: raíces y únicamente sus hijos de primer nivel
  const roots = getRootUnits(sourceUnits, modo, unidadesById);
  const rootIds = new Set(roots.map((r) => String(r.id)));
  const directChildren = sourceUnits.filter((u) => {
    const pId = getEffectiveParentId(u, modo, unidadesById);
    return pId && rootIds.has(pId);
  });

  return {
    visibleUnits: [...roots, ...directChildren],
    activeNode: roots.length === 1 ? roots[0] : null,
    isAtRoot: true,
  };
}

/**
 * Calcula la ruta jerárquica de ancestros (Breadcrumbs) desde la raíz hasta el nodo activo.
 *
 * @param {string|number|null} activeNodeId - ID del nodo activo
 * @param {Map<string, Object>|Array<Object>} unidades - Mapa o lista de unidades
 * @param {string} [modo="analitico"] - "estricto" o "analitico"
 * @returns {Array<{ id: string, nombre: string, sigla: string|null }>} Lista ordenada de ancestros
 */
export function getBreadcrumbPath(activeNodeId, unidades, modo = "analitico") {
  if (!activeNodeId) return [];

  const byId =
    unidades instanceof Map
      ? unidades
      : new Map((unidades || []).map((u) => [String(u.id), u]));

  const path = [];
  let currentId = String(activeNodeId).trim();
  const visited = new Set();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const u = byId.get(currentId);
    if (!u) break;

    path.unshift({
      id: String(u.id),
      nombre: u.nombre || u.denominacion || "Sin nombre",
      sigla: u.sigla && u.sigla !== "-" ? u.sigla : null,
    });

    const pId = getEffectiveParentId(u, modo, byId);
    currentId = pId ? String(pId) : null;
  }

  return path;
}

/**
 * Determina el ID al que debe navegar al accionar "Subir un nivel":
 * - Si está en raíz: retorna null (no se puede subir más).
 * - Si el nodo actual es hijo de la raíz: retorna null (vuelve al estado inicial de raíces).
 * - Si tiene padre y abuelo: retorna el ID del padre inmediato.
 *
 * @param {string|number} activeNodeId - ID del nodo activo actual
 * @param {Map<string, Object>|Array<Object>} unidades - Unidades disponibles
 * @param {string} [modo="analitico"] - "estricto" o "analitico"
 * @returns {string|null} ID del nivel superior al que navegar, o null si retorna a la vista raíz
 */
export function getParentNavigationId(activeNodeId, unidades, modo = "analitico") {
  if (!activeNodeId) return null;

  const byId =
    unidades instanceof Map
      ? unidades
      : new Map((unidades || []).map((u) => [String(u.id), u]));

  const currentUnit = byId.get(String(activeNodeId));
  if (!currentUnit) return null;

  const pId = getEffectiveParentId(currentUnit, modo, byId);
  if (!pId) return null;

  const parentUnit = byId.get(String(pId));
  if (!parentUnit) return null;

  const grandParentId = getEffectiveParentId(parentUnit, modo, byId);
  if (!grandParentId) {
    // El padre es el nodo raíz institucional: al subir, volver a la vista inicial con todas las raíces
    return null;
  }

  return String(pId);
}

/**
 * Obtiene la lista de IDs de los hijos directos de una unidad (sin nietos).
 *
 * @param {string|number|null} activeNodeId - ID de la unidad padre
 * @param {Array<Object>} sourceUnits - Lista de unidades
 * @param {string} [modo="analitico"] - "estricto" o "analitico"
 * @param {Map<string, Object>} [unidadesById=null] - Mapa opcional
 * @returns {Array<string>} Lista de IDs de hijos directos como strings
 */
export function getDirectChildrenIds(
  activeNodeId,
  sourceUnits,
  modo = "analitico",
  unidadesById = null,
) {
  if (!activeNodeId || !Array.isArray(sourceUnits)) return [];
  const strActiveId = String(activeNodeId).trim();
  const children = [];

  for (const u of sourceUnits) {
    const pId = getEffectiveParentId(u, modo, unidadesById);
    if (pId === strActiveId) {
      children.push(String(u.id));
    }
  }
  return children;
}

/**
 * Obtiene la lista de IDs de todos los ancestros de un nodo hasta la raíz (orden ascendente).
 *
 * @param {string|number|null} activeNodeId - ID del nodo activo
 * @param {Map<string, Object>|Array<Object>} unidades - Mapa o lista de unidades
 * @param {string} [modo="analitico"] - "estricto" o "analitico"
 * @returns {Array<string>} Lista de IDs de ancestros desde el padre inmediato hasta la raíz
 */
export function getAncestorsIds(activeNodeId, unidades, modo = "analitico") {
  if (!activeNodeId) return [];
  const byId =
    unidades instanceof Map
      ? unidades
      : new Map((unidades || []).map((u) => [String(u.id), u]));

  const ancestors = [];
  let currentUnit = byId.get(String(activeNodeId).trim());
  const visited = new Set([String(activeNodeId).trim()]);

  while (currentUnit) {
    const pId = getEffectiveParentId(currentUnit, modo, byId);
    if (!pId || visited.has(String(pId))) break;
    visited.add(String(pId));
    ancestors.push(String(pId));
    currentUnit = byId.get(String(pId));
  }

  return ancestors;
}

/**
 * Obtiene el clúster de enfoque visual completo para la exploración por niveles:
 * - activeId: ID del nodo seleccionado
 * - directChildrenIds: IDs de sus descendientes directos inmediatos
 * - ancestorIds: IDs de sus ancestros directos hasta la raíz
 * - clusterIdsSet: Set con todos los IDs del clúster
 *
 * @param {string|number|null} activeNodeId - ID del nodo activo
 * @param {Array<Object>} sourceUnits - Lista de unidades
 * @param {string} [modo="analitico"] - "estricto" o "analitico"
 * @param {Map<string, Object>} [unidadesById=null] - Mapa opcional
 * @returns {{ activeId: string|null, directChildrenIds: Array<string>, ancestorIds: Array<string>, clusterIdsSet: Set<string> }}
 */
export function getNavigationCluster(
  activeNodeId,
  sourceUnits,
  modo = "analitico",
  unidadesById = null,
) {
  if (!activeNodeId || !Array.isArray(sourceUnits)) {
    return {
      activeId: null,
      directChildrenIds: [],
      ancestorIds: [],
      clusterIdsSet: new Set(),
    };
  }

  const byId =
    unidadesById || new Map(sourceUnits.map((u) => [String(u.id), u]));
  const strActiveId = String(activeNodeId).trim();

  if (!byId.has(strActiveId)) {
    return {
      activeId: null,
      directChildrenIds: [],
      ancestorIds: [],
      clusterIdsSet: new Set(),
    };
  }

  const directChildrenIds = getDirectChildrenIds(
    strActiveId,
    sourceUnits,
    modo,
    byId,
  );
  const ancestorIds = getAncestorsIds(strActiveId, byId, modo);
  const clusterIdsSet = new Set([
    strActiveId,
    ...directChildrenIds,
    ...ancestorIds,
  ]);

  return {
    activeId: strActiveId,
    directChildrenIds,
    ancestorIds,
    clusterIdsSet,
  };
}
