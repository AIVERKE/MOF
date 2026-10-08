<script setup>
import { ref, onMounted, watch, computed, nextTick } from "vue";
import {
  VueFlow,
  useVueFlow,
  Handle,
  BaseEdge,
  getSmoothStepPath,
} from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import dagre from "dagre";
import jsPDF from "jspdf";
import { sanitizePdfText } from "@/utils/mofReport";
import { useTheme } from "vuetify";

// --- STORES & API ---
import { ENDPOINTS } from "@/config/api";
import { useAllUnidadesMofStore } from "../../stores/unidades_mof";
import { useAllTiposMofStore } from "@/stores/tipos_mof";
import { useAllNivelesMofStore } from "@/stores/niveles_mof";
import { useAllRelacionesMofStore } from "@/stores/relaciones_mof";
import { useAllCargosMofStore } from "@/stores/cargos_mof";
import { useAllClasesMofStore } from "@/stores/clases_mof";
import { useAccessibilityStore } from "@/stores/accessibility";

// --- PLUGINS & UTILS ---
import {
  formatDateForDisplay,
  getPesoReal,
  getSafeId,
  isStaffNode,
  normalizeText,
  compareCodigos,
  getContrastingTextColor,
  getClaseColor,
  getIntenseNodeColor,
  INTENSE_NODE_PALETTE,
  toBoolean,
} from "@/utils/mofHelpers";
import { getLayoutedElements } from "@/utils/organigramaLayout";

import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";

// --- COMPONENTS ---
import SelectAllTipos from "./tipos/SelectAllTipos.vue";
import SelectAllNiveles from "./niveles/SelectAllNiveles.vue";
import SelectAllRelaciones from "./relaciones/SelectAllRelaciones.vue";
import SelectAllClases from "./clases/SelectAllClases.vue";
import HierarchyManagerDrawer from "./clases/HierarchyManagerDrawer.vue";
import UnidadFormDialog from "./unidades/UnidadFormDialog.vue";
import UnidadDetailsDrawer from "./unidades/UnidadDetailsDrawer.vue";
import UnidadDeleteDialog from "./unidades/UnidadDeleteDialog.vue";
import UnidadDependencyDialog from "./unidades/UnidadDependencyDialog.vue";
import UnidadActionsMenu from "./unidades/UnidadActionsMenu.vue";
import HighlightedText from "@/components/HighlightedText.vue";
import MofLoadingOverlay from "./common/MofLoadingOverlay.vue";

// --- COMPOSABLES ---
import { useUnidadForm } from "@/composables/useUnidadForm";
import { useSnackbar } from "@/composables/useSnackbar";
import { useUnidadDetails } from "@/composables/useUnidadDetails";
import { useMofResolvers } from "@/composables/useMofResolvers";
import { useUnidadActions } from "@/composables/useUnidadActions";
import { usePrefetchCatalogs } from "@/composables/usePrefetchCatalogs";
import { useResponsive } from "@/composables/useResponsive";
import { useRouter } from "vue-router";

// --- VUE FLOW COMPOSABLES ---
const {
  nodes,
  edges,
  setNodes,
  setEdges,
  fitView,
  zoomIn,
  zoomOut,
  onNodeClick,
} = useVueFlow();

const router = useRouter();
const { isMobile, isPortrait } = useResponsive();
// Bloqueo de montaje de Vue Flow en celulares en modo vertical (portrait) para evitar error de dimensiones
const isMobilePortrait = computed(() => isMobile.value && isPortrait.value);

function handleZoomIn() {
  zoomIn({ duration: 250 });
}

function handleZoomOut() {
  zoomOut({ duration: 250 });
}

function handleResetZoom() {
  fitView({ padding: 0.2, duration: 350 });
}

function getCustomEdgePath(edgeProps) {
  const busY = edgeProps.data?.busY;
  const isStaff = edgeProps.data?.isStaff;
  const [path] = getSmoothStepPath({
    sourceX: edgeProps.sourceX,
    sourceY: edgeProps.sourceY,
    sourcePosition: edgeProps.sourcePosition ?? "bottom",
    targetX: edgeProps.targetX,
    targetY: edgeProps.targetY,
    targetPosition: edgeProps.targetPosition ?? "top",
    borderRadius: 0,
    centerY:
      !isStaff && busY !== undefined
        ? busY
        : (edgeProps.sourceY + edgeProps.targetY) / 2,
  });
  return path;
}

function handleVolver() {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
  } else {
    router.push("/mof/listar-unidades");
  }
}

const { mostrar } = useSnackbar();

const theme = useTheme();
const isDark = computed(() => theme?.global?.current?.value?.dark ?? false);

// --- PALETA DE COLORES INTENSOS SATURADOS (ALTO CONTRASTE PARA PROYECCIÓN) ---
const FILTER_COLORS = {
  selectedDep: INTENSE_NODE_PALETTE[2], // #047857 Verde esmeralda intenso (Unidad Seleccionada)
  depFuncional: INTENSE_NODE_PALETTE[1], // #B91C1C Rojo 700 intenso (Dependencia Funcional)
  multipleMatch: INTENSE_NODE_PALETTE[2], // #047857 Verde esmeralda intenso (Coincidencia múltiple)
  searchMatch: INTENSE_NODE_PALETTE[3], // #B45309 Ámbar 700 intenso (Coincidencia por búsqueda)
  nivelFilter: INTENSE_NODE_PALETTE[4], // #6D28D9 Violeta 700 intenso (Filtro por Nivel)
  tipoFilter: INTENSE_NODE_PALETTE[6], // #0369A1 Cielo 700 intenso (Filtro por Tipo)
  claseFilter: INTENSE_NODE_PALETTE[7], // #C2410C Naranja 700 intenso (Filtro por Instancia/Clase)
  relacionFilter: INTENSE_NODE_PALETTE[5], // #BE185D Rosa 700 intenso (Filtro por Relación)
  noMatch: "#CBD5E1", // Gris delimitado (Sin coincidencias)
  noOficialAnalitico: "#94A3B8", // Gris medio delimitado (No oficial en vista analítica)
  staffDefault: INTENSE_NODE_PALETTE[7], // #C2410C Naranja institucional para staff
  claseDefault: INTENSE_NODE_PALETTE[0], // #1D4ED8 Azul 700 intenso
};

// --- PALETA COLORBLIND-SAFE OKABE-ITO (WONG, 2011) ---
const FILTER_COLORS_COLORBLIND = {
  selectedDep: "#0072B2", // Azul Okabe-Ito (Unidad Seleccionada / Origen)
  depFuncional: "#D55E00", // Bermellón Okabe-Ito (Dependencia Funcional)
  multipleMatch: "#009E73", // Verde azulado Okabe-Ito (Coincidencia múltiple)
  searchMatch: "#E69F00", // Naranja cálido Okabe-Ito (Coincidencia por búsqueda)
  nivelFilter: "#0072B2", // Azul Okabe-Ito (Filtro por Nivel)
  tipoFilter: "#56B4E9", // Azul cielo Okabe-Ito (Filtro por Tipo)
  claseFilter: "#D55E00", // Bermellón Okabe-Ito (Filtro por Instancia)
  relacionFilter: "#CC79A7", // Púrpura rojizo Okabe-Ito (Filtro por Relación)
  noMatch: "#CBD5E1", // Gris delimitado (Sin coincidencias)
  noOficialAnalitico: "#94A3B8", // Gris medio delimitado
  staffDefault: "#D55E00", // Bermellón institucional para staff
  claseDefault: "#0072B2", // Azul accesible para clase
};

const accessibilityStore = useAccessibilityStore();
const isColorblind = computed(() => accessibilityStore.colorblindMode);

// --- STORES INSTANCES ---
const unidadesStore = useAllUnidadesMofStore();
const tiposStore = useAllTiposMofStore();
const nivelesStore = useAllNivelesMofStore();
const relacionesStore = useAllRelacionesMofStore();
const cargosStore = useAllCargosMofStore();
const clasesStore = useAllClasesMofStore();

const { prefetchCatalogs } = usePrefetchCatalogs({
  clasesStore,
  nivelesStore,
  tiposStore,
  relacionesStore,
  cargosStore,
});

// --- FORM COMPOSABLE ---
const unitForm = useUnidadForm({
  unidadesStore,
  cargosStore,
  clasesStore,
  nivelesStore,
  tiposStore,
  relacionesStore,
});

const {
  formData,
  isEditMode,
  formValid,
  openForm: openUnitForm,
  saveUnidad,
  addFuncion,
  updateFuncion,
  removeFuncion,
  moverFuncionArriba,
  moverFuncionAbajo,
} = unitForm;

// --- UI STATE ---
const addDialog = ref(false);
const deleteDialog = ref(false);
const selectedNode = ref(null);
const vistaModo = ref("analitico");

const isGraphLoading = ref(true);
const graphLoadingMessage = ref("Cargando organigrama...");
const graphLoadingSubmessage = ref("Obteniendo unidades y catálogos...");
const isExportingPdf = ref(false);

const dialog_nodo_chance = ref(false);
const unidadACambiar = ref(null);
const unidadDestino = ref(null);
const unidadRazon = ref("");

const mostrarDependencias = ref(false);
const unidadDependenciaSeleccionada = ref(null);
const {
  detailsDrawer,
  detailData,
  loadingDetail,
  initialOpenPanels,
  showDetails: baseShowDetails,
  verReporte,
} = useUnidadDetails({ unidadesStore });

function showDetails(unidadId) {
  if (!unidadId) return;
  centrarNodo(unidadId, { duration: 450 });
  return baseShowDetails(unidadId);
}
const hierarchyDrawer = ref(false);
const hierarchyDrawerWidth = ref(450);

const searchTerm = ref("");

// --- FILTROS ---
const filterNivel = ref(null);
const filterTipo = ref(null);
const filterInstancia = ref(null);
const filterRelacion = ref(null);
const activePanels = ref(0); // Abre por defecto el panel de filtros

// --- HELPER WRAPPERS ---
const {
  resolveNivel,
  resolveTipo,
  resolveRelacion,
  resolveClase,
  resolveClaseColor,
  checkOficial,
} = useMofResolvers(clasesStore, nivelesStore, tiposStore, relacionesStore);

/** Always an array — never crash on .find/.filter if store list is undefined */
const unidadesList = computed(() => unidadesStore.unidades ?? []);

/** Mapa indexado por ID para acceso O(1) a unidades */
const unidadesByIdMap = computed(() => {
  const map = new Map();
  for (const u of unidadesList.value) {
    map.set(String(u.id), u);
  }
  return map;
});

const findNearestOficialParentId = (unidad) => {
  let currentParentId =
    unidad.parent && typeof unidad.parent === "object"
      ? unidad.parent.id
      : unidad.parent;

  while (currentParentId) {
    const parentUnit = unidadesByIdMap.value.get(String(currentParentId));
    if (!parentUnit) break;

    if (checkOficial(parentUnit)) {
      return String(parentUnit.id);
    }

    // Si el padre no es oficial, seguimos subiendo en la jerarquía
    currentParentId =
      parentUnit.parent && typeof parentUnit.parent === "object"
        ? parentUnit.parent.id
        : parentUnit.parent;
  }

  return null; // No se encontró ancestro oficial, queda como raíz
};

