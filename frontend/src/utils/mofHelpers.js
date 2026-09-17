/**
 * Helpers y utilidades compartidas para el módulo MOF
 * Centraliza la lógica de negocio y formateo para cumplir con SPEC.md
 */

/**
 * Formatea una fecha a string YYYY-MM-DD para el backend
 */
export const formatDateToString = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Parsea una fecha desde el formato ISO del API a objeto Date
 */
export const parseDateFromApi = (dateStr) => {
  if (!dateStr) return null;
  const base = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const [year, month, day] = base.split("-").map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Formatea una fecha para visualización en formato DD/MM/YYYY
 */
export const formatDateForDisplay = (dateStr) => {
  if (!dateStr) return "Sin fecha";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
};

/**
 * Constantes nombradas para pesos jerárquicos y colores por defecto
 */
export const PESO_NULO = 99;
export const PESO_DEFAULT = 10;
export const DEFAULT_CLASE_COLOR = "#757575";

/**
 * Paleta estándar universal Okabe-Ito (Wong, 2011) optimizada para
 * deficiencias de percepción cromática (deuteranopia, protanopia, tritanopia).
 */
export const OKABE_ITO_PALETTE = [
  "#0072B2", // Blue (Azul institucional accesible)
  "#E69F00", // Orange (Naranja cálido)
  "#009E73", // Bluish Green (Verde azulado)
  "#D55E00", // Vermilion (Bermellón)
  "#CC79A7", // Reddish Purple (Púrpura rojizo)
  "#56B4E9", // Sky Blue (Azul cielo)
  "#F0E442", // Yellow (Amarillo)
];

const NORMALIZE_CACHE_MAX_SIZE = 1000;
const normalizeCache = new Map();

/**
 * Normaliza un texto para búsquedas y comparaciones (sin acentos, minúsculas, limpio).
 * Utiliza memoización con LRU simple de tamaño acotado para acelerar búsquedas en 1000+ unidades.
 *
 * @param {string|any} text
 * @returns {string}
 */
export const normalizeText = (text) => {
  if (text === null || text === undefined) return "";
  const key = String(text);

  const cached = normalizeCache.get(key);
  if (cached !== undefined) {
    normalizeCache.delete(key);
    normalizeCache.set(key, cached);
    return cached;
  }

  const normalized = key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (normalizeCache.size >= NORMALIZE_CACHE_MAX_SIZE) {
    const firstKey = normalizeCache.keys().next().value;
    normalizeCache.delete(firstKey);
  }

  normalizeCache.set(key, normalized);
  return normalized;
};

/**
 * Limpia el cache de normalización (útil para tests).
 */
export const clearNormalizeCache = () => {
  normalizeCache.clear();
};

/**
 * Normaliza cualquier representación de booleano a true o false.
 * Soporta booleanos primitivos, números (1/0), strings ("true"/"false"/"1"/"0"/"t"/"f"/"si"/"no"), null y undefined.
 *
 * @param {any} val
 * @returns {boolean}
 */
export const toBoolean = (val) => {
  if (val === true || val === 1) return true;
  if (val === false || val === 0 || val === null || val === undefined) return false;

  if (typeof val === "string") {
    const s = val.trim().toLowerCase();
    if (
      s === "true" ||
      s === "1" ||
      s === "t" ||
      s === "si" ||
      s === "sí" ||
      s === "yes" ||
      s === "y"
    ) {
      return true;
    }
    if (
      s === "false" ||
      s === "0" ||
      s === "f" ||
      s === "no" ||
      s === "n" ||
      s === ""
    ) {
      return false;
    }
  }

  return Boolean(val);
};

/**
 * Extrae de forma segura el identificador o valor representativo de clase de una unidad u objeto.
 *
 * @param {Object|number|string} val
 * @returns {any}
 */
export const getCampoClase = (val) => {
  if (!val) return null;
  if (typeof val !== "object") return val;
  const ref = val.clase ?? val.tipoUnidad ?? val.tipo_unidad;
  if (ref !== undefined && ref !== null) {
    if (typeof ref === "object") {
      return ref.id ?? ref.value ?? ref.descripcion ?? ref.nombre ?? null;
    }
    return ref;
  }
  return val.id ?? val.value ?? val.descripcion ?? val.nombre ?? null;
};

/**
 * Resuelve un elemento de catálogo con una estrategia unificada y consistente:
 * 1. Coincidencia directa por id o value (numérico o string).
 * 2. Coincidencia por texto normalizado (sin acentos, case-insensitive) sobre codigo, value, descripcion o nombre.
 *
 * @param {any} value - Valor buscado (ID, objeto, código o descripción)
 * @param {Array} catalog - Colección de catálogo
 * @returns {Object|null} El elemento del catálogo encontrado o null
 */
export const resolveCatalogItem = (value, catalog = []) => {
  if (
    value === null ||
    value === undefined ||
    !Array.isArray(catalog) ||
    catalog.length === 0
  ) {
    return null;
  }

  let rawTarget = value;
  if (typeof value === "object") {
    rawTarget =
      value.id ??
      value.value ??
      value.codigo ??
      value.descripcion ??
      value.description ??
      value.nombre;
  }

  if (rawTarget === null || rawTarget === undefined || rawTarget === "") {
    return null;
  }

  const strTarget = String(rawTarget).trim();

  // 1. Estrategia 1: Matching por id o value (directo)
  const byIdOrValue = catalog.find((item) => {
    if (!item) return false;
    return (
      (item.id !== undefined &&
        item.id !== null &&
        String(item.id).trim() === strTarget) ||
      (item.value !== undefined &&
        item.value !== null &&
        String(item.value).trim() === strTarget)
    );
  });
  if (byIdOrValue) return byIdOrValue;

  // 2. Estrategia 2: Matching por texto normalizado (código, descripción, nombre)
  const normTarget = normalizeText(strTarget);
  if (!normTarget) return null;

  return (
    catalog.find((item) => {
      if (!item) return false;
      const codNorm = item.codigo ? normalizeText(item.codigo) : "";
      if (codNorm && codNorm === normTarget) return true;

      const descNorm = item.descripcion
        ? normalizeText(item.descripcion)
        : item.description
        ? normalizeText(item.description)
        : "";
      if (descNorm && descNorm === normTarget) return true;

      const nomNorm = item.nombre ? normalizeText(item.nombre) : "";
      if (nomNorm && nomNorm === normTarget) return true;

      const valNorm = item.value ? normalizeText(item.value) : "";
      if (valNorm && valNorm === normTarget) return true;

      return false;
    }) || null
  );
};

/**
 * Obtiene el ID numérico de forma segura de un valor (objeto o ID)
 */
export const getSafeId = (val) => {
  if (!val) return null;
  const raw = typeof val === "object" ? (val.id ?? val.value) : val;
  const parsed = parseInt(raw);
  return isNaN(parsed) ? null : parsed;
};

/**
 * --- RESOLVERS DE CATÁLOGOS ---
 */

export const getNivelNombre = (val, niveles = []) => {
  if (val === null || val === undefined || val === "") return "---";
  if (typeof val === "object" && (val.descripcion || val.description)) {
    return val.descripcion || val.description;
  }
  const item = resolveCatalogItem(val, niveles);
  return item
    ? item.descripcion || item.description || item.nombre
    : typeof val === "object"
    ? "---"
    : val;
};

export const getTipoNombre = (val, tipos = []) => {
  if (val === null || val === undefined || val === "") return "---";
  if (typeof val === "object" && (val.descripcion || val.description)) {
    return val.descripcion || val.description;
  }
  const item = resolveCatalogItem(val, tipos);
  return item
    ? item.descripcion || item.description || item.nombre
    : typeof val === "object"
    ? "---"
    : val;
};

export const getRelacionNombre = (val, relaciones = []) => {
  if (val === null || val === undefined || val === "") return "---";
  if (typeof val === "object" && (val.descripcion || val.description)) {
    return val.descripcion || val.description;
  }
  const item = resolveCatalogItem(val, relaciones);
  return item
    ? item.descripcion || item.description || item.nombre
    : typeof val === "object"
    ? "---"
    : val;
};

export const getClaseNombre = (val, clases = []) => {
  if (val === null || val === undefined || val === "") return "---";
  if (typeof val === "object" && val.descripcion) return val.descripcion;
  const target = getCampoClase(val) ?? val;
  const item = resolveCatalogItem(target, clases);
  return item
    ? item.descripcion || item.nombre
    : typeof val === "object"
    ? "---"
    : val;
};

export const getClaseColor = (val, clases = [], isColorblind = false) => {
  if (val === null || val === undefined || val === "") return DEFAULT_CLASE_COLOR;

  if (isColorblind) {
    const target = getCampoClase(val) ?? val;
    const item = resolveCatalogItem(target, clases);
    if (item && Array.isArray(clases) && clases.length > 0) {
      const idx = clases.findIndex(
        (c) =>
          c === item ||
          (item.id != null && c.id != null && String(c.id) === String(item.id)) ||
          (item.codigo && c.codigo && c.codigo === item.codigo) ||
          (item.descripcion && c.descripcion && c.descripcion === item.descripcion),
      );
      if (idx !== -1) {
        return OKABE_ITO_PALETTE[idx % OKABE_ITO_PALETTE.length];
      }
    }
    if (!item) {
      return DEFAULT_CLASE_COLOR;
    }
    return OKABE_ITO_PALETTE[0];
  }

  if (typeof val === "object" && val.color) return val.color;
  const target = getCampoClase(val) ?? val;
  const item = resolveCatalogItem(target, clases);
  return item ? item.color || DEFAULT_CLASE_COLOR : DEFAULT_CLASE_COLOR;
};

/**
 * Devuelve un color de texto (#FFFFFF o #0F172A) con contraste óptimo según el fondo.
 */
export const getContrastingTextColor = (hexColor) => {
  if (!hexColor) return "#FFFFFF";
  let color = String(hexColor).replace("#", "").trim();
  if (color.length === 3) {
    color = color
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (color.length !== 6) return "#FFFFFF";
  const r = parseInt(color.substring(0, 2), 16) || 0;
  const g = parseInt(color.substring(2, 4), 16) || 0;
  const b = parseInt(color.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 145 ? "#0F172A" : "#FFFFFF";
};

const HIGHLIGHT_QUERY_MAX_LEN = 64;

/** Fold for accent/case-insensitive highlight (no RegExp / no user-built patterns). */
function foldForHighlight(s) {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Builds folded string + maps from each folded index to original [start, end) code-point span.
 */
function foldWithIndexMap(str) {
  let folded = "";
  const startAt = [];
  const endAt = [];
  const s = String(str);
  for (let i = 0; i < s.length; ) {
    const cp = s.codePointAt(i);
    const ch = String.fromCodePoint(cp);
    const next = i + ch.length;
    const piece = foldForHighlight(ch);
    for (let k = 0; k < piece.length; k++) {
      folded += piece[k];
      startAt.push(i);
      endAt.push(next);
    }
    i = next;
  }
  return { folded, startAt, endAt };
}

/**
 * Divide texto en segmentos para resaltar coincidencias de búsqueda sin HTML ni RegExp.
 * @returns {{ text: string, match: boolean }[]}
 */
export const getHighlightSegments = (text, query) => {
  if (text == null || text === "") return [];
  const strText = String(text);
  if (!query) return [{ text: strText, match: false }];

  let strQuery = String(query).trim();
  if (!strQuery) return [{ text: strText, match: false }];
  if (strQuery.length > HIGHLIGHT_QUERY_MAX_LEN) {
    strQuery = strQuery.slice(0, HIGHLIGHT_QUERY_MAX_LEN);
  }

  const needle = foldForHighlight(strQuery);
  if (!needle) return [{ text: strText, match: false }];

  const { folded, startAt, endAt } = foldWithIndexMap(strText);
  if (!folded) return [{ text: strText, match: false }];

  const ranges = [];
  let from = 0;
  while (from <= folded.length - needle.length) {
    const idx = folded.indexOf(needle, from);
    if (idx === -1) break;
    const origStart = startAt[idx];
    const origEnd = endAt[idx + needle.length - 1];
    ranges.push([origStart, origEnd]);
    from = idx + Math.max(needle.length, 1);
  }

  if (ranges.length === 0) {
    return [{ text: strText, match: false }];
  }

  // Merge overlapping / adjacent ranges
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [a, b] of ranges) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1]) {
      last[1] = Math.max(last[1], b);
    } else {
      merged.push([a, b]);
    }
  }

  const segments = [];
  let cursor = 0;
  for (const [a, b] of merged) {
    if (cursor < a) {
      segments.push({ text: strText.slice(cursor, a), match: false });
    }
    segments.push({ text: strText.slice(a, b), match: true });
    cursor = b;
  }
  if (cursor < strText.length) {
    segments.push({ text: strText.slice(cursor), match: false });
  }
  return segments.filter((seg) => seg.text !== "");
};

