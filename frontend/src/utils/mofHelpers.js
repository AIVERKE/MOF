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
  if (!val) return "---";
  if (typeof val === "object" && val.descripcion) return val.descripcion;
  const item = niveles.find(
    (n) => String(n.id) === String(val) || String(n.value) === String(val),
  );
  return item ? item.description || item.descripcion : val;
};

export const getTipoNombre = (val, tipos = []) => {
  if (!val) return "---";
  if (typeof val === "object" && val.descripcion) return val.descripcion;
  const item = tipos.find(
    (t) => String(t.id) === String(val) || String(t.value) === String(val),
  );
  return item ? item.description || item.descripcion : val;
};

export const getRelacionNombre = (val, relaciones = []) => {
  if (!val) return "---";
  if (typeof val === "object" && val.descripcion) return val.descripcion;
  const item = relaciones.find(
    (r) => String(r.id) === String(val) || String(r.value) === String(val),
  );
  return item ? item.description || item.descripcion : val;
};

export const getClaseNombre = (val, clases = []) => {
  if (!val) return "---";
  if (typeof val === "object" && val.descripcion) return val.descripcion;
  const item = clases.find(
    (c) =>
      String(c.id) === String(val) ||
      String(c.descripcion).trim().toUpperCase() ===
        String(val).trim().toUpperCase(),
  );
  return item ? item.descripcion : val;
};

export const getClaseColor = (val, clases = []) => {
  if (!val) return "#757575";
  const item = clases.find(
    (c) =>
      String(c.id) === String(val) ||
      String(c.descripcion).trim().toUpperCase() ===
        String(val).trim().toUpperCase() ||
      (typeof val === "object" && String(c.id) === String(val.id)),
  );
  return item ? item.color : "#757575";
};

export const highlightText = (text, query) => {
  if (!query || !text) return text;
  const re = new RegExp(`(${query})`, "gi");
  return String(text).replace(
    re,
    '<mark style="background-color: #FFEB3B; color: #000000 !important; font-weight: bold; border-radius: 2px; padding: 0 2px;">$1</mark>',
  );
};

/**
 * Calcula el peso jerárquico real de una unidad.
 */
export const getPesoReal = (unidad, clases = []) => {
  if (!unidad) return 99;
  if (unidad.peso !== null && unidad.peso !== undefined) return unidad.peso;
  if (unidad.orden !== null && unidad.orden !== undefined) return unidad.orden;

  let tId = unidad.clase || unidad.tipoUnidad || unidad.tipo_unidad;
  if (tId && typeof tId === "object") {
    tId = tId.id ?? tId.value ?? tId.descripcion;
  }

  if (tId && clases && clases.length > 0) {
    const clase = clases.find(
      (c) =>
        Number(c.id) === Number(tId) ||
        String(c.id).trim() === String(tId).trim() ||
        String(c.descripcion).trim().toUpperCase() === String(tId).trim().toUpperCase()
    );
    if (clase) {
      if (clase.orden !== null && clase.orden !== undefined) return clase.orden;
      if (clase.peso !== null && clase.peso !== undefined) return clase.peso;
      const index = clases.indexOf(clase);
      if (index !== -1) return index + 1;
    }
  }
  return 10;
};

/**
 * Detecta si un nodo es de tipo STAFF (asesoría)
 */
export const isStaffNode = (unidad, relaciones = []) => {
  if (!unidad) return false;
  const relacionId = unidad.relacion;
  if (relacionId && relaciones.length > 0) {
    const relacionItem = relaciones.find((r) => String(r.id) === String(relacionId));
    if (relacionItem) {
      const desc = String(relacionItem.descripcion || "").toUpperCase();
      return desc.includes("STAFF") || desc.includes("ASESOR");
    }
  }
  const relDesc = String(unidad.str_relacion || "").toUpperCase();
  return relDesc.includes("STAFF") || relDesc.includes("ASESOR");
};

/**
 * Paleta de colores institucionales
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

  // Prioridad 1: Propiedad directa en la unidad (si el API la provee)
  if (
    unidad.oficial === true ||
    unidad.oficial === 1 ||
    String(unidad.oficial).toLowerCase() === "true"
  ) {
    return true;
  }

  // Prioridad 2: Basado en el catálogo maestro de la Clase
  const val =
    unidad.clase && typeof unidad.clase === "object"
      ? unidad.clase.id
      : unidad.clase;
  if (!val) return false;

  const cInfo = clases.find(
    (c) =>
      String(c.id) === String(val) ||
      String(c.descripcion).trim().toLowerCase() ===
        String(val).trim().toLowerCase(),
  );

  if (!cInfo) return false;
  return (
    cInfo.oficial === true ||
    cInfo.oficial === 1 ||
    String(cInfo.oficial).toLowerCase() === "true"
  );
};