// --- COMPUTEDS ---
const unidadesFiltradas = computed(() => {
  const getFilterId = (val) =>
    val && typeof val === "object"
      ? String(val.id || "").trim()
      : String(val || "").trim();
  const activeNivelId = getFilterId(filterNivel.value);
  const activeTipoId = getFilterId(filterTipo.value);
  const activeClaseId = getFilterId(filterInstancia.value);
  const activeRelacionId = getFilterId(filterRelacion.value);
  const searchNorm = normalizeText(searchTerm.value);

  // Pre-resolver descripciones fuera del bucle para máximo rendimiento (O(1) por iteración)
  let expectedNivelDesc = "";
  if (activeNivelId) {
    const item = nivelesStore.niveles.find(
      (n) => String(n.id) === activeNivelId,
    );
    expectedNivelDesc = item ? normalizeText(item.descripcion) : "";
  }

  let expectedTipoDesc = "";
  if (activeTipoId) {
    const item = tiposStore.tipos.find((t) => String(t.id) === activeTipoId);
    expectedTipoDesc = item ? normalizeText(item.descripcion) : "";
  }

  let expectedClaseDesc = "";
  if (activeClaseId) {
    const item = clasesStore.clases.find((c) => String(c.id) === activeClaseId);
    expectedClaseDesc = item ? normalizeText(item.descripcion) : "";
  }

  let expectedRelacionCode = "";
  let expectedRelacionDesc = "";
  let isFilterForStaff = false;
  if (activeRelacionId) {
    const item = relacionesStore.relaciones.find(
      (r) => String(r.id) === activeRelacionId || String(r.value) === activeRelacionId,
    );
    if (item) {
      expectedRelacionCode = normalizeText(item.codigo || item.value || "");
      expectedRelacionDesc = normalizeText(
        item.descripcion || item.description || item.nombre || "",
      );
      isFilterForStaff =
        expectedRelacionCode === "s" ||
        expectedRelacionDesc.includes("staff") ||
        expectedRelacionDesc.includes("asesor");
    }
  }

  const isEstricto = vistaModo.value === "estricto";

  return unidadesList.value.filter((u) => {
    // Si estamos en modo organigrama oficial estricto, filtramos
    if (isEstricto && !checkOficial(u)) return false;

    if (searchNorm) {
      const uNombreNorm = normalizeText(u.nombre || u.denominacion);
      const uSiglaNorm = normalizeText(u.sigla);
      const uCodigoNorm = normalizeText(u.codigo);
      if (
        !uNombreNorm.includes(searchNorm) &&
        !uSiglaNorm.includes(searchNorm) &&
        !uCodigoNorm.includes(searchNorm)
      ) {
        return false;
      }
    }

    if (activeNivelId) {
      if (expectedNivelDesc !== normalizeText(u.nivel)) {
        return false;
      }
    }

    if (activeTipoId) {
      if (expectedTipoDesc !== normalizeText(u.tipo)) {
        return false;
      }
    }

    if (activeClaseId) {
      if (expectedClaseDesc !== normalizeText(u.clase)) {
        return false;
      }
    }

    if (activeRelacionId) {
      const uRelNorm = normalizeText(u.relacion);
      const uStrRelNorm = normalizeText(u.str_relacion);
      const uRelIdStr = String(u.relacion_id ?? u.relacionId ?? "");

      const matchesId =
        (uRelIdStr && uRelIdStr === activeRelacionId) ||
        (uRelNorm && uRelNorm === activeRelacionId);
      const matchesCode =
        expectedRelacionCode &&
        (uRelNorm === expectedRelacionCode || uStrRelNorm === expectedRelacionCode);
      const matchesDesc =
        expectedRelacionDesc &&
        (uStrRelNorm === expectedRelacionDesc || uRelNorm === expectedRelacionDesc);
      const matchesStaff =
        isFilterForStaff && isStaffNode(u, relacionesStore.relaciones);

      if (!matchesId && !matchesCode && !matchesDesc && !matchesStaff) {
        return false;
      }
    }

    return true;
  });
});

/** Set de IDs filtrados para lookup O(1) compartido entre tabla y grafo (evita doble filtrado) */
const filteredUnitIdsSet = computed(
  () => new Set(unidadesFiltradas.value.map((u) => String(u.id))),
);

const hasAnyFilter = computed(
  () =>
    !!(
      filterNivel.value ||
      filterTipo.value ||
      filterInstancia.value ||
      filterRelacion.value ||
      searchTerm.value
    ),
);

const stats = computed(() => {
  const backendResumen = unidadesStore.dashboardStats?.resumen;
  const all = unidadesList.value;

  // Si no hay filtros aplicados y tenemos el resumen precalculado del backend, usarlo de inmediato
  if (backendResumen && !hasAnyFilter.value) {
    return [
      {
        title: "Total Unidades",
        value: backendResumen.total,
        icon: "mdi-sitemap",
        color: "primary",
      },
      {
        title: "Oficiales",
        value: backendResumen.oficiales,
        icon: "mdi-check-decagram",
        color: "success",
      },
      {
        title: "No Oficiales",
        value: backendResumen.noOficiales,
        icon: "mdi-alert-circle-outline",
        color: "warning",
      },
      {
        title: "Asesoría/Staff",
        value: backendResumen.staff,
        icon: "mdi-account-tie",
        color: "orange-darken-2",
      },
    ];
  }

  const baseList = hasAnyFilter.value ? unidadesFiltradas.value : all;
  const oficiales = baseList.filter((u) => checkOficial(u));
  return [
    {
      title: "Total Unidades",
      value: baseList.length,
      icon: "mdi-sitemap",
      color: "primary",
    },
    {
      title: "Oficiales",
      value: oficiales.length,
      icon: "mdi-check-decagram",
      color: "success",
    },
    {
      title: "No Oficiales",
      value: baseList.length - oficiales.length,
      icon: "mdi-alert-circle-outline",
      color: "warning",
    },
    {
      title: "Asesoría/Staff",
      value: baseList.filter((u) => isStaffNode(u, relacionesStore.relaciones))
        .length,
      icon: "mdi-account-tie",
      color: "orange-darken-2",
    },
  ];
});

// --- ESTRUCTURA VISUAL & LAYOUT (importado desde @/utils/organigramaLayout) ---

// --- METHODS ---
async function refreshChart(options = {}) {
  isGraphLoading.value = true;
  graphLoadingMessage.value = "Actualizando organigrama...";
  graphLoadingSubmessage.value = "Sincronizando cambios de la estructura...";
  try {
    await unidadesStore.getFetchUnidades(options);
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 30));
    updateGraph();
  } catch (e) {
    mostrar("Error al actualizar organigrama", "error");
  } finally {
    isGraphLoading.value = false;
  }
}

async function openForm(nodeId = null, edit = false) {
  if (nodeId) {
    centrarNodo(nodeId, { duration: 400 });
  }
  const node = nodeId ? unidadesByIdMap.value.get(String(nodeId)) : null;
  selectedNode.value = node;
  await openUnitForm(node, edit);
  addDialog.value = true;
}

function openDeleteDialog(nodeId) {
  if (nodeId) {
    centrarNodo(nodeId, { duration: 400 });
  }
  selectedNode.value = nodeId
    ? unidadesByIdMap.value.get(String(nodeId))
    : null;
  deleteDialog.value = true;
}

const { confirmAddItem, confirmDelete } = useUnidadActions({
  unidadesStore,
  saveUnidad,
  onRefresh: refreshChart,
  addDialog,
  deleteDialog,
  selectedNode,
});

async function cambiarDependencia() {
  const razonVal = typeof unidadRazon.value === "string" ? unidadRazon.value.trim() : "";
  if (!unidadACambiar.value || !unidadDestino.value || razonVal.length < 6) {
    mostrar("La razón del cambio es obligatoria y debe tener al menos 6 caracteres", "warning");
    return;
  }
  await unidadesStore.updateNodo(unidadACambiar.value, {
    parentId: parseInt(unidadDestino.value) || null,
    razon: razonVal,
  });
  if (!unidadesStore.error) {
    dialog_nodo_chance.value = false;
    mostrar("¡Cambiado!", "success");
    refreshChart({ force: true });
  } else {
    mostrar("Error: " + unidadesStore.error, "error");
  }
}

