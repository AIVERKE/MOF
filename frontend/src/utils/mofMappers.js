/**
 * Mappers centralizados para el módulo MOF (Manual de Organización y Funciones)
 * 
 * Centraliza la transformación bidireccional entre las estructuras del Backend (NestJS / TypeORM)
 * y el estado reactivo del formulario (useUnidadForm).
 * 
 * DOCUMENTACIÓN DE NOMENCLATURA POR CAMPO:
 * =============================================================================
 * Campo Formulario       Backend Canónico (DTO)  Backend Legacy (BD/Vistas)  Tipo / Regla
 * -----------------------------------------------------------------------------
 * id                     id                      id                          number | null
 * nombre                 nombre                  denominacion                string (trim)
 * codigo                 codigo                  codigo                      string (trim)
 * sigla                  sigla                   sigla                       string (trim)
 * baseLegal              baseLegal               base_legal                  string (trim)
 * resCreacion            resCreacion             res_creacion                string (trim)
 * objetivo               objetivo                objetivo_puesto             string (trim)
 * fecCreacion            fecCreacion             fec_creacion                Date | null (parseDateFromApi / formatDateToString)
 * clase (*)              tipoUnidad              clase, tipo_unidad          number | null (ID en catalogo Clases)
 * tipo                   tipo                    tipo_id                     number | null (ID en catalogo Tipos)
 * nivel                  nivel                   nivel_id                    number | null (ID en catalogo Niveles)
 * relacion               relacion                relacion_id                 number | null (ID en catalogo Relaciones)
 * parentId               parentId                parent                      number | null (ID seguro de nodo padre)
 * color                  color                   color                       string (hex, default "#1976D2")
 * oficial                oficial                 oficial                     boolean (default true)
 * es_troncal             esTroncal               es_troncal                  boolean (default false)
 * lado                   lado                    lado                        string ("CENTRO" si esTroncal, sino "AUTOMATICO")
 * tramitesAtendidos      tramitesAtendidos       tramites_atendidos          string | null (vacio -> null al persistir)
 * ejecucionPoa           ejecucionPoa            ejecucion_poa               string | null (vacio -> null al persistir)
 * ejecucionPresupuestaria ejecucionPresupuestaria ejecucion_presupuestaria   string | null (vacio -> null al persistir)
 * cargaHorariaProgramada cargaHorariaProgramada  carga_horaria_programada    string | null (vacio -> null al persistir)
 * cargaHorariaEjecutada  cargaHorariaEjecutada   carga_horaria_ejecutada     string | null (vacio -> null al persistir)
 * infraestructura        infraestructura         infraestructura_fisica      string | null (vacio -> null al persistir)
 * ubicacion              ubicacion               ubicacion                   string | null (vacio -> null al persistir)
 * dependenciasFuncionales dependenciasFuncionales dependenciasFuncionales    number[]
 * relacionesInternas     relacionesInternas      relacionesInternas          Array<{ relacionadaId, tipo }>
 * relacionesExternas     relacionesExternas      relacionesExternas          string[] (descripciones)
 * cargos                 -                       personal                    string[] (IDs de catalogo)
 * funciones              funciones               funciones                   Array<{ id, tempId, funcion, baseLegal, orden }>
 * 
 * (*) CASO ESPECIAL CLASE -> TIPO_UNIDAD:
 * En la interfaz y formularios del frontend, el campo se denomina 'clase' (e.g. Direccion,
 * Departamento, Seccion). Sin embargo, en el backend NestJS (UnidadDto y entidad Unidad)
 * se denomina 'tipoUnidad' (mapeado a 'tipo_unidad_id' en PostgreSQL).
 * mapBackendToForm() mapea 'tipoUnidad' | 'tipo_unidad' | 'clase' a 'clase'.
 * mapFormToBackend() mapea 'clase' a 'tipoUnidad'.
 */

import {
  getSafeId,
  parseDateFromApi,
  formatDateToString,
  resolveCatalogItem,
} from "@/utils/mofHelpers";