/**
 * Calcula el peso jerárquico real de una unidad.
 * Prioriza peso_real devuelto por el backend si existe, con fallback a cálculo por clase.
 */
export const getPesoReal = (unidad, clases = []) => {
  if (!unidad) return PESO_NULO;

  // 1. Dinamización: Priorizar peso_real devuelto por el backend
  if (unidad.peso_real !== null && unidad.peso_real !== undefined) {
    const p = Number(unidad.peso_real);
    if (!isNaN(p)) return p;
  }
  if (unidad.pesoReal !== null && unidad.pesoReal !== undefined) {
    const p = Number(unidad.pesoReal);
    if (!isNaN(p)) return p;
  }

  // 2. Fallbacks legacy
  if (unidad.peso !== null && unidad.peso !== undefined) return unidad.peso;
  if (unidad.orden !== null && unidad.orden !== undefined) return unidad.orden;

  const tId = getCampoClase(unidad);
  if (tId && clases && clases.length > 0) {
    const clase = resolveCatalogItem(tId, clases);
    if (clase) {
      if (clase.orden !== null && clase.orden !== undefined) return clase.orden;
      if (clase.peso !== null && clase.peso !== undefined) return clase.peso;
      const index = clases.indexOf(clase);
      if (index !== -1) return index + 1;
    }
  }
  return PESO_DEFAULT;
};