function hexToRgb(hex) {
  if (!hex) return { r: 2, g: 132, b: 199 };
  let str = String(hex).replace("#", "").trim();
  if (str.length === 3) {
    str = str
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const val = parseInt(str, 16);
  if (isNaN(val)) return { r: 2, g: 132, b: 199 };
  return {
    r: (val >> 16) & 255,
    g: (val >> 8) & 255,
    b: val & 255,
  };
}

function fixSpanishMojibake(str) {
  if (!str) return "";
  return String(str)
    .replace(/Ã[\u201C\u0093]/g, "Ó")
    .replace(/Ã[\u201D\u0094]/g, "ö")
    .replace(/Ã[\u2018\u0091\u00B1]/g, "Ñ")
    .replace(/Ã[\u2019\u0092]/g, "’")
    .replace(/Ã[\u0081\u00A1]/g, "Á")
    .replace(/Ã[\u2030\u0089]/g, "É")
    .replace(/Ã[\u00A9]/g, "é")
    .replace(/Ã[\u008D\u00AD\u2021\u2022\u0095\u2026\u008A]/g, "Í")
    .replace(/Ã[\u009A\u00BA\u0161]/g, "Ú")
    .replace(/Ã[\u0153\u009C]/g, "Ü")
    .replace(/Ã³/g, "ó")
    .replace(/Ã¡/g, "á")
    .replace(/Ã©/g, "é")
    .replace(/Ã­/g, "í")
    .replace(/Ãº/g, "ú")
    .replace(/Ã±/g, "ñ")
    .replace(/ÃN/g, "ÓN")
    .replace(/Ã\s*A/g, "ÍA")
    .replace(/Ã\s*M/gi, "ÍM")
    .replace(/Â/g, "");
}

function cleanPdfText(val) {
  if (val === null || val === undefined) return "";
  let str = fixSpanishMojibake(val);
  return sanitizePdfText(str);
}

async function exportarOrganigrama() {
  isExportingPdf.value = true;
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 50));
  mostrar("Generando PDF institucional en alta resolución...", "info");

  try {
    let validNodes = (nodes.value || []).filter(
      (n) => n.data && !n.data.isInvisible,
    );

    // En vista oficial (Estricto), garantizar estrictamente que solo se exporten unidades oficiales
    if (vistaModo.value === "estricto") {
      validNodes = validNodes.filter((n) => n.data?.isOficial !== false);
    }

    if (validNodes.length === 0) {
      mostrar("No hay unidades para exportar", "warning");
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    validNodes.forEach((n) => {
      const x = Number(n.position?.x) || 0;
      const y = Number(n.position?.y) || 0;
      const w = 320;
      const h = 240;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    });

    if (!isFinite(minX)) {
      minX = 0;
      minY = 0;
      maxX = 2000;
      maxY = 1200;
    }

    const rawGraphW = Math.max(100, maxX - minX);
    const rawGraphH = Math.max(100, maxY - minY);

    // Dimensiones y escalado vectorial institucional
    // Máximo formato póster seguro en jsPDF: 5000 mm (~5 metros de ancho, estándar ISO PDF)
    const maxPosterWidthMm = 5000;
    const marginMm = 30;
    const headerHeight = 52;
    const footerHeight = 20;

    const availableMaxW = maxPosterWidthMm - marginMm * 2;
    // Escala ideal para vista cómoda: ~50mm por tarjeta (~0.156 mm/px)
    // Para organigramas masivos con cientos de ramas, escala adaptativa que encaje exactamente en el formato póster
    const idealScale = 50 / 320;
    const scale = Math.min(idealScale, availableMaxW / rawGraphW);

    const diagramWidthMm = Math.round(rawGraphW * scale);
    const diagramHeightMm = Math.round(rawGraphH * scale);

    const nodeWidthMm = 320 * scale;
    const nodeHeightMm = 240 * scale;

    // Dimensiones de la página:
    // Mínimo formato A3 (420 x 297 mm), expandiéndose según el volumen de unidades
    const pageWidth = Math.max(420, diagramWidthMm + marginMm * 2);
    const pageHeight = Math.max(
      297,
      diagramHeightMm + headerHeight + footerHeight + marginMm * 2,
    );

    const pdf = new jsPDF({
      orientation: pageWidth >= pageHeight ? "landscape" : "portrait",
      unit: "mm",
      format: [pageWidth, pageHeight],
    });

    // 1. Franja superior de encabezado institucional adaptativo a la vista activa
    pdf.setFillColor(248, 249, 250);
    pdf.rect(0, 0, pageWidth, headerHeight, "F");
    pdf.setDrawColor(200, 205, 215);
    pdf.setLineWidth(0.8);
    pdf.line(0, headerHeight, pageWidth, headerHeight);

    const modo = vistaModo.value; // 'integral' | 'analitico' | 'estricto'
    const modeConfig = {
      integral: {
        label: "MODO: INTEGRAL",
        badgeBg: [29, 78, 216], // #1D4ED8 Azul 700
        subtitle: "Estructura Organizativa Integral (Totalidad de Unidades)",
        footerText:
          "Sistema SMAU-MOF - Vista Integral - Estructura Organizativa Completa",
        fileSuffix: "integral",
      },
      analitico: {
        label: "MODO: ANAL\xCDTICA",
        badgeBg: [109, 40, 217], // #6D28D9 Violeta 700
        subtitle:
          "Estructura Organizativa Anal\xEDtica (Diferenciaci\xF3n de Oficialidad)",
        footerText:
          "Sistema SMAU-MOF - Vista Anal\xEDtica - Unidades Oficiales y No Oficiales Identificadas",
        fileSuffix: "analitico",
      },
      estricto: {
        label: "MODO: OFICIAL",
        badgeBg: [4, 120, 87], // #047857 Esmeralda 700
        subtitle:
          "Estructura Organizativa Oficial (Aprobada por Resoluci\xF3n)",
        footerText:
          "Sistema SMAU-MOF - Documento de Car\xE1cter Oficial - Estructura Organizativa Aprobada",
        fileSuffix: "oficial",
      },
    };
    const currentConfig = modeConfig[modo] || modeConfig.analitico;

    // Título institucional
    pdf.setTextColor(15, 23, 42); // Slate 900
    pdf.setFontSize(22);
    pdf.setFont("helvetica", "bold");
    const mainTitleStr = "MANUAL DE ORGANIZACIONES Y FUNCIONES";
    pdf.text(mainTitleStr, marginMm, 17);

    // Pastilla del Modo de Visualización Activo al lado del título
    const mainTitleW = pdf.getTextWidth(mainTitleStr);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    const modeBadgeW = pdf.getTextWidth(currentConfig.label) + 8;
    const modeBadgeH = 6.2;
    const modeBadgeX = marginMm + mainTitleW + 10;
    pdf.setFillColor(
      currentConfig.badgeBg[0],
      currentConfig.badgeBg[1],
      currentConfig.badgeBg[2],
    );
    pdf.roundedRect(modeBadgeX, 11.5, modeBadgeW, modeBadgeH, 1.6, 1.6, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.text(
      currentConfig.label,
      modeBadgeX + modeBadgeW / 2,
      11.5 + modeBadgeH * 0.72,
      { align: "center" },
    );

    // Subtítulos institucionales
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(71, 85, 105); // Slate 600
    pdf.text("Universidad Mayor de San Andrés", marginMm, 26);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 41, 59); // Slate 800
    pdf.text(currentConfig.subtitle, marginMm, 34);

    // Fecha de emisión institucional
    const fechaStr = `Fecha de emisi\xF3n: ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}`;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 116, 139);
    pdf.text(fechaStr, pageWidth - marginMm, 26, { align: "right" });

    // Resumen estadístico adaptativo
    const totalCount = validNodes.length;
    const oficialesCount = validNodes.filter(
      (n) => n.data?.isOficial !== false,
    ).length;
    const noOficialesCount = validNodes.filter(
      (n) => n.data?.isOficial === false,
    ).length;
    const staffCount = validNodes.filter((n) => n.data?.isStaff).length;

    let statsStr = `Total: ${totalCount} unidades`;
    if (modo === "analitico") {
      statsStr = `Total: ${totalCount} unidades  |  Oficiales: ${oficialesCount}  |  No Oficiales: ${noOficialesCount}  |  Staff: ${staffCount}`;
    } else if (modo === "estricto") {
      statsStr = `Total: ${totalCount} Unidades Oficiales Aprobadas  |  Staff: ${staffCount}`;
    } else {
      statsStr = `Total: ${totalCount} Unidades  |  Staff: ${staffCount}`;
    }
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(15, 23, 42);
    pdf.text(statsStr, pageWidth - marginMm, 34, { align: "right" });

    // Guía de Colores compacta en el encabezado
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(71, 85, 105);
    pdf.text("GU\xCDA DE COLORES:", marginMm, 45);

    let curLegendX = marginMm + pdf.getTextWidth("GU\xCDA DE COLORES:") + 6;
    const legendDotR = 1.3;
    const legendItems = [];
    if (modo === "analitico") {
      legendItems.push({
        label: "Oficial",
        color: [29, 78, 216],
        dashed: false,
      });
      legendItems.push({
        label: "No Oficial",
        color: [148, 163, 184],
        dashed: true,
      });
      legendItems.push({
        label: "Staff / Asesor\xEDa",
        color: [194, 65, 12],
        dashed: true,
      });
    } else if (modo === "estricto") {
      legendItems.push({
        label: "Estructura Oficial",
        color: [4, 120, 87],
        dashed: false,
      });
      legendItems.push({
        label: "Staff / Asesor\xEDa",
        color: [194, 65, 12],
        dashed: true,
      });
    } else {
      legendItems.push({
        label: "Estructura Institucional",
        color: [29, 78, 216],
        dashed: false,
      });
      legendItems.push({
        label: "Staff / Asesor\xEDa",
        color: [194, 65, 12],
        dashed: true,
      });
    }

    legendItems.forEach((item) => {
      pdf.setFillColor(item.color[0], item.color[1], item.color[2]);
      pdf.setDrawColor(15, 23, 42);
      pdf.setLineWidth(0.3);
      if (item.dashed) {
        pdf.setLineDashPattern([0.8, 0.8], 0);
      } else {
        pdf.setLineDashPattern([], 0);
      }
      pdf.circle(curLegendX, 44, legendDotR, "FD");
      pdf.setLineDashPattern([], 0);

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(51, 65, 85);
      pdf.text(item.label, curLegendX + legendDotR + 2, 45);
      curLegendX += legendDotR + 2 + pdf.getTextWidth(item.label) + 8;
    });

    // 2. Coordenadas de encuadre
    const offsetX = marginMm + (pageWidth - marginMm * 2 - diagramWidthMm) / 2;
    const offsetY = headerHeight + marginMm;

    // 3. Trazado jerárquico tipo Bus Institucional (Líneas ortogonales limpias como la gráfica original)
    const nodeMap = new Map();
    validNodes.forEach((n) => nodeMap.set(String(n.id), n));

    const edgeLineWidth = Math.max(0.35, 2.2 * scale);
    pdf.setLineWidth(edgeLineWidth);
    pdf.setDrawColor(15, 23, 42); // Slate 900

    // Agrupar hijos por cada unidad superior (padre) para trazar un bus jerárquico perfecto
    const parentChildrenMap = new Map();
    validNodes.forEach((n) => {
      if (n.parentId && nodeMap.has(String(n.parentId))) {
        const pId = String(n.parentId);
        if (!parentChildrenMap.has(pId)) {
          parentChildrenMap.set(pId, []);
        }
        parentChildrenMap.get(pId).push(n);
      }
    });

    parentChildrenMap.forEach((children, parentId) => {
      const parent = nodeMap.get(parentId);
      if (!parent) return;

      const normalChildren = children.filter((ch) => !ch.data?.isStaff);
      const staffChildren = children.filter((ch) => ch.data?.isStaff);

      const pX = offsetX + (Number(parent.position?.x || 0) - minX) * scale;
      const pY = offsetY + (Number(parent.position?.y || 0) - minY) * scale;
      const parentBottomX = pX + nodeWidthMm / 2;
      const parentBottomY = pY + nodeHeightMm;

      if (normalChildren.length > 0) {
        // Agrupar hijos normales según su busY asignado en layout (ej. Decanatos vs unidades centrales)
        const groupsByBus = new Map();
        normalChildren.forEach((ch) => {
          const edge = (cachedEdges || []).find(
            (e) => String(e.source) === String(parentId) && String(e.target) === String(ch.id),
          );
          const rawBusY = edge?.data?.busY;
          const key = rawBusY !== undefined ? String(rawBusY) : "default";
          if (!groupsByBus.has(key)) {
            groupsByBus.set(key, { rawBusY, children: [] });
          }
          groupsByBus.get(key).children.push(ch);
        });

        groupsByBus.forEach(({ rawBusY, children: groupChildren }) => {
          groupChildren.sort(
            (a, b) => Number(a.position?.x || 0) - Number(b.position?.x || 0),
          );

          const minChildY = Math.min(
            ...groupChildren.map((ch) => Number(ch.position?.y || 0)),
          );
          const firstChildY = offsetY + (minChildY - minY) * scale;
          const busY =
            rawBusY !== undefined
              ? offsetY + (rawBusY - minY) * scale
              : (parentBottomY + firstChildY) / 2;

          // Tronco vertical único desde la base del padre hasta la barra de distribución
          pdf.setLineDashPattern([], 0);
          pdf.line(parentBottomX, parentBottomY, parentBottomX, busY);

          // Barra horizontal del bus que une a todos los hermanos del grupo
          let minChildCenterX = parentBottomX;
          let maxChildCenterX = parentBottomX;

          groupChildren.forEach((ch) => {
            const cCenterX =
              offsetX +
              (Number(ch.position?.x || 0) - minX) * scale +
              nodeWidthMm / 2;
            if (cCenterX < minChildCenterX) minChildCenterX = cCenterX;
            if (cCenterX > maxChildCenterX) maxChildCenterX = cCenterX;
          });

          pdf.line(minChildCenterX, busY, maxChildCenterX, busY);

          // Bajantes verticales desde la barra a cada nodo hijo
          groupChildren.forEach((ch) => {
            const cX = offsetX + (Number(ch.position?.x || 0) - minX) * scale;
            const cY = offsetY + (Number(ch.position?.y || 0) - minY) * scale;
            const cCenterX = cX + nodeWidthMm / 2;
            pdf.line(cCenterX, busY, cCenterX, cY);
          });
        });
      }

      // Conexión lateral para unidades staff (con línea discontinua institucional)
      staffChildren.forEach((ch) => {
        const cX = offsetX + (Number(ch.position?.x || 0) - minX) * scale;
        const cY = offsetY + (Number(ch.position?.y || 0) - minY) * scale;
        const isLeft = ch.data?.staffSide === "left";
        const targetX = isLeft ? cX + nodeWidthMm : cX;
        const targetY = cY + nodeHeightMm / 2;

        pdf.setLineDashPattern([1.5, 1.5], 0);
        pdf.line(parentBottomX, parentBottomY, parentBottomX, targetY);
        pdf.line(parentBottomX, targetY, targetX, targetY);
      });
    });
    pdf.setLineDashPattern([], 0);

    // 4. Dibujo vectorial de nodos (tarjetas idénticas a la interfaz original)
    validNodes.forEach((n) => {
      const nx = offsetX + (Number(n.position?.x || 0) - minX) * scale;
      const ny = offsetY + (Number(n.position?.y || 0) - minY) * scale;

      const isStaff = Boolean(n.data?.isStaff);
      const isNonOficial =
        vistaModo.value === "analitico" &&
        (Boolean(n.data?.isNonOficialInOficialView) ||
          n.data?.isOficial === false ||
          !checkOficial(n.data));
      const isFilterFaded =
        (hasAnyFilter.value || mostrarDependencias.value) && !n.data?.isMatch;
      const isGhost = isNonOficial || isFilterFaded;

      let rawColor = n.data?.color || "#1e3a8a";
      if (isNonOficial) {
        rawColor = "#94A3B8";
      }
      const bgRgb = hexToRgb(rawColor);
      const textColor = getContrastingTextColor(rawColor);
      const textRgb = hexToRgb(textColor);
      const isDarkCard = textColor.toUpperCase() === "#FFFFFF";

      if (isGhost) {
        pdf.saveGraphicsState();
        const ghostOpacity = isFilterFaded ? 0.3 : 0.45;
        pdf.setGState(new pdf.GState({ opacity: ghostOpacity }));
      }

      // 1. Fondo de la tarjeta
      pdf.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
      const cardRadius = Math.max(0.8, 3.0 * scale);
      pdf.roundedRect(
        nx,
        ny,
        nodeWidthMm,
        nodeHeightMm,
        cardRadius,
        cardRadius,
        "F",
      );

      // 2. Borde de la tarjeta
      pdf.setDrawColor(15, 23, 42); // Slate 900
      pdf.setLineWidth(Math.max(0.25, 1.6 * scale));
      if (isStaff || isNonOficial) {
        pdf.setLineDashPattern([2, 2], 0);
      } else {
        pdf.setLineDashPattern([], 0);
      }
      pdf.roundedRect(
        nx,
        ny,
        nodeWidthMm,
        nodeHeightMm,
        cardRadius,
        cardRadius,
        "S",
      );
      pdf.setLineDashPattern([], 0);

      const padX = Math.max(1.4, 3.5 * scale);
      const padY = Math.max(1.0, 2.5 * scale);

      // 3. Barra superior para Staff o No Oficial
      let topBadgeHeight = 0;
      if (isStaff || isNonOficial) {
        topBadgeHeight = Math.max(2.0, nodeHeightMm * 0.13);
        if (isDarkCard) {
          pdf.setFillColor(15, 23, 42);
        } else {
          pdf.setFillColor(255, 255, 255);
        }
        pdf.roundedRect(
          nx,
          ny,
          nodeWidthMm,
          topBadgeHeight,
          cardRadius,
          cardRadius,
          "F",
        );
        pdf.rect(
          nx,
          ny + topBadgeHeight / 2,
          nodeWidthMm,
          topBadgeHeight / 2,
          "F",
        );

        pdf.setFont("helvetica", "bold");
        const badgeFontSize = Math.max(3.0, scale * 45);
        pdf.setFontSize(badgeFontSize);
        pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b);
        const badgeText = isStaff ? "STAFF - ASESOR\xCDA" : "NO OFICIAL";
        pdf.text(badgeText, nx + nodeWidthMm / 2, ny + topBadgeHeight * 0.72, {
          align: "center",
        });
      }

      // 4. Medición y cálculo de dimensiones del Footer (Código, Sigla, Nivel, Tipo)
      const codigoStr = cleanPdfText(n.data?.codigo || "-");
      const codeFontSize = Math.max(3.3, scale * 50);
      pdf.setFontSize(codeFontSize);
      pdf.setFont("helvetica", "bold");

      const measuredCodeW = pdf.getTextWidth(codigoStr);
      const pillPaddingX = Math.max(1.0, 2.0 * scale);
      const pillW = Math.min(
        nodeWidthMm - padX * 2 - 8,
        measuredCodeW + pillPaddingX * 2 + 0.6,
      );
      const pillH = Math.max(1.8, codeFontSize * 0.38 + 0.6);

      const hasSigla = Boolean(n.data?.sigla && n.data.sigla !== "-");
      const hasNivel = Boolean(n.data?.nivel && n.data.nivel !== "---");
      const hasTipo = Boolean(n.data?.tipo && n.data.tipo !== "---");

      const detailFontSize = Math.max(2.8, scale * 44);
      const detailLineSpacing = detailFontSize * 0.4;
      const iconW = Math.max(1.0, 2.2 * scale);
      const iconH = Math.max(0.8, 1.8 * scale);
      const textOffsetX = iconW + Math.max(0.6, 1.0 * scale);
      const maxDetailTextW = nodeWidthMm - padX * 2 - textOffsetX - 8;

      let detailLinesCount = (hasNivel ? 1 : 0) + (hasTipo ? 1 : 0);
      const footerH = pillH + detailLinesCount * detailLineSpacing + 1.2;
      const footerY = ny + nodeHeightMm - footerH - padY;

      // 5. Título de la Unidad en el Área Central (Hero, escalado adaptativo al largo del texto)
      const titleLen = cleanPdfText(n.data?.nombre || "").length;
      let titleFontSize;
      if (titleLen <= 28) {
        titleFontSize = Math.max(4.8, scale * 78);
      } else if (titleLen <= 52) {
        titleFontSize = Math.max(4.2, scale * 68);
      } else if (titleLen <= 74) {
        titleFontSize = Math.max(3.8, scale * 60);
      } else {
        titleFontSize = Math.max(3.3, scale * 53);
      }
      pdf.setFontSize(titleFontSize);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b);

      const titleText = cleanPdfText(n.data?.nombre || "").toUpperCase();
      const maxTitleW = nodeWidthMm - padX * 2;
      let titleLines = pdf.splitTextToSize(titleText, maxTitleW);

      if (titleLines.length > 5) {
        titleFontSize = Math.max(2.8, titleFontSize * 0.82);
        pdf.setFontSize(titleFontSize);
        titleLines = pdf.splitTextToSize(titleText, maxTitleW);
      }

      const maxLines = Math.min(5, titleLines.length);
      const titleLineSpacing = titleFontSize * 0.38;
      const titleBlockH = maxLines * titleLineSpacing;
      const titleTopBound = ny + topBadgeHeight + padY + 1.0;
      const titleAvailableH = Math.max(titleBlockH, footerY - titleTopBound);
      const titleStartY =
        titleTopBound +
        (titleAvailableH - titleBlockH) / 2 +
        titleLineSpacing * 0.8;

      for (let i = 0; i < maxLines; i++) {
        let lineStr = titleLines[i];
        if (i === 4 && titleLines.length > 5) {
          lineStr = lineStr.slice(0, Math.max(6, lineStr.length - 3)) + "...";
        }
        pdf.text(
          lineStr,
          nx + nodeWidthMm / 2,
          titleStartY + i * titleLineSpacing,
          { align: "center" },
        );
      }

      // 6. Dibujo del Footer en la parte inferior (Código + Sigla + Nivel + Tipo)
      const pillX = nx + padX;
      const pillY = footerY;
      if (isDarkCard) {
        pdf.setFillColor(
          Math.round(bgRgb.r * 0.7),
          Math.round(bgRgb.g * 0.7),
          Math.round(bgRgb.b * 0.7),
        );
        pdf.setTextColor(255, 255, 255);
      } else {
        pdf.setFillColor(
          Math.round(bgRgb.r + (255 - bgRgb.r) * 0.55),
          Math.round(bgRgb.g + (255 - bgRgb.g) * 0.55),
          Math.round(bgRgb.b + (255 - bgRgb.b) * 0.55),
        );
        pdf.setTextColor(15, 23, 42);
      }
      const pillRadius = Math.max(0.4, 1.5 * scale);
      pdf.roundedRect(pillX, pillY, pillW, pillH, pillRadius, pillRadius, "F");

      pdf.setFontSize(codeFontSize);
      pdf.setFont("helvetica", "bold");
      pdf.text(codigoStr, pillX + pillW / 2, pillY + pillH * 0.74, {
        align: "center",
      });

      // Si tiene sigla, dibujar pastilla de sigla al lado del código
      if (hasSigla) {
        const siglaStr = cleanPdfText(n.data.sigla);
        pdf.setFontSize(codeFontSize * 0.95);
        const measuredSiglaW = pdf.getTextWidth(siglaStr);
        const siglaPillW = measuredSiglaW + pillPaddingX * 2;
        const siglaPillX = pillX + pillW + 1.2;

        if (isDarkCard) {
          pdf.setFillColor(
            Math.round(bgRgb.r * 0.7),
            Math.round(bgRgb.g * 0.7),
            Math.round(bgRgb.b * 0.7),
          );
          pdf.setTextColor(255, 255, 255);
        } else {
          pdf.setFillColor(
            Math.round(bgRgb.r + (255 - bgRgb.r) * 0.55),
            Math.round(bgRgb.g + (255 - bgRgb.g) * 0.55),
            Math.round(bgRgb.b + (255 - bgRgb.b) * 0.55),
          );
          pdf.setTextColor(15, 23, 42);
        }

        pdf.roundedRect(
          siglaPillX,
          pillY,
          siglaPillW,
          pillH,
          pillRadius,
          pillRadius,
          "F",
        );
        pdf.text(siglaStr, siglaPillX + siglaPillW / 2, pillY + pillH * 0.74, {
          align: "center",
        });
      }

      // Detalles: Nivel y Tipo
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b);
      let detailY = pillY + pillH + detailLineSpacing * 0.9;

      // Función que garantiza que el texto de detalle quepa completo en una sola línea
      function drawDetailText(text, x, y, maxW, baseFontSize) {
        let fs = baseFontSize;
        pdf.setFontSize(fs);
        let tw = pdf.getTextWidth(text);
        if (tw > maxW) {
          fs = Math.max(2.1, baseFontSize * (maxW / tw));
          pdf.setFontSize(fs);
          tw = pdf.getTextWidth(text);
        }
        let outText = text;
        if (tw > maxW) {
          while (
            outText.length > 4 &&
            pdf.getTextWidth(outText + "...") > maxW
          ) {
            outText = outText.slice(0, -1);
          }
          outText += "...";
        }
        pdf.text(outText, x, y);
      }

      // 6.1 Nivel Jerárquico (icono mdi-layers-outline)
      if (hasNivel) {
        const nivelStr = cleanPdfText(n.data.nivel);
        pdf.setDrawColor(textRgb.r, textRgb.g, textRgb.b);
        pdf.setLineWidth(Math.max(0.12, 0.4 * scale));
        const ix = nx + padX;
        const iy = detailY - iconH * 0.5;
        pdf.lines(
          [
            [iconW * 0.5, -iconH * 0.35],
            [iconW * 0.5, iconH * 0.35],
            [-iconW * 0.5, iconH * 0.35],
            [-iconW * 0.5, -iconH * 0.35],
          ],
          ix,
          iy,
          [1, 1],
          "S",
          true,
        );
        pdf.line(ix, iy + iconH * 0.25, ix + iconW * 0.5, iy + iconH * 0.55);
        pdf.line(
          ix + iconW * 0.5,
          iy + iconH * 0.55,
          ix + iconW,
          iy + iconH * 0.25,
        );
        drawDetailText(
          nivelStr,
          nx + padX + textOffsetX,
          detailY,
          maxDetailTextW,
          detailFontSize,
        );
        detailY += detailLineSpacing;
      }

      // 6.2 Tipo de Unidad (icono mdi-tag-outline)
      if (hasTipo) {
        const tipoStr = cleanPdfText(n.data.tipo);
        pdf.setDrawColor(textRgb.r, textRgb.g, textRgb.b);
        pdf.setLineWidth(Math.max(0.12, 0.4 * scale));
        const ix = nx + padX;
        const ty = detailY - iconH * 0.7;
        pdf.roundedRect(ix, ty, iconW, iconH, 0.2, 0.2, "S");
        pdf.setFillColor(textRgb.r, textRgb.g, textRgb.b);
        pdf.circle(
          ix + iconW * 0.3,
          ty + iconH * 0.5,
          Math.max(0.12, 0.35 * scale),
          "F",
        );
        drawDetailText(
          tipoStr,
          nx + padX + textOffsetX,
          detailY,
          maxDetailTextW,
          detailFontSize,
        );
      }

      // 6.4 Menú de 3 puntos (UnidadActionsMenu en esquina inferior derecha)
      const dotsX = nx + nodeWidthMm - padX - Math.max(0.6, 1.2 * scale);
      const dotsR = Math.max(0.18, 0.4 * scale);
      const dotsSpacing = Math.max(0.6, 1.3 * scale);
      const bottomDotsY = ny + nodeHeightMm - padY - Math.max(0.6, 1.2 * scale);

      pdf.setFillColor(textRgb.r, textRgb.g, textRgb.b);
      pdf.circle(dotsX, bottomDotsY - dotsSpacing * 2, dotsR, "F");
      pdf.circle(dotsX, bottomDotsY - dotsSpacing, dotsR, "F");
      pdf.circle(dotsX, bottomDotsY, dotsR, "F");

      // 6.5 Conector circular inferior (manija Vue Flow)
      const handleX = nx + nodeWidthMm / 2;
      const handleY = ny + nodeHeightMm;
      const handleR = Math.max(0.4, 0.9 * scale);
      pdf.setFillColor(15, 23, 42);
      pdf.setDrawColor(255, 255, 255);
      pdf.setLineWidth(Math.max(0.12, 0.3 * scale));
      pdf.circle(handleX, handleY, handleR, "FD");

      if (isGhost) {
        pdf.restoreGraphicsState();
      }
    });

    // 5. Pie de página adaptativo según el modo activo
    pdf.setFontSize(10);
    pdf.setTextColor(148, 163, 184); // Slate 400
    pdf.text(currentConfig.footerText, pageWidth / 2, pageHeight - 8, {
      align: "center",
    });

    // 6. Descarga del archivo con nombre descriptivo del modo
    const blob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = blobUrl;
    downloadLink.download = `Organigrama_UMSA_${currentConfig.fileSuffix}_${new Date().toISOString().slice(0, 10)}.pdf`;
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    setTimeout(() => {
      if (document.body.contains(downloadLink)) {
        document.body.removeChild(downloadLink);
      }
      URL.revokeObjectURL(blobUrl);
    }, 2000);

    mostrar("¡PDF generado y descargado correctamente!", "success");
  } catch (error) {
    mostrar("Error al exportar: " + error.message, "error");
  } finally {
    isExportingPdf.value = false;
  }
}