/**
 * Genera el estado inicial reactivo vacío para una unidad nueva
 * 
 * @param {number|string|null} parentId - ID de la unidad padre si se crea como hija
 * @returns {Object} Estado limpio del formulario
 */
export function getEmptyFormData(parentId = null, customDefaults = null) {
  const d = customDefaults || {};
  return {
    id: null,
    nombre: "",
    codigo: "",
    sigla: "",
    baseLegal: "",
    resCreacion: "",
    objetivo: "",
    fecCreacion: null,
    relacion: d.relacion !== undefined ? d.relacion : null,
    cargos: [],
    funciones: [],
    dependenciasFuncionales: [],
    tipo: d.tipo !== undefined ? d.tipo : null,
    nivel: d.nivel !== undefined ? d.nivel : null,
    clase: d.clase !== undefined ? d.clase : null,
    parentId: parentId ? getSafeId(parentId) : null,
    color: d.color || "#1976D2",
    oficial: d.oficial !== undefined ? d.oficial !== false : true,
    es_troncal: d.es_troncal === true,
    lado: d.lado || "AUTOMATICO",
    tramitesAtendidos: "",
    ejecucionPoa: "",
    ejecucionPresupuestaria: "",
    cargaHorariaProgramada: "",
    cargaHorariaEjecutada: "",
    infraestructura: "",
    ubicacion: "",
    relacionesInternas: [],
    relacionesExternas: [],
  };
}

/**
 * Resuelve un ID desde un valor numérico/objeto o por búsqueda de texto en catálogo
 * Prioriza el ID numérico sobre el código para asegurar enlace correcto con v-autocomplete
 * 
 * @param {*} value - Valor de entrada (id, objeto o nombre en texto)
 * @param {Array} catalog - Lista de opciones del catálogo
 * @returns {number|string|null} ID resuelto o el valor original
 */
export function resolveCatalogId(value, catalog = []) {
  if (value == null || value === "") return null;
  const safe = getSafeId(value);
  if (safe != null) return safe;
  const item = resolveCatalogItem(value, catalog);
  return item ? (getSafeId(item.id) ?? item.id ?? item.value) : value;
}

/**
 * Mapea asignaciones de personal del backend a cargos vinculados al catálogo
 * 
 * @param {Array|Object} personalData - Datos de personal devueltos por el backend
 * @param {Array} cargosCatalog - Catálogo de cargos disponibles
 * @returns {Array<{ catalogId: string, assignmentId: string }>}
 */
export function mapPersonalToCargos(personalData = [], cargosCatalog = []) {
  const personalArray = Array.isArray(personalData)
    ? personalData
    : personalData
      ? [personalData]
      : [];

  return personalArray
    .map((p) => {
      const cat = cargosCatalog.find((c) => c.descripcion === p.descripcion);
      return cat
        ? { catalogId: String(cat.id), assignmentId: String(p.id) }
        : null;
    })
    .filter(Boolean);
}

/**
 * Transforma los datos crudos del backend en el objeto de estado del formulario
 * Resolviendo variantes canónicas y legacy de manera determinista.
 * 
 * @param {Object|null} raw - Objeto de datos devuelto por el backend
 * @param {Object} [options={}] - Opciones de catálogos y sub-recursos
 * @param {Object} [options.catalogs] - Catálogos ({ clases, niveles, tipos, relaciones, cargos })
 * @param {Array} [options.personalData] - Personal asignado a la unidad
 * @param {Array} [options.funcionesData] - Funciones de la unidad
 * @param {Array} [options.mappedCargos] - Cargos previamente mapeados
 * @param {Object|number} [options.parentNode] - Nodo padre (si aplica)
 * @returns {Object} Objeto formData listo para useUnidadForm
 */