/**
 * Detecta si un nodo es de tipo STAFF (asesoría).
 * Prioriza es_staff / esStaff del backend; si no viene, degrada a búsqueda por texto/catálogo.
 */
export const isStaffNode = (unidad, relaciones = []) => {
  if (!unidad) return false;

  // 1. Dinamización: Priorizar es_staff / esStaff del backend si está presente
  if (unidad.es_staff !== null && unidad.es_staff !== undefined) {
    return toBoolean(unidad.es_staff);
  }
  if (unidad.esStaff !== null && unidad.esStaff !== undefined) {
    return toBoolean(unidad.esStaff);
  }

  // 2. Degradación segura por código o texto de relación
  const rel =
    unidad.relacion && typeof unidad.relacion === "object"
      ? unidad.relacion.id || unidad.relacion.codigo || unidad.relacion.descripcion
      : unidad.relacion;

  if (rel) {
    const relNorm = normalizeText(rel);
    if (relNorm === "s" || relNorm === "staff" || relNorm.includes("asesor")) {
      return true;
    }
    if (relaciones.length > 0) {
      const relacionItem = resolveCatalogItem(rel, relaciones);
      if (relacionItem) {
        const desc = normalizeText(
          relacionItem.descripcion || relacionItem.description || "",
        );
        const cod = normalizeText(
          relacionItem.codigo || relacionItem.value || "",
        );
        return cod === "s" || desc.includes("staff") || desc.includes("asesor");
      }
    }
  }

  const relDesc = normalizeText(unidad.str_relacion || "");
  return relDesc === "s" || relDesc.includes("staff") || relDesc.includes("asesor");
};