async function verDependencias(id) {
  try {
    const node = unidadesList.value.find((u) => String(u.id) === String(id));
    if (!node) return;
    const full = await unidadesStore.getUnidadById(node.id);
    if (full && full.dependenciasFuncionales?.length) {
      unidadDependenciaSeleccionada.value = {
        id: node.id,
        dependencias: full.dependenciasFuncionales,
      };
      mostrarDependencias.value = true;
      updateGraph();
    } else {
      mostrar("Esta unidad no tiene dependencias funcionales", "info");
    }
  } catch (e) {
    mostrar("Error al cargar dependencias", "error");
  }
}

function resetDependencias() {
  mostrarDependencias.value = false;
  unidadDependenciaSeleccionada.value = null;
  updateGraph();
}

// --- GRAPH LOGIC & CACHE ---
let cachedHierarchyKey = "";
let cachedPositions = null;
let cachedEdges = null;

function computeHierarchyKey(sourceData, modo) {
  let key = `${modo}:${isDark.value ? "dark" : "light"}:${sourceData.length}:`;
  for (let i = 0; i < sourceData.length; i++) {
    const u = sourceData[i];
    const pId =
      u.parent && typeof u.parent === "object" ? u.parent.id : u.parent;
    key += `${u.id}-${pId}-${u.lado || "A"}-${u.es_troncal || u.esTroncal ? 1 : 0}-${u.es_sub_troncal || u.esSubTroncal || u.es_subtroncal || u.esSubtroncal ? 1 : 0};`;
  }
  return key;
}