export function mapBackendToForm(raw, options = {}) {
  if (!raw) {
    const parentId = options.parentNode ? getSafeId(options.parentNode.id || options.parentNode) : null;
    return getEmptyFormData(parentId);
  }

  const catalogs = options.catalogs || {};

  // 1. Resolver Cargos
  let cargosIds = [];
  if (options.mappedCargos && Array.isArray(options.mappedCargos)) {
    cargosIds = options.mappedCargos.map((m) => m.catalogId);
  } else if (options.personalData || raw.personal) {
    const mapped = mapPersonalToCargos(
      options.personalData || raw.personal,
      catalogs.cargos || [],
    );
    cargosIds = mapped.map((m) => m.catalogId);
  } else if (Array.isArray(raw.cargos)) {
    cargosIds = raw.cargos.map(String);
  }

  // 2. Resolver Funciones (preservando IDs y formato requerido por tabla)
  const funcsSource = options.funcionesData || raw.funciones || [];
  const funciones = funcsSource.map((f, index) => ({
    id: f.id ?? null,
    tempId: f.id
      ? String(f.id)
      : (f.tempId || `temp_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 7)}`),
    funcion: f.funcion || "",
    baseLegal: f.baseLegal || f.base_legal || "",
    orden: f.orden ?? (index + 1),
  }));

  // 3. Resolver Catálogos principales (ID seguro o texto -> ID vía catálogo)
  // CASO ESPECIAL: 'tipoUnidad' en backend corresponde a 'clase' en frontend
  const rawClase = raw.tipoUnidad ?? raw.tipo_unidad_id ?? raw.clase ?? raw.tipo_unidad;
  const claseId = resolveCatalogId(rawClase, catalogs.clases);

  const rawNivel = raw.nivel ?? raw.nivel_id;
  const nivelId = resolveCatalogId(rawNivel, catalogs.niveles);

  const rawTipo = raw.tipo ?? raw.tipo_id;
  const tipoId = resolveCatalogId(rawTipo, catalogs.tipos);

  const rawRelacion = raw.relacion ?? raw.relacion_id;
  const relacionId = resolveCatalogId(rawRelacion, catalogs.relaciones);

  // 4. Resolver Dependencias Funcionales
  const dependenciasFuncionales = (raw.dependenciasFuncionales || [])
    .map((d) => getSafeId(d))
    .filter((id) => id !== null);

  // 5. Resolver Relaciones Internas
  const relacionesInternas = (raw.relacionesInternas || []).map((r) => ({
    id: r.id,
    relacionadaId: r.relacionadaId || r.unidadDestinoId || r.id,
    codigo: r.codigo,
    nombre: r.nombre || r.unidadDestinoNombre,
    sigla: r.sigla,
    tipo: r.tipo || null,
    descripcion: r.descripcion || null,
  }));

  // 6. Resolver Relaciones Externas
  const relacionesExternas = (raw.relacionesExternas || []).map((r) => ({
    id: r.id,
    entidadExterna: r.entidadExterna || "",
    descripcion: r.descripcion || (typeof r === "string" ? r : ""),
  }));

  return {
    id: raw.id ?? null,
    nombre: raw.nombre || raw.denominacion || "",
    codigo: raw.codigo || "",
    sigla: raw.sigla || "",
    baseLegal: raw.baseLegal || raw.base_legal || "",
    resCreacion: raw.resCreacion || raw.res_creacion || "",
    objetivo: raw.objetivo || raw.objetivo_puesto || "",
    funciones,
    fecCreacion: parseDateFromApi(raw.fecCreacion || raw.fec_creacion),
    dependenciasFuncionales,
    clase: claseId,
    nivel: nivelId,
    tipo: tipoId,
    relacion: relacionId,
    parentId: getSafeId(raw.parentId ?? raw.parent),
    cargos: cargosIds,
    color: raw.color || "#1976D2",
    oficial: raw.oficial !== false,
    es_troncal: raw.es_troncal === true || raw.esTroncal === true,
    lado: raw.lado || "AUTOMATICO",
    tramitesAtendidos: raw.tramitesAtendidos || raw.tramites_atendidos || "",
    ejecucionPoa: raw.ejecucionPoa || raw.ejecucion_poa || "",
    ejecucionPresupuestaria: raw.ejecucionPresupuestaria || raw.ejecucion_presupuestaria || "",
    cargaHorariaProgramada: raw.cargaHorariaProgramada || raw.carga_horaria_programada || "",
    cargaHorariaEjecutada: raw.cargaHorariaEjecutada || raw.carga_horaria_ejecutada || "",
    infraestructura: raw.infraestructura || raw.infraestructura_fisica || "",
    ubicacion: raw.ubicacion || "",
    relacionesInternas,
    relacionesExternas,
  };
}