/**
 * Paleta de colores institucionales (dinamizable desde GET /api/v1/mof/config)
 */
export const swatches = [
  ["#1976D2", "#2196F3", "#03A9F4", "#00BCD4", "#00ACC1"], // Azules y Cianes
  ["#2E7D32", "#4CAF50", "#8BC34A", "#CDDC39", "#C0CA33"], // Verdes y Limas
  ["#FF8F00", "#FFA000", "#FFC107", "#FFEB3B", "#FDD835"], // Ámbar y Amarillos
  ["#C62828", "#E53935", "#F44336", "#EF5350", "#E91E63"], // Rojos y Rosas
  ["#6A1B9A", "#8E24AA", "#9C27B0", "#AB47BC", "#BA68C8"], // Púrpuras y Violetas
  ["#E65100", "#EF6C00", "#F57C00", "#FB8C00", "#FF9800"], // Naranjas
  ["#00695C", "#00796B", "#00897B", "#009688", "#26A69A"], // Teals
  ["#1A237E", "#283593", "#303F9F", "#3949AB", "#3F51B5"], // Indigo
  ["#37474F", "#455A64", "#607D8B", "#78909C", "#90A4AE"], // Blue Grays
  ["#4E342E", "#5D4037", "#6D4C41", "#795548", "#8D6E63"], // Browns
  ["#212121", "#424242", "#616161", "#757575", "#9E9E9E"], // Grises
  ["#BF360C", "#D84315", "#E64A19", "#F4511E", "#FF5722"], // Deep Orange
];