function computeNodeVisuals({
  u,
  isMatch,
  isStaff,
  oficialStatus,
  isDepMode,
  selectedDepId,
  depsIdsSet,
  activesCount,
  searchActive,
  activeNivelId,
  activeTipoId,
  activeClaseId,
  activeRelacionId,
  isColorblindMode,
}) {
  let isNodeNonOficialInOficialView = false;
  if (vistaModo.value === "analitico" && !oficialStatus) {
    isNodeNonOficialInOficialView = true;
  }

  const colors = isColorblindMode ? FILTER_COLORS_COLORBLIND : FILTER_COLORS;

  let finalColor =
    (isColorblindMode
      ? null
      : u.color &&
          ![
            "#757575",
            "#9E9E9E",
            "#CCCCCC",
            "#CBD5E1",
            "#E2E8F0",
            "#FFFFFF",
            "#F8FAFC",
          ].includes(String(u.color).trim().toUpperCase())
        ? u.color
        : null) ||
    getIntenseNodeColor(u.clase, clasesStore.clases, isColorblindMode) ||
    (isStaff ? colors.staffDefault : colors.claseDefault);

  let visualReinforcement = null;

  if (isDepMode) {
    const uIdStr = String(u.id);
    if (uIdStr === selectedDepId) {
      finalColor = colors.selectedDep;
      visualReinforcement = {
        role: "dep-selected",
        icon: "mdi-bullseye-arrow",
        badgeText: "ORIGEN",
      };
    } else if (depsIdsSet.has(uIdStr)) {
      finalColor = colors.depFuncional;
      visualReinforcement = {
        role: "dep-funcional",
        icon: "mdi-transit-connection-variant",
        badgeText: "DEP. FUNCIONAL",
      };
    } else {
      finalColor = colors.noMatch;
    }
  } else if (isNodeNonOficialInOficialView) {
    finalColor = colors.noOficialAnalitico;
  } else if (hasAnyFilter.value) {
    if (!isMatch) {
      finalColor = colors.noMatch;
    } else {
      if (activesCount > 1) {
        finalColor = colors.multipleMatch;
        visualReinforcement = {
          role: "filter-multiple",
          icon: "mdi-check-all",
          badgeText: "MÚLTIPLE",
        };
      } else if (searchActive) {
        finalColor = colors.searchMatch;
        visualReinforcement = {
          role: "filter-search",
          icon: "mdi-magnify",
          badgeText: "BÚSQUEDA",
        };
      } else if (activeNivelId) {
        finalColor = colors.nivelFilter;
        visualReinforcement = {
          role: "filter-nivel",
          icon: "mdi-layers-outline",
          badgeText: "NIVEL",
        };
      } else if (activeTipoId) {
        finalColor = colors.tipoFilter;
        visualReinforcement = {
          role: "filter-tipo",
          icon: "mdi-tag-outline",
          badgeText: "TIPO",
        };
      } else if (activeClaseId) {
        finalColor = colors.claseFilter;
        visualReinforcement = {
          role: "filter-clase",
          icon: "mdi-domain",
          badgeText: "INSTANCIA",
        };
      } else if (activeRelacionId) {
        if (
          isStaff ||
          (u.relacion && String(u.relacion).toUpperCase() === "S") ||
          (u.str_relacion && normalizeText(u.str_relacion).includes("staff")) ||
          (u.str_relacion && normalizeText(u.str_relacion).includes("asesor"))
        ) {
          finalColor = colors.staffDefault;
          visualReinforcement = {
            role: "filter-relacion",
            icon: "mdi-account-tie",
            badgeText: "STAFF",
          };
        } else if (
          (u.relacion && String(u.relacion).toUpperCase() === "F") ||
          (u.str_relacion && normalizeText(u.str_relacion).includes("funcional"))
        ) {
          finalColor = colors.depFuncional;
          visualReinforcement = {
            role: "filter-relacion",
            icon: "mdi-transit-connection-variant",
            badgeText: "FUNCIONAL",
          };
        } else {
          finalColor = colors.relacionFilter;
          visualReinforcement = {
            role: "filter-relacion",
            icon: "mdi-vector-polyline",
            badgeText: "LINEAL",
          };
        }
      }
    }
  }

  return { finalColor, isNodeNonOficialInOficialView, visualReinforcement };
}

function getTitleClass(nombre) {
  const len = (nombre || "").length;
  if (len <= 28) return "title-short";
  if (len <= 52) return "title-medium";
  if (len <= 74) return "title-long";
  return "title-xlong";
}

const updateGraph = () => {
  if (isMobilePortrait.value) {
    return;
  }

  const isDepMode =
    mostrarDependencias.value && unidadDependenciaSeleccionada.value;
  let selectedDepId = "";
  let depsIdsSet = new Set();
  if (isDepMode) {
    selectedDepId = String(unidadDependenciaSeleccionada.value.id);
    depsIdsSet = new Set(
      (unidadDependenciaSeleccionada.value.dependencias || []).map((d) =>
        String(typeof d === "object" ? d.id : d),
      ),
    );
  }

  const getFilterId = (val) =>
    val && typeof val === "object"
      ? String(val.id || "").trim()
      : String(val || "").trim();
  const activeNivelId = getFilterId(filterNivel.value);
  const activeTipoId = getFilterId(filterTipo.value);
  const activeClaseId = getFilterId(filterInstancia.value);
  const activeRelacionId = getFilterId(filterRelacion.value);
  const searchLower = normalizeText(searchTerm.value);
  const activesCount = [
    activeNivelId,
    activeTipoId,
    activeClaseId,
    activeRelacionId,
  ].filter((x) => x).length;

  // Filtrado Estructural para Modo Estricto
  let sourceData = unidadesList.value;
  if (vistaModo.value === "estricto") {
    sourceData = sourceData.filter((u) => checkOficial(u));
  }

  const currentHierarchyKey = computeHierarchyKey(sourceData, vistaModo.value);

  // ⚡ LAYOUT INCREMENTAL: Si la jerarquía no cambió, solo actualizamos visuales (color, isMatch)
  if (
    currentHierarchyKey === cachedHierarchyKey &&
    cachedPositions &&
    nodes.value &&
    nodes.value.length === sourceData.length
  ) {
    const currentNodes = nodes.value;
    for (let i = 0; i < currentNodes.length; i++) {
      const node = currentNodes[i];
      const u = unidadesByIdMap.value.get(node.id);
      if (!u) continue;
      const isStaff =
        node.data?.isStaff ?? isStaffNode(u, relacionesStore.relaciones);
      const oficialStatus = node.data?.isOficial ?? checkOficial(u);
      const isMatch = filteredUnitIdsSet.value.has(node.id);

      const { finalColor, isNodeNonOficialInOficialView, visualReinforcement } =
        computeNodeVisuals({
          u,
          isMatch,
          isStaff,
          oficialStatus,
          isDepMode,
          selectedDepId,
          depsIdsSet,
          activesCount,
          searchActive: !!searchLower,
          activeNivelId,
          activeTipoId,
          activeClaseId,
          activeRelacionId,
          isColorblindMode: isColorblind.value,
        });

      node.data.color = finalColor;
      node.data.isMatch = isMatch;
      node.data.isNonOficialInOficialView = isNodeNonOficialInOficialView;
      node.data.visualReinforcement = visualReinforcement;
    }

    // Control de cámara inteligente inmediato sin setTimeout
    nextTick(() => {
      if (searchLower) {
        const matchingIds = currentNodes
          .filter((n) => n.data && n.data.isMatch && !n.data.isInvisible)
          .map((n) => String(n.id));
        if (matchingIds.length > 0) {
          volarANodos(matchingIds);
        } else {
          fitView({ padding: 0.15, duration: 800 });
        }
      }
    });
    return;
  }

  // Si la jerarquía cambió (modo estricto/analítico o recarga de datos), recalculamos layout
  const baseNodes = sourceData.map((u) => {
    const isStaff = isStaffNode(u, relacionesStore.relaciones);
    let pId = u.parent && typeof u.parent === "object" ? u.parent.id : u.parent;

    // RECONEXIÓN DINÁMICA: Si estamos en modo estricto, buscamos el padre oficial más cercano
    if (vistaModo.value === "estricto") {
      pId = findNearestOficialParentId(u);
    }

    const oficialStatus = checkOficial(u);
    const isMatch = filteredUnitIdsSet.value.has(String(u.id));

    const { finalColor, isNodeNonOficialInOficialView, visualReinforcement } =
      computeNodeVisuals({
        u,
        isMatch,
        isStaff,
        oficialStatus,
        isDepMode,
        selectedDepId,
        depsIdsSet,
        activesCount,
        searchActive: !!searchLower,
        activeNivelId,
        activeTipoId,
        activeClaseId,
        activeRelacionId,
        isColorblindMode: isColorblind.value,
      });

    return {
      id: String(u.id),
      parentId: pId ? String(pId) : null,
      type: "custom",
      data: {
        nombre: u.nombre || u.denominacion,
        sigla: u.sigla || "-",
        tipo: resolveTipo(u.tipo),
        nivel: resolveNivel(u.nivel),
        clase: resolveClase(u.clase),
        codigo: u.codigo,
        color: finalColor,
        isStaff: isStaff,
        isInvisible: false,
        orden: getPesoReal(u, clasesStore.clases),
        isMatch: isMatch,
        isNonOficialInOficialView: isNodeNonOficialInOficialView,
        visualReinforcement: visualReinforcement,
        isOficial: oficialStatus,
        esTroncal: u.es_troncal === true || u.esTroncal === true,
        esSubTroncal:
          u.es_sub_troncal === true ||
          u.esSubTroncal === true ||
          u.es_subtroncal === true ||
          u.esSubtroncal === true,
        esSubtroncal:
          u.es_sub_troncal === true ||
          u.esSubTroncal === true ||
          u.es_subtroncal === true ||
          u.esSubtroncal === true,
        lado: u.lado || "AUTOMATICO",
      },
    };
  });

  // Asignar staffSide a los nodos staff antes de generar edges y layout
  const staffNodesOnly = baseNodes.filter((n) => n.data && n.data.isStaff);
  const staffByParentMap = {};
  staffNodesOnly.forEach((node) => {
    if (!staffByParentMap[node.parentId]) {
      staffByParentMap[node.parentId] = [];
    }
    staffByParentMap[node.parentId].push(node);
  });

  Object.keys(staffByParentMap).forEach((parentId) => {
    const parentStaffs = staffByParentMap[parentId];
    parentStaffs.forEach((staffNode, index) => {
      staffNode.data.staffSide = index % 2 === 0 ? "right" : "left";
    });
  });

  const finalNodes = baseNodes;
  const nodeIds = new Set(finalNodes.map((n) => String(n.id)));
  const edgeStrokeColor = isDark.value ? "#e2e8f0" : "#000000";
  const flowEdges = finalNodes
    .filter((n) => n.parentId && nodeIds.has(String(n.parentId)))
    .map((n) => {
      let targetH = "target-top";
      if (n.data && n.data.isStaff) {
        targetH = n.data.staffSide === "right" ? "target-left" : "target-right";
      }
      return {
        id: `e${n.parentId}-${n.id}`,
        source: String(n.parentId),
        target: String(n.id),
        type: "smoothstep", // Líneas rectas ortogonales limpias tipo mapa conceptual
        targetHandle: targetH,
        data: {
          borderRadius: 0,
        },
        style: {
          fill: "none",
          stroke: edgeStrokeColor,
          strokeWidth: 3,
          strokeDasharray: n.data && n.data.isStaff ? "6 6" : "none",
        },
      };
    });

  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
    finalNodes,
    flowEdges,
  );

  // Cachear jerarquía y posiciones para actualizaciones incrementales
  cachedHierarchyKey = currentHierarchyKey;
  cachedPositions = {};
  layoutedNodes.forEach((n) => {
    cachedPositions[n.id] = { ...n.position };
  });
  cachedEdges = layoutedEdges;

  setNodes(layoutedNodes);
  setEdges(layoutedEdges);

  // Control de cámara inteligente inmediato sin setTimeout
  nextTick(() => {
    if (searchLower) {
      const matchingIds = layoutedNodes
        .filter((n) => n.data && n.data.isMatch && !n.data.isInvisible)
        .map((n) => String(n.id));
      if (matchingIds.length > 0) {
        volarANodos(matchingIds);
      } else {
        fitView({ padding: 0.15, duration: 800 });
      }
    } else {
      fitView({ padding: 0.15, duration: 800 });
    }
  });
};