/**
 * Transforma el estado reactivo del formulario en el payload estricto
 * esperado por el Backend NestJS (UnidadDto) para POST / PUT.
 * 
 * Reglas de negocio aplicadas:
 * - clase -> tipoUnidad (canónico backend)
 * - Strings son recortados con trim()
 * - Campos S-MAU vacíos se persisten como null
 * - Si esTroncal es true, lado se fija forzosamente a "CENTRO"
 * - fecCreacion se serializa a formato string YYYY-MM-DD
 * 
 * @param {Object} formData - Estado del formulario
 * @returns {Object} Payload listo para enviar por HTTP
 */
export function mapFormToBackend(formData) {
  if (!formData) return {};

  const isTroncal = formData.es_troncal === true || formData.esTroncal === true;
  const pIdVal = formData.parentId ? getSafeId(formData.parentId) : null;

  return {
    codigo: formData.codigo?.trim() || "",
    sigla: formData.sigla?.trim() || "",
    nombre: formData.nombre?.trim() || "",
    baseLegal: (formData.baseLegal ?? formData.base_legal)?.trim() || "",
    parentId: pIdVal || null,
    tipo: getSafeId(formData.tipo) || 1,
    nivel: getSafeId(formData.nivel) || 1,
    relacion: getSafeId(formData.relacion) || 1,
    resCreacion: (formData.resCreacion ?? formData.res_creacion)?.trim() || "",
    fecCreacion: formatDateToString(formData.fecCreacion) || null,
    objetivo: (formData.objetivo ?? formData.objetivo_puesto)?.trim() || "",
    color: formData.color || "#1976D2",
    // MAPEO CANÓNICO: 'clase' del formulario se envía como 'tipoUnidad' al backend NestJS
    tipoUnidad: getSafeId(formData.clase ?? formData.tipoUnidad) || 1,
    oficial: formData.oficial !== false,
    esTroncal: isTroncal,
    lado: isTroncal ? "CENTRO" : (formData.lado || "AUTOMATICO"),
    dependenciasFuncionales: (formData.dependenciasFuncionales || [])
      .map((d) => getSafeId(d))
      .filter((id) => id !== null),
    tramitesAtendidos: (formData.tramitesAtendidos ?? formData.tramites_atendidos)?.trim() || null,
    ejecucionPoa: (formData.ejecucionPoa ?? formData.ejecucion_poa)?.trim() || null,
    ejecucionPresupuestaria: (formData.ejecucionPresupuestaria ?? formData.ejecucion_presupuestaria)?.trim() || null,
    cargaHorariaProgramada: (formData.cargaHorariaProgramada ?? formData.carga_horaria_programada)?.trim() || null,
    cargaHorariaEjecutada: (formData.cargaHorariaEjecutada ?? formData.carga_horaria_ejecutada)?.trim() || null,
    infraestructura: (formData.infraestructura ?? formData.infraestructura_fisica)?.trim() || null,
    ubicacion: formData.ubicacion?.trim() || null,
    relacionesInternas: (formData.relacionesInternas || []).map((r) => ({
      relacionadaId: Number(r.relacionadaId || r.id || r),
      tipo: r.tipo || null,
    })),
    relacionesExternas: (formData.relacionesExternas || [])
      .map((r) => (typeof r === "object" ? r.descripcion?.trim() : String(r).trim()))
      .filter(Boolean),
  };
}