/**
 * Actualiza la paleta swatches en caliente manteniendo la misma referencia de array
 * @param {Array<string[]>} newPalette 
 */
export function setSwatches(newPalette) {
  if (Array.isArray(newPalette) && newPalette.length > 0) {
    swatches.splice(0, swatches.length, ...newPalette);
  }
}

/**
 * Extrae los colores únicos usados en el sistema
 */
export const getUsedColors = (unidades = [], clases = []) => {
  const colors = new Set();
  unidades.forEach(u => { if (u.color) colors.add(u.color.toUpperCase()); });
  clases.forEach(c => { if (c.color) colors.add(c.color.toUpperCase()); });
  return Array.from(colors);
};

/**
 * Determina si una unidad es oficial basándose en su propiedad directa o en su clase
 */
export const isUnidadOficial = (unidad, clases = []) => {
  if (!unidad) return false;

  // Prioridad 1: Propiedad directa en la unidad (si el API la provee explícitamente)
  if (unidad.oficial !== undefined && unidad.oficial !== null) {
    return toBoolean(unidad.oficial);
  }

  // Prioridad 2: Basado en el catálogo maestro de la Clase (fallback si unidad.oficial no está definida)
  const val = getCampoClase(unidad);
  if (!val) return false;

  const cInfo = resolveCatalogItem(val, clases);
  if (!cInfo) return false;
  return toBoolean(cInfo.oficial);
};

/**
 * Compara códigos jerárquicos numéricos separados por puntos (ej: "1.2.3")
 * Soporta tanto nodos de VueFlow ({ data: { codigo, nombre } }) como objetos unidad ({ codigo, nombre }).
 */