watch(isDark, () => {
  cachedHierarchyKey = "";
  updateGraph();
});

watch(isMobilePortrait, (isBlocked) => {
  if (!isBlocked) {
    nextTick(() => {
      updateGraph();
    });
  }
});

/**
 * Vuela animadamente la cámara hacia uno o varios nodos (estilo Google Maps).
 * - 1 match: Encuadra el nodo con padding suficiente (maxZoom 1.25).
 * - N matches: Encuadra conjuntamente todos los nodos coincidentes.
 * - 0 matches o vacío: Restaura el encuadre general del organigrama.
 *
 * @param {Array<string|number>} ids - Lista de IDs de nodos a enfocar
 */
async function volarANodos(ids = [], options = {}) {
  if (isMobilePortrait.value) return;
  await nextTick();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("resize"));
  }
  if (typeof document !== "undefined") {
    const flowCardEl = document.querySelector(".flow-card");
    if (flowCardEl) {
      flowCardEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  const duration = options.duration ?? 800;
  const padding = options.padding ?? (ids.length === 1 ? 0.35 : 0.2);
  const maxZoom = options.maxZoom ?? 1.25;

  if (!ids || ids.length === 0) {
    await fitView({ padding: 0.1, duration });
    return;
  }

  const strIds = ids.map((id) => String(id));

  if (strIds.length === 1) {
    await fitView({
      nodes: [strIds[0]],
      padding,
      duration,
      maxZoom,
    });
    return;
  }

  await fitView({ nodes: strIds, duration, padding, maxZoom });
}

let lastCenteringId = null;
let lastCenteringTime = 0;

/**
 * Centra la vista del organigrama en un nodo específico si está visible en el viewport.
 * Respeta móvil portrait (MOF-049) y evita enfocar nodos invisibles por filtros.
 *
 * @param {string|number} unidadId - ID de la unidad
 * @param {Object} options - Opciones adicionales para volarANodos (duration, padding, maxZoom)
 */
async function centrarNodo(unidadId, options = {}) {
  if (!unidadId || isMobilePortrait.value) return;
  const now = Date.now();
  const strId = String(unidadId);
  if (lastCenteringId === strId && now - lastCenteringTime < 150) {
    return;
  }
  lastCenteringId = strId;
  lastCenteringTime = now;

  const targetNode = (nodes.value || []).find((n) => String(n.id) === strId);
  if (targetNode?.data?.isInvisible) return;
  return volarANodos([strId], {
    duration: options.duration ?? 450,
    padding: options.padding ?? 0.35,
    maxZoom: options.maxZoom ?? 1.15,
  });
}

// --- EVENTS ---
onMounted(async () => {
  detailsDrawer.value = false;
  hierarchyDrawer.value = false;
  if (typeof window !== "undefined" && window.innerWidth <= 960) {
    activePanels.value = null; // Colapsar filtros en móviles para ahorrar espacio vertical
  }
  isGraphLoading.value = true;
  graphLoadingMessage.value = "Cargando organigrama...";
  graphLoadingSubmessage.value = "Obteniendo unidades y catálogos institucionales...";
  try {
    const promises = [unidadesStore.getFetchUnidades(), prefetchCatalogs()];
    if (!unidadesStore.dashboardStats) {
      promises.push(unidadesStore.getDashboardStats());
    }
    await Promise.all(promises);
    const fetchError =
      unidadesStore.error ||
      tiposStore.error ||
      nivelesStore.error ||
      relacionesStore.error ||
      cargosStore.error ||
      clasesStore.error;
    if (fetchError) {
      mostrar(fetchError, "error");
    }
    graphLoadingMessage.value = "Renderizando estructura...";
    graphLoadingSubmessage.value = "Calculando distribución jerárquica...";
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 30));
    updateGraph();
  } catch (err) {
    mostrar("Error al cargar organigrama", "error");
  } finally {
    isGraphLoading.value = false;
  }
});

onNodeClick(({ node }) => {
  if (node?.data?.isInvisible) return;
  centrarNodo(node.id, { duration: 450 });
  showDetails(node.id);
});

// Watcher inmediato para búsqueda, filtros categóricos y cambios estructurales (sin debounce ni timers)
watch(
  [
    () => unidadesList.value,
    () => clasesStore.clases,
    () => accessibilityStore.colorblindMode,
    vistaModo,
    hasAnyFilter,
    filterNivel,
    filterTipo,
    filterInstancia,
    filterRelacion,
    searchTerm,
  ],
  () => {
    cachedHierarchyKey = "";
    updateGraph();
  },
);

watch(detailsDrawer, (val) => {
  if (val) {
    hierarchyDrawer.value = false;
  }
});

watch(hierarchyDrawer, (val) => {
  if (val) {
    detailsDrawer.value = false;
  }
});

function resetFilters() {
  filterNivel.value = null;
  filterTipo.value = null;
  filterInstancia.value = null;
  filterRelacion.value = null;
  searchTerm.value = "";
  vistaModo.value = "analitico";
  resetDependencias();
}
</script>