export const compareCodigos = (a, b) => {
  const codA = a?.data?.codigo ?? a?.codigo ?? "";
  const codB = b?.data?.codigo ?? b?.codigo ?? "";
  const aParts = String(codA)
    .split(".")
    .map((p) => parseInt(p, 10) || 0);
  const bParts = String(codB)
    .split(".")
    .map((p) => parseInt(p, 10) || 0);
  const maxLen = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < maxLen; i++) {
    const aVal = aParts[i] ?? 0;
    const bVal = bParts[i] ?? 0;
    if (aVal !== bVal) return aVal - bVal;
  }
  const nomA = a?.data?.nombre ?? a?.nombre ?? "";
  const nomB = b?.data?.nombre ?? b?.nombre ?? "";
  return String(nomA).localeCompare(String(nomB));
};

/**
 * Transforma una lista plana de unidades en una estructura de árbol jerárquica con nodos anidados en children: [].
 * Cada nodo conserva sus propiedades originales y añade title, display_name, clase normalizada y children.
 *
 * @param {Array} list - Lista plana de unidades
 * @returns {Array} - Nodos raíz con sus hijos anidados
 */
export const buildHierarchyTree = (list = []) => {
  const map = {};
  const roots = [];
  (list || []).forEach((item) => {
    const claseVal = item.clase || item.tipo_unidad || item.tipoUnidad;
    const nameVal = item.denominacion || item.nombre;
    map[item.id] = {
      ...item,
      title: nameVal,
      display_name: nameVal,
      clase: claseVal,
      children: [],
    };
  });
  (list || []).forEach((item) => {
    let pId = null;
    if (item.parent) {
      pId = typeof item.parent === "object" ? item.parent.id : item.parent;
    }

    if (pId && map[pId]) {
      map[pId].children.push(map[item.id]);
    } else {
      roots.push(map[item.id]);
    }
  });
  return roots;
};

/**
 * Indica si una unidad coincide con el texto de búsqueda (nombre, sigla o código).
 */
export const unitMatchesQuery = (unit, query) => {
  if (!query || !String(query).trim()) return true;
  if (!unit) return false;
  const searchNorm = normalizeText(query);
  const nameNorm = normalizeText(
    unit.display_name || unit.nombre || unit.denominacion,
  );
  const siglaNorm = normalizeText(unit.sigla);
  const codigoNorm = normalizeText(unit.codigo);
  return (
    nameNorm.includes(searchNorm) ||
    siglaNorm.includes(searchNorm) ||
    codigoNorm.includes(searchNorm)
  );
};

/**
 * Poda el árbol a matches + ancestros (sin hijas/hermanas que no coincidan).
 * Sin query devuelve el árbol intacto.
 * @param {Array} nodes
 * @param {string} query
 * @returns {Array}
 */
export const filterHierarchyByQuery = (nodes = [], query = "") => {
  if (!query || !String(query).trim()) return nodes || [];

  const walk = (list) => {
    const out = [];
    for (const node of list || []) {
      const filteredChildren = walk(node.children || []);
      const selfMatch = unitMatchesQuery(node, query);
      if (selfMatch || filteredChildren.length > 0) {
        out.push({
          ...node,
          children: filteredChildren,
        });
      }
    }
    return out;
  };

  return walk(nodes);
};

/**
 * Recolecta ids de todos los nodos del árbol (para abrir el treeview).
 */
export const collectTreeIds = (nodes = [], result = []) => {
  for (const node of nodes || []) {
    if (node?.id != null) result.push(node.id);
    if (node.children?.length) collectTreeIds(node.children, result);
  }
  return result;
};

/**
 * Primer nodo (DFS) que coincide con la query.
 */
export const findFirstMatchingUnit = (nodes = [], query = "") => {
  if (!query || !String(query).trim()) return null;
  for (const node of nodes || []) {
    if (unitMatchesQuery(node, query)) return node;
    const child = findFirstMatchingUnit(node.children || [], query);
    if (child) return child;
  }
  return null;
};