<template>
  <v-container
    fluid
    class="organigrama-main-container pt-0 px-6 pb-6 d-flex flex-column"
  >
    <div class="flex-none mx-auto w-100" style="max-width: 1400px">
      <!-- Header & Breadcrumb -->
      <div class="mb-2 mt-4">
        <h1 class="text-h4 font-weight-black mb-1 text-slate-800">
          Estructura Organizacional
        </h1>
        <div class="text-body-2 d-flex align-center text-slate-500">
          <v-icon size="18" class="mr-2">mdi-sitemap</v-icon>
          <span>MOF</span>
          <v-icon size="16" class="mx-1">mdi-chevron-right</v-icon>
          <span class="font-weight-bold text-primary"
            >Organigrama Interactivo</span
          >
        </div>
      </div>

      <!-- STATS -->
      <v-row dense class="mb-1">
        <v-col v-for="stat in stats" :key="stat.title" cols="12" sm="6" md="3">
          <v-card
            elevation="4"
            class="rounded-lg border-start border-4"
            :style="{ borderLeftColor: `var(--v-${stat.color}-base)` }"
          >
            <v-card-item class="py-1 px-4">
              <template v-slot:prepend>
                <v-avatar :color="stat.color" variant="tonal" size="48"
                  ><v-icon :icon="stat.icon" size="28"></v-icon
                ></v-avatar>
              </template>
              <v-card-title class="text-h5 font-weight-bold">{{
                stat.value
              }}</v-card-title>
              <v-card-subtitle
                class="text-caption text-uppercase font-weight-medium"
                >{{ stat.title }}</v-card-subtitle
              >
            </v-card-item>
          </v-card>
        </v-col>
      </v-row>

      <!-- FILTROS COLLAPSIBLE -->
      <v-expansion-panels v-model="activePanels" class="mb-1 rounded-lg border">
        <v-expansion-panel :value="0" elevation="2" class="rounded-lg">
          <v-expansion-panel-title
            class="py-2 px-4 font-weight-bold text-subtitle-2"
          >
            <v-icon start color="primary" class="mr-2"
              >mdi-filter-variant</v-icon
            >
            Panel de Filtros y Configuración
            <v-spacer></v-spacer>
            <span
              v-if="hasAnyFilter"
              class="text-caption text-primary font-weight-bold mr-2"
              >(Filtros Activos)</span
            >
          </v-expansion-panel-title>
          <v-expansion-panel-text class="pa-0">
            <v-card flat>
              <v-card-text class="pa-4 pt-4">
                <div
                  class="d-flex flex-wrap align-center w-100"
                  style="gap: 16px"
                >
                  <div style="flex: 1 1 180px; min-width: 180px">
                    <v-text-field
                      v-model="searchTerm"
                      label="Buscar unidad..."
                      density="compact"
                      hide-details
                      variant="outlined"
                      prepend-inner-icon="mdi-magnify"
                      clearable
                      autocomplete="off"
                    />
                  </div>
                  <div style="flex: 1 1 180px; min-width: 180px">
                    <SelectAllNiveles
                      v-model="filterNivel"
                      label="Nivel Jerárquico"
                      density="compact"
                      hide-details
                      variant="outlined"
                      clearable
                      autocomplete="off"
                      :hide-crud="true"
                    />
                  </div>
                  <div style="flex: 1 1 180px; min-width: 180px">
                    <SelectAllTipos
                      v-model="filterTipo"
                      label="Tipo de Unidad"
                      density="compact"
                      hide-details
                      variant="outlined"
                      clearable
                      autocomplete="off"
                      :hide-crud="true"
                    />
                  </div>
                  <div style="flex: 1 1 180px; min-width: 180px">
                    <SelectAllClases
                      v-model="filterInstancia"
                      label="Instancia"
                      density="compact"
                      hide-details
                      variant="outlined"
                      clearable
                      autocomplete="off"
                      :hide-crud="true"
                    />
                  </div>
                  <div style="flex: 1 1 180px; min-width: 180px">
                    <SelectAllRelaciones
                      v-model="filterRelacion"
                      label="Relación"
                      density="compact"
                      hide-details
                      variant="outlined"
                      clearable
                      autocomplete="off"
                      :hide-crud="true"
                    />
                  </div>
                </div>
                <v-divider class="my-2"></v-divider>
                <v-row dense align="center">
                  <v-col
                    cols="12"
                    lg="7"
                    md="8"
                    class="d-flex align-center flex-wrap"
                  >
                    <span
                      class="text-subtitle-2 mr-3 font-weight-bold text-grey-darken-2"
                      >VISUALIZAR:</span
                    >
                    <v-btn-toggle
                      v-model="vistaModo"
                      mandatory
                      color="primary"
                      variant="outlined"
                      density="comfortable"
                      rounded="lg"
                    >
                      <v-btn value="integral" class="px-3 text-caption">
                        <v-icon start size="16">mdi-eye</v-icon>
                        INTEGRAL
                      </v-btn>
                      <v-btn value="analitico" class="px-3 text-caption">
                        <v-icon start size="16">mdi-chart-scatter-plot</v-icon>
                        ANALÍTICA
                      </v-btn>
                      <v-btn value="estricto" class="px-3 text-caption">
                        <v-icon start size="16">mdi-check-decagram</v-icon>
                        OFICIAL
                      </v-btn>
                    </v-btn-toggle>
                  </v-col>
                  <v-col
                    cols="12"
                    lg="5"
                    md="4"
                    class="d-flex gap-2 justify-end flex-wrap mt-2 mt-md-0 align-center"
                  >
                    <v-btn
                      prepend-icon="mdi-file-export"
                      color="primary"
                      variant="tonal"
                      density="comfortable"
                      class="rounded-lg font-weight-bold"
                      :loading="isExportingPdf"
                      :disabled="isExportingPdf"
                      @click="exportarOrganigrama"
                    >
                      PDF
                      <v-tooltip activator="parent" location="top"
                        >Exportar organigrama actual a PDF (A3)</v-tooltip
                      >
                    </v-btn>
                    <v-btn
                      prepend-icon="mdi-format-list-numbered"
                      color="secondary"
                      variant="tonal"
                      density="comfortable"
                      class="rounded-lg font-weight-bold"
                      @click="hierarchyDrawer = true"
                    >
                      Jerarquías
                      <v-tooltip activator="parent" location="top"
                        >Gestionar catálogos y pesos jerárquicos</v-tooltip
                      >
                    </v-btn>
                    <v-btn
                      prepend-icon="mdi-filter-off"
                      variant="outlined"
                      color="grey-darken-2"
                      density="comfortable"
                      class="rounded-lg font-weight-bold"
                      @click="resetFilters"
                    >
                      Limpiar
                      <v-tooltip activator="parent" location="top"
                        >Restablecer todos los filtros de búsqueda</v-tooltip
                      >
                    </v-btn>
                    <v-btn
                      v-if="!unidadesStore.unidades.length"
                      prepend-icon="mdi-plus"
                      color="primary"
                      variant="flat"
                      density="comfortable"
                      class="rounded-lg font-weight-bold mr-2"
                      @click="openForm(null, false)"
                    >
                      Añadir Raíz
                      <v-tooltip activator="parent" location="top"
                        >Crear la primera unidad raíz institucional</v-tooltip
                      >
                    </v-btn>
                    <v-btn
                      prepend-icon="mdi-swap-horizontal"
                      color="primary"
                      variant="flat"
                      density="comfortable"
                      class="rounded-lg font-weight-bold"
                      @click="dialog_nodo_chance = true"
                    >
                      Dependencia
                      <v-tooltip activator="parent" location="top"
                        >Cambiar la unidad superior (Padre) de un nodo o reasignar unidades huérfanas</v-tooltip
                      >
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <!-- RESULTS TABLE -->
    <div v-if="hasAnyFilter" class="flex-none mb-1 px-1 filter-results">
      <v-card
        elevation="3"
        class="rounded-lg border-primary border-t-2 filter-results-card"
      >
        <v-table density="comfortable">
          <thead>
            <tr class="bg-indigo-lighten-5">
              <th class="text-caption font-weight-black" style="width: 140px">
                CÓDIGO
              </th>
              <th class="text-caption font-weight-black">
                NOMBRE / DENOMINACIÓN
              </th>
              <th
                class="text-center text-caption font-weight-black"
                style="width: 80px"
              >
                ACCIONES
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="u in unidadesFiltradas"
              :key="u.id"
              class="row-hover cursor-pointer"
              @click="volarANodos([u.id])"
            >
              <!-- Código con indicador de color integrado -->
              <td class="text-caption font-weight-black pa-0">
                <div class="d-flex align-center fill-height">
                  <div
                    :style="{
                      backgroundColor: getIntenseNodeColor(
                        u.clase,
                        clasesStore.clases,
                        isColorblind,
                      ),
                      height: '32px',
                      width: '4px',
                    }"
                    class="mr-2"
                  ></div>
                  <span class="text-slate-800">{{ u.codigo }}</span>
                </div>
              </td>

              <td class="text-caption">
                <div class="font-weight-bold">
                  <HighlightedText
                    :text="u.nombre || u.denominacion"
                    :query="searchTerm"
                  />
                </div>
                <div v-if="u.color" class="text-xxs text-grey-darken-1">
                  <v-icon size="10">mdi-palette</v-icon> Personalizado
                </div>
              </td>

              <td class="text-center" @click.stop>
                <UnidadActionsMenu
                  :unidad-id="u.id"
                  show-quick-actions
                  density="compact"
                  @details="showDetails"
                  @pdf="verReporte"
                  @dependencias="verDependencias"
                  @add-child="(id) => openForm(id, false)"
                  @edit="(id) => openForm(id, true)"
                  @delete="(id) => openDeleteDialog(id)"
                />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>

    <!-- FLOW CONTAINER -->
    <v-card
      elevation="3"
      class="flow-card flex-grow-1 rounded-lg overflow-hidden border mb-0 position-relative d-flex flex-column"
    >
      <MofLoadingOverlay
        :model-value="isGraphLoading || isExportingPdf"
        :contained="true"
        :message="isExportingPdf ? 'Generando reporte PDF...' : graphLoadingMessage"
        :submessage="isExportingPdf ? 'Construyendo organigrama en alta resolución...' : graphLoadingSubmessage"
      />

      <v-progress-linear
        v-if="unidadesStore.loading || isGraphLoading"
        indeterminate
        color="primary"
      />
      <!-- Vista Móvil (Portrait): Pantalla vacía clara con CTA a Árbol de Unidades (NO monta Vue Flow) -->
      <div
        v-if="isMobilePortrait"
        class="mobile-organigrama-blocked flex-grow-1 d-flex flex-column align-center justify-center pa-6 text-center"
      >
        <v-empty-state
          icon="mdi-devices"
          title="Vista recomendada para PC o Tablet"
          text="El organigrama interactivo está pensado para PC o tablet en horizontal. En el celular usá Árbol de Unidades."
          class="my-auto py-8"
        >
          <template #actions>
            <v-btn
              color="primary"
              variant="elevated"
              elevation="2"
              prepend-icon="mdi-file-tree"
              size="large"
              class="rounded-lg font-weight-bold text-none px-6"
              :to="{ name: 'tree_unidades' }"
            >
              Ir al Árbol de Unidades
            </v-btn>
          </template>
        </v-empty-state>
      </div>

      <!-- Vista Desktop / Landscape: Organigrama Interactivo con Vue Flow -->
      <div
        v-else
        class="flow-container position-relative"
      >
        <!-- Botón Volver Flotante en Pantallas Reducidas -->
        <v-btn
          v-if="isMobile"
          icon
          size="small"
          color="primary"
          variant="elevated"
          elevation="3"
          class="floating-back-btn"
          aria-label="Volver a la vista anterior"
          @click="handleVolver"
        >
          <v-icon size="20">mdi-arrow-left</v-icon>
          <v-tooltip activator="parent" location="right">Volver</v-tooltip>
        </v-btn>

        <!-- Panel de Zoom Flotante Accesible -->
        <div
          class="floating-zoom-panel d-flex flex-column"
          role="toolbar"
          aria-label="Controles de zoom del organigrama"
        >
          <v-btn
            icon
            size="small"
            variant="elevated"
            color="surface"
            elevation="2"
            class="rounded-lg mb-1"
            aria-label="Acercar zoom"
            @click="handleZoomIn"
          >
            <v-icon size="20">mdi-plus</v-icon>
            <v-tooltip activator="parent" location="left"
              >Acercar (+)</v-tooltip
            >
          </v-btn>
          <v-btn
            icon
            size="small"
            variant="elevated"
            color="surface"
            elevation="2"
            class="rounded-lg mb-1"
            aria-label="Alejar zoom"
            @click="handleZoomOut"
          >
            <v-icon size="20">mdi-minus</v-icon>
            <v-tooltip activator="parent" location="left">Alejar (-)</v-tooltip>
          </v-btn>
          <v-btn
            icon
            size="small"
            variant="elevated"
            color="surface"
            elevation="2"
            class="rounded-lg"
            aria-label="Restablecer y centrar organigrama"
            @click="handleResetZoom"
          >
            <v-icon size="18">mdi-fit-to-screen-outline</v-icon>
            <v-tooltip activator="parent" location="left"
              >Centrar organigrama</v-tooltip
            >
          </v-btn>
        </div>

        <VueFlow
          :nodes="nodes"
          :edges="edges"
          fit-view-on-init
          :default-edge-options="{
            type: 'smoothstep',
            data: { borderRadius: 0 },
          }"
          :min-zoom="0.05"
          :max-zoom="4"
        >
          <template #edge-smoothstep="edgeProps">
            <BaseEdge
              :id="edgeProps.id"
              :path="getCustomEdgePath(edgeProps)"
              :style="edgeProps.style"
              :marker-end="edgeProps.markerEnd"
            />
          </template>
          <template #node-invisible="{ data }">
            <div class="node-bridge-container">
              <div class="bridge-line" :class="{ dashed: data.isStaff }"></div>
            </div>
            <Handle
              id="target-top"
              type="target"
              position="top"
              style="opacity: 0"
            />
            <Handle
              id="source-bottom"
              type="source"
              position="bottom"
              style="opacity: 0"
            />
          </template>
          <template #node-custom="{ data, id }">
            <div
              class="custom-node"
              tabindex="0"
              role="button"
              :aria-label="`Unidad ${data.codigo}: ${data.nombre}. Presione Enter para ver detalles.`"
              @keydown.enter.prevent="showDetails(id)"
              @keydown.space.prevent="showDetails(id)"
              :class="{
                'staff-node': data.isStaff,
                'faded-node':
                  (hasAnyFilter || mostrarDependencias) && !data.isMatch,
                'non-oficial-faded': data.isNonOficialInOficialView,
                'dep-selected-node':
                  data.visualReinforcement?.role === 'dep-selected',
                'dep-funcional-node':
                  data.visualReinforcement?.role === 'dep-funcional',
                'filter-match-node':
                  data.visualReinforcement &&
                  String(data.visualReinforcement.role).startsWith('filter-'),
              }"
              :style="{
                backgroundColor: data.color,
                '--node-color': data.color,
              }"
            >
              <div
                v-if="data.isStaff"
                class="staff-badge-top"
                :style="{
                  backgroundColor:
                    getContrastingTextColor(data.color) === '#FFFFFF'
                      ? 'rgba(0, 0, 0, 0.28)'
                      : 'rgba(255, 255, 255, 0.4)',
                  color: getContrastingTextColor(data.color),
                }"
              >
                <v-icon
                  size="14"
                  class="mr-1"
                  :color="
                    getContrastingTextColor(data.color) === '#FFFFFF'
                      ? 'white'
                      : '#0F172A'
                  "
                >
                  mdi-account-tie-outline
                </v-icon>
                <span>STAFF - ASESORÍA</span>
              </div>
              <div
                v-else-if="data.isNonOficialInOficialView"
                class="non-oficial-badge-top"
                :style="{
                  backgroundColor:
                    getContrastingTextColor(data.color) === '#FFFFFF'
                      ? 'rgba(0, 0, 0, 0.25)'
                      : 'rgba(255, 255, 255, 0.35)',
                  color: getContrastingTextColor(data.color),
                }"
              >
                <v-icon
                  size="13"
                  class="mr-1"
                  :color="
                    getContrastingTextColor(data.color) === '#FFFFFF'
                      ? 'white'
                      : '#0F172A'
                  "
                >
                  mdi-alert-circle-outline
                </v-icon>
                <span>NO OFICIAL</span>
              </div>
              <div
                v-else-if="data.visualReinforcement"
                class="reinforcement-badge-top"
                :style="{
                  backgroundColor:
                    getContrastingTextColor(data.color) === '#FFFFFF'
                      ? 'rgba(0, 0, 0, 0.28)'
                      : 'rgba(255, 255, 255, 0.4)',
                  color: getContrastingTextColor(data.color),
                }"
              >
                <v-icon
                  size="13"
                  class="mr-1"
                  :color="
                    getContrastingTextColor(data.color) === '#FFFFFF'
                      ? 'white'
                      : '#0F172A'
                  "
                >
                  {{ data.visualReinforcement.icon }}
                </v-icon>
                <span>{{ data.visualReinforcement.badgeText }}</span>
              </div>
              <div class="node-content" @click="showDetails(id)">
                <!-- Zona Central Hero: Nombre de la Unidad -->
                <div class="node-center">
                  <div
                    :class="['node-line', 'title-line', getTitleClass(data.nombre)]"
                    :style="{ color: getContrastingTextColor(data.color) }"
                  >
                    {{ data.nombre }}
                  </div>
                </div>

                <!-- Zona Inferior: Metadatos (Código, Sigla, Nivel, Tipo) -->
                <div class="node-footer">
                  <div
                    class="node-line code-line d-flex align-center flex-wrap"
                    :style="{ color: getContrastingTextColor(data.color) }"
                  >
                    <span
                      class="code-badge mr-1"
                      :style="{
                        backgroundColor:
                          getContrastingTextColor(data.color) === '#FFFFFF'
                            ? 'rgba(0, 0, 0, 0.22)'
                            : 'rgba(255, 255, 255, 0.45)',
                        color: getContrastingTextColor(data.color),
                      }"
                    >
                      {{ data.codigo }}
                    </span>
                    <span
                      v-if="data.sigla && data.sigla !== '-'"
                      class="sigla-badge"
                      :style="{
                        backgroundColor:
                          getContrastingTextColor(data.color) === '#FFFFFF'
                            ? 'rgba(0, 0, 0, 0.16)'
                            : 'rgba(255, 255, 255, 0.35)',
                        color: getContrastingTextColor(data.color),
                      }"
                    >
                      {{ data.sigla }}
                    </span>
                  </div>
                  <div
                    class="node-line detail-line"
                    :style="{ color: getContrastingTextColor(data.color) }"
                  >
                    <v-icon
                      size="15"
                      class="mr-1"
                      :color="
                        getContrastingTextColor(data.color) === '#FFFFFF'
                          ? 'white'
                          : '#0F172A'
                      "
                    >
                      mdi-layers-outline
                    </v-icon>
                    <span>{{ data.nivel }}</span>
                  </div>
                  <div
                    class="node-line detail-line"
                    :style="{ color: getContrastingTextColor(data.color) }"
                  >
                    <v-icon
                      size="15"
                      class="mr-1"
                      :color="
                        getContrastingTextColor(data.color) === '#FFFFFF'
                          ? 'white'
                          : '#0F172A'
                      "
                    >
                      mdi-tag-outline
                    </v-icon>
                    <span>{{ data.tipo }}</span>
                  </div>
                </div>
                <v-tooltip activator="parent" location="top" max-width="360">
                  {{ data.nombre }}
                </v-tooltip>
              </div>
              <div class="node-actions pa-1 d-flex justify-end" @click.stop>
                <UnidadActionsMenu
                  :unidad-id="id"
                  :show-quick-actions="false"
                  density="node"
                  :activator-color="
                    getContrastingTextColor(data.color) === '#FFFFFF'
                      ? 'white'
                      : '#0F172A'
                  "
                  @details="showDetails"
                  @pdf="verReporte"
                  @dependencias="verDependencias"
                  @add-child="(uid) => openForm(uid, false)"
                  @edit="(uid) => openForm(uid, true)"
                  @delete="() => openDeleteDialog(id)"
                />
              </div>
              <Handle
                v-if="data.isStaff && data.staffSide === 'right'"
                id="target-left"
                type="target"
                position="left"
              />
              <Handle
                v-else-if="data.isStaff && data.staffSide === 'left'"
                id="target-right"
                type="target"
                position="right"
              />
              <Handle v-else id="target-top" type="target" position="top" />
              <Handle id="source-bottom" type="source" position="bottom" />
            </div>
          </template>
          <Background pattern-color="#e0e0e0" :gap="20" /><Controls />
        </VueFlow>
      </div>
    </v-card>

    <!-- MODULAR COMPONENTS -->
    <UnidadFormDialog
      v-model="addDialog"
      :form-data="formData"
      :is-edit-mode="isEditMode"
      :selected-node="selectedNode"
      v-model:form-valid="formValid"
      @confirm="confirmAddItem"
      @add-funcion="({ funcion, baseLegal }) => addFuncion(funcion, baseLegal)"
      @edit-funcion="
        ({ index, funcion, baseLegal }) =>
          updateFuncion(index, funcion, baseLegal)
      "
      @remove-funcion="(index) => removeFuncion(index)"
      @mover-arriba="(index) => moverFuncionArriba(index)"
      @mover-abajo="(index) => moverFuncionAbajo(index)"
    />

    <UnidadDetailsDrawer
      v-if="detailsDrawer"
      v-model="detailsDrawer"
      :detail-data="detailData"
      :loading="loadingDetail"
      :initial-open-panels="initialOpenPanels"
      :get-nivel-nombre="resolveNivel"
      :get-tipo-nombre="resolveTipo"
      :get-relacion-nombre="resolveRelacion"
      :get-clase-nombre="resolveClase"
      @edit="
        (id) => {
          openForm(id, true);
          detailsDrawer.value = false;
        }
      "
      @reporte="(id) => verReporte(id)"
      @pdf="(id) => verReporte(id)"
      @dependencias="
        (id) => {
          detailsDrawer.value = false;
          verDependencias(id);
        }
      "
      @add-child="
        (id) => {
          openForm(id, false);
          detailsDrawer.value = false;
        }
      "
      @delete="
        (id) => {
          selectedNode =
            unidadesList.value.find((u) => String(u.id) === String(id)) ||
            detailData.value;
          deleteDialog = true;
          detailsDrawer.value = false;
        }
      "
    />

    <UnidadDeleteDialog
      v-model="deleteDialog"
      :nombre-unidad="selectedNode?.nombre || selectedNode?.denominacion"
      @confirm="confirmDelete"
    />

    <UnidadDependencyDialog
      v-model="dialog_nodo_chance"
      v-model:unidad-a-cambiar="unidadACambiar"
      v-model:unidad-destino="unidadDestino"
      v-model:razon="unidadRazon"
      :unidades="unidadesList"
      @confirm="cambiarDependencia"
    />

    <v-navigation-drawer
      v-if="hierarchyDrawer"
      v-model="hierarchyDrawer"
      location="right"
      temporary
      disable-resize-watcher
      :width="isMobile ? '100%' : hierarchyDrawerWidth"
    >
      <HierarchyManagerDrawer
        :width="isMobile ? 360 : hierarchyDrawerWidth"
        @close="hierarchyDrawer = false"
        @updated="refreshChart"
        @resize="(val) => (hierarchyDrawerWidth = val)"
      />
    </v-navigation-drawer>
  </v-container>
</template>

<style scoped>
.organigrama-main-container {
  margin-top: -36px !important;
  min-height: calc(100vh - 100px);
  width: 100%;
}
.filter-results-card {
  max-height: 180px;
  overflow-y: auto;
}
.flow-card {
  flex: 1 0 auto;
  width: 100%;
  min-height: 600px;
  height: clamp(580px, 72vh, 900px);
}
.flow-container {
  width: 100%;
  flex: 1 1 auto;
  min-height: 600px;
  height: 100%;
  overflow: hidden;
  background: #f8f9fa;
}
@media (max-width: 960px) {
  .flow-card {
    min-height: 480px;
    height: 520px;
  }
  .flow-container {
    min-height: 480px;
  }
}
.v-theme--dark .flow-container {
  background: #030712 !important;
}
.mobile-organigrama-blocked {
  width: 100%;
  min-height: 480px;
  background: #f8f9fa;
}
.v-theme--dark .mobile-organigrama-blocked {
  background: #030712 !important;
}
:deep(.vue-flow) {
  width: 100%;
  height: 100%;
}
.node-bridge-container {
  width: 320px;
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.bridge-line {
  width: 3px;
  height: 100%;
  background-color: #000000;
}
.v-theme--dark .bridge-line {
  background-color: #e2e8f0;
}
.bridge-line.dashed {
  background-color: transparent;
  border-left: 3px dashed #000000;
  width: 0;
}
.v-theme--dark .bridge-line.dashed {
  border-left: 3px dashed #e2e8f0;
}
.custom-node {
  border-radius: 8px;
  box-shadow: none !important;
  width: 320px;
  height: 225px;
  max-height: 225px;
  position: relative;
  display: flex;
  flex-direction: column;
  border: 2px solid rgba(15, 23, 42, 0.35);
  transition:
    outline 0.15s ease,
    border-color 0.15s ease;
  overflow: hidden;
}
.v-theme--dark .custom-node {
  box-shadow: none !important;
  border: 2px solid rgba(255, 255, 255, 0.4);
}
.custom-node:hover {
  transform: none !important;
  box-shadow: none !important;
  outline: 3px solid #0f172a;
  outline-offset: 1px;
}
.v-theme--dark .custom-node:hover {
  transform: none !important;
  box-shadow: none !important;
  outline: 3px solid #f8fafc;
  outline-offset: 1px;
}
.custom-node.dep-selected-node {
  outline: 3px solid #0072b2 !important;
  outline-offset: 2px;
}
.v-theme--dark .custom-node.dep-selected-node {
  outline: 3px solid #56b4e9 !important;
  outline-offset: 2px;
}
.custom-node.dep-funcional-node {
  border: 3px dashed #ffffff !important;
  outline: 2px solid #d55e00 !important;
}
.v-theme--dark .custom-node.dep-funcional-node {
  border: 3px dashed #ffffff !important;
  outline: 2px solid #d55e00 !important;
}
.custom-node.filter-match-node {
  outline: 2px solid #0072b2 !important;
  outline-offset: 1px;
}
.v-theme--dark .custom-node.filter-match-node {
  outline: 2px solid #56b4e9 !important;
  outline-offset: 1px;
}
.reinforcement-badge-top {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 2px 4px;
  width: 100%;
}
.v-theme--dark .vue-flow__minimap {
  background-color: #0f172a !important;
}
.v-theme--dark .vue-flow__controls {
  background-color: #0f172a !important;
  border: 1px solid #1e293b !important;
}
.v-theme--dark .vue-flow__controls-button {
  background-color: #0f172a !important;
  color: #cbd5e1 !important;
  border-bottom: 1px solid #1e293b !important;
  fill: #cbd5e1 !important;
}
.v-theme--dark .vue-flow__controls-button:hover {
  background-color: #1e293b !important;
}
.faded-node {
  opacity: 0.25;
  filter: grayscale(1);
  transition:
    opacity 0.2s ease,
    filter 0.2s ease;
}
.faded-node:hover {
  opacity: 0.45;
  filter: grayscale(0.7);
}
.non-oficial-faded {
  opacity: 0.4;
  filter: grayscale(1);
  transition:
    opacity 0.2s ease,
    filter 0.2s ease;
}
.non-oficial-faded:hover {
  opacity: 0.65;
  filter: grayscale(0.5);
}
.staff-node {
  border: 3px dashed #0f172a !important;
}
.v-theme--dark .staff-node {
  border: 3px dashed #f8fafc !important;
}
.staff-badge-top,
.non-oficial-badge-top {
  height: 24px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: none !important;
}
.code-badge {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 4px;
  font-weight: 850;
  letter-spacing: 0.5px;
  font-size: 11.5px;
}
.sigla-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 800;
  letter-spacing: 0.5px;
  font-size: 11.5px;
}
.node-content {
  padding: 18px 14px 10px 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex-grow: 1;
  height: 100%;
  cursor: pointer;
  border: none !important;
  overflow: hidden;
}
.node-center {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 2px 0;
  min-height: 0;
}
.node-line {
  line-height: 1.25;
  margin-bottom: 2px;
  border: none !important;
}
.code-line {
  margin-bottom: 3px;
  gap: 4px;
}
.title-line {
  font-weight: 850;
  text-transform: uppercase;
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  width: 100%;
}
.title-line.title-short {
  font-size: 24px;
  line-height: 1.18;
}
.title-line.title-medium {
  font-size: 20px;
  line-height: 1.18;
}
.title-line.title-long {
  font-size: 17.5px;
  line-height: 1.15;
}
.title-line.title-xlong {
  font-size: 15.5px;
  line-height: 1.14;
}
.node-footer {
  flex-shrink: 0;
  padding-right: 36px;
  margin-top: auto;
}
.detail-line {
  font-size: 11.5px;
  font-weight: 650;
  display: flex;
  align-items: center;
  line-height: 1.2;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.node-actions {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  z-index: 10;
}
:deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
  background-color: #000000 !important;
  border: 2px solid #ffffff !important;
}
.v-theme--dark :deep(.vue-flow__handle) {
  background-color: #e2e8f0 !important;
  border: 2px solid #000000 !important;
}
:deep(.vue-flow__handle.vue-flow__handle-top) {
  left: 50% !important;
  transform: translateX(-50%) !important;
}
:deep(.vue-flow__handle.vue-flow__handle-bottom) {
  left: 50% !important;
  transform: translateX(-50%) !important;
}
:deep(.vue-flow__edge-path) {
  fill: none !important;
  stroke: #000000 !important;
  stroke-width: 3px !important;
}
:deep(.vue-flow__arrowhead),
:deep(marker) {
  display: none !important;
}
.v-theme--dark :deep(.vue-flow__edge-path) {
  fill: none !important;
  stroke: #e2e8f0 !important;
  stroke-width: 3px !important;
}
.v-theme--dark :deep(.vue-flow__arrowhead),
.v-theme--dark :deep(marker) {
  display: none !important;
}

.floating-zoom-panel {
  position: absolute;
  bottom: 24px;
  right: 24px;
  z-index: 25;
}

.floating-back-btn {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 25;
}

.flow-container--rotated-90 {
  transform: rotate(90deg);
  transform-origin: center center;
  width: 100vh !important;
  height: 100vw !important;
  margin: auto;
  overflow: hidden;
}

@media print {
  .v-application {
    background: white !important;
  }
  .v-navigation-drawer,
  .v-toolbar,
  .v-snackbar,
  .v-overlay,
  .mb-4,
  .v-divider,
  .gap-2,
  .node-actions,
  .vue-flow__controls,
  .vue-flow__minimap {
    display: none !important;
  }
  .flow-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 9999;
  }
  .custom-node {
    box-shadow: none !important;
    border: 2px solid #0f172a !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

/* Forzar cursor de arrastre (manito) en el lienzo del organigrama */
:deep(.vue-flow__pane) {
  cursor: grab !important;
}
:deep(.vue-flow__pane:active) {
  cursor: grabbing !important;
}
:deep(.vue-flow__node) {
  cursor: pointer !important;
}

.row-hover {
  cursor: pointer;
  transition: background-color 0.15s ease-in-out;
}
.row-hover:hover {
  background-color: rgba(var(--v-theme-primary), 0.08) !important;
}
</style>
