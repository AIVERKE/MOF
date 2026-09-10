<script setup>
import { ref, onMounted, watch, computed, nextTick } from "vue";
import { VueFlow, useVueFlow, Handle } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import dagre from "dagre";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

// --- STORES & API ---
import { ENDPOINTS } from "@/config/api";
import { useAllUnidadesMofStore } from "../../stores/unidades_mof";
import { useAllTiposMofStore } from "@/stores/tipos_mof";
import { useAllNivelesMofStore } from "@/stores/niveles_mof";
import { useAllRelacionesMofStore } from "@/stores/relaciones_mof";
import { useAllCargosMofStore } from "@/stores/cargos_mof";
import { useAllClasesMofStore } from "@/stores/clases_mof";

// --- PLUGINS & UTILS ---
import {
  formatDateForDisplay,
  getPesoReal,
  getSafeId,
  isStaffNode,
  getClaseNombre,
  getNivelNombre,
  getTipoNombre,
  getRelacionNombre,
  getClaseColor,
  highlightText,
  isUnidadOficial,
  normalizeText,
  compareCodigos,
} from "@/utils/mofHelpers";

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

// --- COMPOSABLES ---
import { useUnidadForm } from "@/composables/useUnidadForm";
import { useSnackbar } from "@/composables/useSnackbar";
import { useUnidadDetails } from "@/composables/useUnidadDetails";

// --- VUE FLOW COMPOSABLES ---
const { nodes, edges, setNodes, setEdges, fitView, setCenter, findNode, onNodeClick } = useVueFlow();

const { mostrar } = useSnackbar();

// --- STORES INSTANCES ---
const unidadesStore = useAllUnidadesMofStore();
const tiposStore = useAllTiposMofStore();
const nivelesStore = useAllNivelesMofStore();
const relacionesStore = useAllRelacionesMofStore();
const cargosStore = useAllCargosMofStore();
const clasesStore = useAllClasesMofStore();

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
  showDetails: showNodeDetails,
  verReporte,
} = useUnidadDetails({ unidadesStore });
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
const resolveNivel = (val) => getNivelNombre(val, nivelesStore.niveles);
const resolveTipo = (val) => getTipoNombre(val, tiposStore.tipos);
const resolveRelacion = (val) =>
  getRelacionNombre(val, relacionesStore.relaciones);
const resolveClase = (val) => getClaseNombre(val, clasesStore.clases);
const resolveClaseColor = (val) => getClaseColor(val, clasesStore.clases);

const checkOficial = (u) => isUnidadOficial(u, clasesStore.clases);

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
    const item = nivelesStore.niveles.find((n) => String(n.id) === activeNivelId);
    expectedNivelDesc = item ? item.descripcion.toLowerCase().trim() : "";
  }

  let expectedTipoDesc = "";
  if (activeTipoId) {
    const item = tiposStore.tipos.find((t) => String(t.id) === activeTipoId);
    expectedTipoDesc = item ? normalizeText(item.descripcion) : "";
  }

  let expectedClaseDesc = "";
  if (activeClaseId) {
    const item = clasesStore.clases.find((c) => String(c.id) === activeClaseId);
    expectedClaseDesc = item ? item.descripcion.toLowerCase().trim() : "";
  }

  const isEstricto = vistaModo.value === "estricto";

  return unidadesList.value.filter((u) => {
    // Si estamos en modo organigrama oficial estricto, filtramos
    if (isEstricto && !checkOficial(u)) return false;

    if (searchNorm) {
      const uNombreNorm = normalizeText(u.nombre || u.denominacion);
      const uSiglaNorm = normalizeText(u.sigla);
      const uCodigoNorm = String(u.codigo || "").toLowerCase();
      if (
        !uNombreNorm.includes(searchNorm) &&
        !uSiglaNorm.includes(searchNorm) &&
        !uCodigoNorm.includes(searchNorm)
      ) {
        return false;
      }
    }

    if (activeNivelId) {
      if (expectedNivelDesc !== String(u.nivel || "").toLowerCase().trim()) {
        return false;
      }
    }

    if (activeTipoId) {
      if (expectedTipoDesc !== normalizeText(u.tipo)) {
        return false;
      }
    }

    if (activeClaseId) {
      if (expectedClaseDesc !== String(u.clase || "").toLowerCase().trim()) {
        return false;
      }
    }

    if (activeRelacionId && String(u.relacion) !== activeRelacionId) {
      return false;
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
  if (
    backendResumen &&
    !searchQuery.value &&
    !selectedNivel.value &&
    !selectedTipo.value &&
    !selectedRelacion.value &&
    !selectedClase.value
  ) {
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

  const oficiales = all.filter((u) => checkOficial(u));
  return [
    {
      title: "Total Unidades",
      value: all.length,
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
      value: all.length - oficiales.length,
      icon: "mdi-alert-circle-outline",
      color: "warning",
    },
    {
      title: "Asesoría/Staff",
      value: all.filter((u) => isStaffNode(u, relacionesStore.relaciones))
        .length,
      icon: "mdi-account-tie",
      color: "orange-darken-2",
    },
  ];
});

// --- ESTRUCTURA VISUAL & LAYOUT ---
function getLayoutedElements(nodes, edges) {
  const NODE_WIDTH = 320;
  const NODE_HEIGHT = 210; // Altura fija garantizada para evitar cualquier solapamiento
  const H_GAP = 90; // Separación horizontal generosa entre ramas
  const V_GAP = 140; // Separación vertical generosa tipo mapa conceptual para trazo ortogonal limpio

  // 1. Separar nodos normales de nodos staff (asesoría)
  const staffNodes = nodes.filter((n) => n.data && n.data.isStaff);
  const layoutNodes = nodes.filter((n) => !n.data || !n.data.isStaff);

  const byId = {};
  layoutNodes.forEach((u) => {
    byId[String(u.id)] = u;
  });

  const childrenMap = {};
  layoutNodes.forEach((u) => {
    const pId =
      u.parentId && byId[String(u.parentId)] ? String(u.parentId) : "root";
    if (!childrenMap[pId]) childrenMap[pId] = [];
    childrenMap[pId].push(u);
  });

  const LADO_RANK = {
    IZQUIERDA: 1,
    CENTRO: 2,
    AUTOMATICO: 3,
    DERECHA: 4,
  };

  // Ordenar hermanos considerando primero su "lado" de preferencia y luego su código numérico
  Object.keys(childrenMap).forEach((pId) => {
    childrenMap[pId].sort((a, b) => {
      const rankA = LADO_RANK[a.data?.lado] || 3;
      const rankB = LADO_RANK[b.data?.lado] || 3;
      if (rankA !== rankB) return rankA - rankB;
      return compareCodigos(a, b);
    });
  });

  const positions = {};
  const widthMemo = new Map();

  // Función recursiva memoizada para calcular el ancho total necesario para cualquier subárbol
  function getSubtreeWidth(nodeId) {
    if (widthMemo.has(nodeId)) return widthMemo.get(nodeId);
    const children = childrenMap[nodeId] || [];
    let width;
    if (children.length === 0) {
      width = NODE_WIDTH;
    } else {
      const totalW =
        children.reduce(
          (sum, c) => sum + getSubtreeWidth(String(c.id)) + H_GAP,
          0,
        ) - H_GAP;
      width = Math.max(NODE_WIDTH, totalW);
    }
    widthMemo.set(nodeId, width);
    return width;
  }

  // Función recursiva para posicionar cualquier subárbol sin colisiones
  function layoutSubtree(nodeId, startX, startY) {
    const children = childrenMap[nodeId] || [];
    if (children.length === 0) {
      positions[nodeId] = { x: startX, y: startY };
      return;
    }

    let curX = startX;
    const childCenters = [];
    children.forEach((c) => {
      const w = getSubtreeWidth(String(c.id));
      layoutSubtree(String(c.id), curX, startY + NODE_HEIGHT + V_GAP);
      childCenters.push(positions[String(c.id)].x + NODE_WIDTH / 2);
      curX += w + H_GAP;
    });

    const parentCenterX =
      (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
    positions[nodeId] = { x: parentCenterX - NODE_WIDTH / 2, y: startY };
  }

  // Comprobar si hay unidades marcadas como troncales
  // Nodos con esTroncal === true pertenecen al Eje Central Institucional
  const trunkNodes = layoutNodes
    .filter((n) => n.data?.esTroncal === true)
    .sort(compareCodigos);

  const hasInstitutionalSpine = trunkNodes.length >= 2;

  if (hasInstitutionalSpine) {
    // =========================================================================
    // 🏛️ LAYOUT INSTITUCIONAL DINÁMICO POR PISOS (EJE TRONCAL Y ALAS SIMÉTRICAS)
    // =========================================================================
    const TRUNK_X = 0; // El Eje Central de Gobierno se alinea en X = 0

    // Conjunto de IDs troncales para filtrado O(1)
    const trunkIds = new Set(trunkNodes.map((n) => String(n.id)));

    // Identificar raíces troncales (nodos troncales cuyo padre no es otro nodo troncal)
    const trunkRoots = trunkNodes.filter(
      (n) => !n.parentId || !trunkIds.has(String(n.parentId)),
    );
    trunkRoots.sort(compareCodigos);

    // Recorrer la cadena del tronco en orden jerárquico topológico
    const orderedTrunk = [];
    function traverseTrunk(node) {
      orderedTrunk.push(node);
      const trunkChildren = (childrenMap[String(node.id)] || [])
        .filter((c) => trunkIds.has(String(c.id)))
        .sort(compareCodigos);
      trunkChildren.forEach(traverseTrunk);
    }
    trunkRoots.forEach(traverseTrunk);

    // Por seguridad, si algún nodo troncal quedó fuera (árboles desconectados), agregarlo
    trunkNodes.forEach((n) => {
      if (!orderedTrunk.some((o) => String(o.id) === String(n.id))) {
        orderedTrunk.push(n);
      }
    });

    // Procesar cada nodo del tronco en pisos sucesivos
    let curTrunkY = 50;

    orderedTrunk.forEach((tNode) => {
      const tId = String(tNode.id);

      // 1. Posicionar el nodo troncal actual en el eje central
      positions[tId] = { x: TRUNK_X, y: curTrunkY };
      const T_Y = curTrunkY;

      // 2. Obtener hijos NO troncales (dependencias y alas del piso)
      const nonTrunkChildren = (childrenMap[tId] || []).filter(
        (c) => !trunkIds.has(String(c.id)),
      );

      if (nonTrunkChildren.length > 0) {
        const left = nonTrunkChildren.filter((c) => c.data?.lado === "IZQUIERDA");
        const right = nonTrunkChildren.filter((c) => c.data?.lado === "DERECHA");
        const center = nonTrunkChildren.filter((c) => c.data?.lado === "CENTRO");
        const auto = nonTrunkChildren.filter(
          (c) =>
            c.data?.lado !== "IZQUIERDA" &&
            c.data?.lado !== "DERECHA" &&
            c.data?.lado !== "CENTRO",
        );

        // Repartir automáticos balanceando dinámicamente las alas
        auto.forEach((c) => {
          if (left.length <= right.length) left.push(c);
          else right.push(c);
        });

        const wingsStartY = T_Y + NODE_HEIGHT + V_GAP;

        // Ala Izquierda: se expande hacia X negativo alejándose del eje central
        let curLeftX = TRUNK_X - H_GAP;
        left.forEach((c) => {
          const w = getSubtreeWidth(String(c.id));
          curLeftX -= w;
          layoutSubtree(String(c.id), curLeftX, wingsStartY);
          curLeftX -= H_GAP;
        });

        // Ala Derecha: se expande hacia X positivo alejándose del eje central
        let curRightX = TRUNK_X + NODE_WIDTH + H_GAP;
        right.forEach((c) => {
          const w = getSubtreeWidth(String(c.id));
          layoutSubtree(String(c.id), curRightX, wingsStartY);
          curRightX += w + H_GAP;
        });

        // Nodos dependientes centrales no troncales (en el pasillo central)
        let curCenterY = wingsStartY;
        center.forEach((c) => {
          layoutSubtree(String(c.id), TRUNK_X, curCenterY);
          curCenterY += NODE_HEIGHT + V_GAP;
        });
      }

      // 3. Calcular el nivel Y más bajo alcanzado hasta ahora por todas las unidades posicionadas
      let maxCurrentY = T_Y;
      Object.keys(positions).forEach((id) => {
        if (positions[id].y > maxCurrentY) maxCurrentY = positions[id].y;
      });

      // El siguiente piso troncal arrancará DEBAJO de todo lo generado por este piso y sus alas
      curTrunkY = maxCurrentY + NODE_HEIGHT + V_GAP;
    });

    // 4. Posicionar cualquier nodo que no esté conectado al tronco (ej: raíces secundarias)
    const unpositionedRoots = layoutNodes.filter(
      (n) => !positions[String(n.id)] && (!n.parentId || !byId[String(n.parentId)]),
    );
    if (unpositionedRoots.length > 0) {
      let maxPlacedX = TRUNK_X + NODE_WIDTH;
      Object.keys(positions).forEach((id) => {
        if (positions[id].x > maxPlacedX) maxPlacedX = positions[id].x;
      });
      let startExtraX = maxPlacedX + H_GAP * 2;
      unpositionedRoots.forEach((r) => {
        layoutSubtree(String(r.id), startExtraX, 50);
        startExtraX += getSubtreeWidth(String(r.id)) + H_GAP * 2;
      });
    }
  } else {
    // =========================================================================
    // 🌳 ÁRBOL JERÁRQUICO SIMÉTRICO ESTÁNDAR (PARA FILTROS Y BÚSQUEDAS)
    // =========================================================================
    const rootNodes = childrenMap["root"] || [];
    let startX = 50;
    rootNodes.forEach((r) => {
      layoutSubtree(String(r.id), startX, 50);
      startX += getSubtreeWidth(String(r.id)) + H_GAP * 2;
    });
  }

  // Asignar posiciones calculadas a todos los nodos normales
  layoutNodes.forEach((node) => {
    if (positions[String(node.id)]) {
      node.position = { ...positions[String(node.id)] };
    } else {
      node.position = { x: 50, y: 50 };
    }
  });

  // 6. Posicionar nodos Staff (Asesoría) a los lados de sus padres
  const staffByParent = {};
  staffNodes.forEach((node) => {
    const pId = String(node.parentId || "root");
    if (!staffByParent[pId]) staffByParent[pId] = [];
    staffByParent[pId].push(node);
  });

  Object.keys(staffByParent).forEach((parentId) => {
    const parentNode = layoutNodes.find(
      (n) => String(n.id) === String(parentId),
    );
    const parentStaffs = staffByParent[parentId];
    if (parentNode && parentNode.position) {
      parentStaffs.forEach((staffNode, index) => {
        const side =
          staffNode.data?.staffSide || (index % 2 === 0 ? "right" : "left");
        const multiplier = side === "right" ? 1 : -1;
        const indexInSide = Math.floor(index / 2);

        staffNode.position = {
          x: parentNode.position.x + multiplier * (NODE_WIDTH + 80),
          y: parentNode.position.y + indexInSide * (NODE_HEIGHT + 40),
        };
      });
    } else {
      parentStaffs.forEach((staffNode) => {
        staffNode.position = { x: 50, y: 50 };
      });
    }
  });

  return { nodes, edges };
}

// --- METHODS ---
async function refreshChart() {
  console.log(">>> REFRESCO DE TABLAS INICIADO");
  await Promise.all([
    unidadesStore.getFetchUnidades(),
    clasesStore.getFetchClases(),
  ]);
  console.log(">>> REFRESCO DE TABLAS FINALIZADO");
  updateGraph();
}

async function openForm(nodeId = null, edit = false) {
  const node = nodeId
    ? unidadesByIdMap.value.get(String(nodeId))
    : null;
  selectedNode.value = node;
  await openUnitForm(node, edit);
  addDialog.value = true;
}

function openDeleteDialog(nodeId) {
  selectedNode.value = nodeId
    ? unidadesByIdMap.value.get(String(nodeId))
    : null;
  deleteDialog.value = true;
}

async function confirmAddItem() {
  mostrar("Procesando...", "info");
  const result = await saveUnidad();
  if (result.success) {
    addDialog.value = false;
    mostrar("¡Operación exitosa!", "success");
    refreshChart();
  } else {
    mostrar("Error: " + result.error, "error");
  }
}

async function confirmDelete() {
  if (!selectedNode.value) return;
  const id = selectedNode.value.id;
  if (unidadesList.value.some((u) => String(u.parent) === String(id))) {
    mostrar("No se puede eliminar: tiene dependientes.", "error");
    return;
  }
  await unidadesStore.deletePersonalUnidad(id);
  await unidadesStore.deleteUnidad(id);
  if (!unidadesStore.error) {
    deleteDialog.value = false;
    mostrar("¡Eliminado!", "success");
    refreshChart();
  } else {
    mostrar("Error: " + unidadesStore.error, "error");
  }
}

async function cambiarDependencia() {
  await unidadesStore.updateNodo(unidadACambiar.value, {
    parentId: parseInt(unidadDestino.value) || null,
    razon: unidadRazon.value,
  });
  if (!unidadesStore.error) {
    dialog_nodo_chance.value = false;
    mostrar("¡Cambiado!", "success");
    refreshChart();
  } else {
    mostrar("Error: " + unidadesStore.error, "error");
  }
}

async function exportarOrganigrama() {
  mostrar("Generando PDF institucional en alta resolución...", "info");

  // 1. AJUSTE DE CÁMARA
  await fitView({ padding: 0.1, includeHiddenNodes: false });
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const container = document.querySelector(".vue-flow");
  if (!container) throw new Error("No se detectó el lienzo");

  // --- LIMPIEZA QUIRÚRGICA DEL SVG ---
  const svgElement = container.querySelector("svg");
  if (svgElement) {
    const defs = svgElement.querySelectorAll("defs, marker");
    defs.forEach((d) => d.remove());
  }

  const paths = container.querySelectorAll("path");
  paths.forEach((path) => {
    path.setAttribute("fill", "none");
    path.style.fill = "none";
    path.removeAttribute("marker-end");
    path.removeAttribute("marker-start");
    path.style.strokeLinejoin = "round";
    path.style.strokeLinecap = "round";
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-linecap", "round");
  });

  const styleTag = document.createElement("style");
  styleTag.innerHTML = `
    .vue-flow__edge-path {
      fill: none !important;
      stroke: #444444 !important;
      stroke-width: 2px !important;
      stroke-linejoin: round !important;
      stroke-linecap: round !important;
      stroke-miterlimit: 1 !important;
    }
    .vue-flow__arrowhead, .vue-flow__handle, .vue-flow__edge-text, marker, defs,
    .vue-flow__controls, .vue-flow__minimap, .vue-flow__background, .node-actions, .v-btn, .v-icon:not(.mr-2) {
      display: none !important;
    }
    .custom-node {
      box-shadow: none !important;
      border: 3px solid var(--node-color) !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .title-line, .detail-line, .code-line {
      color: #000000 !important;
      text-shadow: none !important;
      font-weight: bold !important;
    }
  `;

  try {
    document.head.appendChild(styleTag);

    // 2. CAPTURA
    const dataUrl = await toPng(container, {
      backgroundColor: "#ffffff",
      quality: 1,
      pixelRatio: 3,
      cacheBust: true,
      filter: (node) => {
        const exclusion = [
          "vue-flow__arrowhead",
          "vue-flow__handle",
          "vue-flow__controls",
          "vue-flow__minimap",
        ];
        return !exclusion.some((cls) => node.classList?.contains(cls));
      },
    });

    // 3. CREAR PDF (A3 Horizontal)
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a3",
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;

    pdf.setFillColor(248, 249, 250);
    pdf.rect(0, 0, pageWidth, 35, "F");
    pdf.setDrawColor(220, 220, 220);
    pdf.line(0, 35, pageWidth, 35);

    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(22);
    pdf.setFont("helvetica", "bold");
    pdf.text("MANUAL DE ORGANIZACIONES Y FUNCIONES", margin, 18);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100);
    pdf.text("Universidad Mayor de San Andrés", margin, 26);
    pdf.text("Estructura Organizativa Oficial", margin, 31);

    const img = new Image();
    img.src = dataUrl;
    await new Promise((r) => (img.onload = r));

    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - 65;
    const ratio = Math.min(
      availableWidth / img.width,
      availableHeight / img.height,
    );
    const finalW = img.width * ratio;
    const finalH = img.height * ratio;

    pdf.addImage(
      dataUrl,
      "PNG",
      (pageWidth - finalW) / 2,
      45,
      finalW,
      finalH,
      undefined,
      "FAST",
    );

    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      "Sistema SMAU-MOF - Documento de carácter oficial - Página 1 de 1",
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" },
    );

    pdf.save(`Organigrama_UMSA_${new Date().getTime()}.pdf`);
    mostrar("¡PDF generado correctamente!", "success");
  } catch (error) {
    mostrar("Error al exportar: " + error.message, "error");
  } finally {
    if (document.head.contains(styleTag)) document.head.removeChild(styleTag);
    setTimeout(() => fitView({ padding: 0.1 }), 200);
  }
}

async function verDependencias(id) {
  try {
    const node = unidadesList.value.find(
      (u) => String(u.id) === String(id),
    );
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
  let key = `${modo}:${sourceData.length}:`;
  for (let i = 0; i < sourceData.length; i++) {
    const u = sourceData[i];
    const pId = u.parent && typeof u.parent === "object" ? u.parent.id : u.parent;
    key += `${u.id}-${pId}-${u.lado || "A"}-${u.es_troncal || u.esTroncal ? 1 : 0};`;
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
}) {
  let isNodeNonOficialInOficialView = false;
  if (vistaModo.value === "analitico" && !oficialStatus) {
    isNodeNonOficialInOficialView = true;
  }

  let finalColor = u.color || (isStaff ? "#FF9800" : "#1976D2");

  if (isDepMode) {
    const uIdStr = String(u.id);
    if (uIdStr === selectedDepId) finalColor = "#14B34C";
    else if (depsIdsSet.has(uIdStr)) finalColor = "#C62828";
    else finalColor = "#E0E0E0";
  } else if (isNodeNonOficialInOficialView) {
    finalColor = "#9E9E9E"; // Gris claro para no oficiales en vista analítica
  } else if (hasAnyFilter.value) {
    if (!isMatch) {
      finalColor = "#E0E0E0";
    } else {
      if (activesCount > 1) finalColor = "#4CAF50";
      else if (searchActive) finalColor = "#FFD700";
      else if (activeNivelId) finalColor = "#AA00FF";
      else if (activeTipoId) finalColor = "#00B8D4";
      else if (activeClaseId) finalColor = "#FF5722";
      else if (activeRelacionId) {
        finalColor = u.color || (isStaff ? "#FF9800" : "#E91E63");
      }
    }
  }

  return { finalColor, isNodeNonOficialInOficialView };
}

const updateGraph = () => {
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
  const searchLower = (searchTerm.value || "").toLowerCase().trim();
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

      const { finalColor, isNodeNonOficialInOficialView } = computeNodeVisuals({
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
      });

      node.data.color = finalColor;
      node.data.isMatch = isMatch;
      node.data.isNonOficialInOficialView = isNodeNonOficialInOficialView;
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

    const { finalColor, isNodeNonOficialInOficialView } = computeNodeVisuals({
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
        isOficial: oficialStatus,
        esTroncal: u.es_troncal === true || u.esTroncal === true,
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
          stroke: "#94a3b8",
          strokeWidth: 2.5,
          strokeDasharray: n.data && n.data.isStaff ? "5 5" : "none",
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

/**
 * Vuela animadamente la cámara hacia uno o varios nodos (estilo Google Maps).
 * - 1 match: Centra el nodo con zoom ~1.25x y animación suave (800ms).
 * - N matches: Encuadra conjuntamente todos los nodos coincidentes con padding 0.2 (800ms).
 * - 0 matches o vacío: Restaura el encuadre general del organigrama con fitView (800ms).
 *
 * @param {Array<string|number>} ids - Lista de IDs de nodos a enfocar
 */
const volarANodos = async (ids = []) => {
  if (!ids || ids.length === 0) {
    await fitView({ padding: 0.1, duration: 800 });
    return;
  }

  const strIds = ids.map((id) => String(id));

  if (strIds.length === 1) {
    const targetId = strIds[0];
    let node = findNode ? findNode(targetId) : null;
    if (!node && nodes.value) {
      node = nodes.value.find((n) => String(n.id) === targetId);
    }

    if (node && node.position) {
      const nodeWidth = node.dimensions?.width || 320;
      const nodeHeight = node.dimensions?.height || 240;
      const centerX = node.position.x + nodeWidth / 2;
      const centerY = node.position.y + nodeHeight / 2;

      await setCenter(centerX, centerY, { duration: 800, zoom: 1.25 });
      return;
    }

    // Fallback a fitView enfocado en el nodo individual
    await fitView({ nodes: [targetId], duration: 800, padding: 0.2 });
  } else {
    // Encuadre conjunto para múltiples resultados
    await fitView({ nodes: strIds, duration: 800, padding: 0.2 });
  }
};

// --- EVENTS ---
onMounted(async () => {
  if (typeof window !== "undefined" && window.innerWidth <= 960) {
    activePanels.value = null; // Colapsar filtros en móviles para ahorrar espacio vertical
  }
  await Promise.all([
    unidadesStore.getFetchUnidades(),
    unidadesStore.getDashboardStats(),
    tiposStore.getFetchTipos(),
    nivelesStore.getFetchNiveles(),
    relacionesStore.getFetchRelaciones(),
    cargosStore.getFetchCargos(),
    clasesStore.getFetchClases(),
  ]);
  const fetchError =
    unidadesStore.error ||
    tiposStore.error ||
    nivelesStore.error ||
    relacionesStore.error;
  if (fetchError) {
    mostrar(fetchError, "error");
  }
  updateGraph();
});

onNodeClick(({ node }) => {
  if (node.data.isInvisible) return;
  showNodeDetails(node.id);
});

// Watcher inmediato para búsqueda, filtros categóricos y cambios estructurales (sin debounce ni timers)
watch(
  [
    () => unidadesList.value,
    () => clasesStore.clases,
    vistaModo,
    hasAnyFilter,
    filterNivel,
    filterTipo,
    filterInstancia,
    filterRelacion,
    searchTerm,
  ],
  () => {
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
    :class="[
      'organigrama-main-container pt-0 px-6 pb-0 d-flex flex-column',
      $vuetify.display.smAndDown
        ? 'h-auto overflow-y-auto'
        : 'h-screen-custom overflow-hidden',
    ]"
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
        <v-expansion-panel elevation="2" class="rounded-lg">
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
                    class="d-flex gap-1 justify-end flex-wrap mt-2 mt-md-0"
                  >
                    <v-btn
                      prepend-icon="mdi-file-export"
                      color="deep-purple-darken-1"
                      variant="flat"
                      size="small"
                      @click="exportarOrganigrama"
                    >
                      PDF
                      <v-tooltip activator="parent" location="top"
                        >Exportar organigrama actual a PDF (A3)</v-tooltip
                      >
                    </v-btn>
                    <v-btn
                      prepend-icon="mdi-format-list-numbered"
                      color="info"
                      variant="flat"
                      size="small"
                      @click="hierarchyDrawer = true"
                    >
                      Jerarquías
                      <v-tooltip activator="parent" location="top"
                        >Gestionar catálogos y pesos jerárquicos</v-tooltip
                      >
                    </v-btn>
                    <v-btn
                      prepend-icon="mdi-filter-off"
                      variant="tonal"
                      color="grey-darken-1"
                      size="small"
                      @click="resetFilters"
                    >
                      Limpiar
                      <v-tooltip activator="parent" location="top"
                        >Restablecer todos los filtros de búsqueda</v-tooltip
                      >
                    </v-btn>
                    <v-btn
                      prepend-icon="mdi-swap-horizontal"
                      color="secondary"
                      variant="elevated"
                      size="small"
                      @click="dialog_nodo_chance = true"
                    >
                      Dependencia
                      <v-tooltip activator="parent" location="top"
                        >Cambiar la unidad superior (Padre) de un
                        nodo</v-tooltip
                      >
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <!-- LEYENDA DINÁMICA -->
      <v-expand-transition>
        <div v-if="hasAnyFilter || mostrarDependencias" class="mb-2">
          <v-card variant="tonal" class="rounded-lg border-dashed border-sm">
            <v-card-text class="py-2 px-4 d-flex align-center flex-wrap gap-4">
              <span
                class="text-caption font-weight-bold text-uppercase text-grey-darken-2"
                >Guía de Colores:</span
              >

              <!-- Modo Dependencias -->
              <template v-if="mostrarDependencias">
                <div class="d-flex align-center">
                  <v-avatar size="12" color="#14B34C" class="mr-2"></v-avatar>
                  <span class="text-caption">Unidad Seleccionada</span>
                </div>
                <div class="d-flex align-center">
                  <v-avatar size="12" color="#C62828" class="mr-2"></v-avatar>
                  <span class="text-caption">Dependencia Funcional</span>
                </div>
              </template>

              <!-- Filtros Activos -->
              <template v-else>
                <div
                  v-if="
                    [
                      filterNivel,
                      filterTipo,
                      filterInstancia,
                      filterRelacion,
                      searchTerm,
                    ].filter((x) => x).length > 1
                  "
                  class="d-flex align-center"
                >
                  <v-avatar size="12" color="#4CAF50" class="mr-2"></v-avatar>
                  <span class="text-caption font-weight-bold"
                    >Coincidencia Múltiple</span
                  >
                </div>
                <div v-if="searchTerm" class="d-flex align-center">
                  <v-avatar size="12" color="#FFD700" class="mr-2"></v-avatar>
                  <span class="text-caption">Coincidencia por nombre</span>
                </div>
                <div v-if="filterNivel" class="d-flex align-center">
                  <v-avatar size="12" color="#AA00FF" class="mr-2"></v-avatar>
                  <span class="text-caption">Filtrado por Nivel</span>
                </div>
                <div v-if="filterTipo" class="d-flex align-center">
                  <v-avatar size="12" color="#00B8D4" class="mr-2"></v-avatar>
                  <span class="text-caption">Filtrado por Tipo</span>
                </div>
                <div v-if="filterInstancia" class="d-flex align-center">
                  <v-avatar size="12" color="#FF5722" class="mr-2"></v-avatar>
                  <span class="text-caption">Filtrado por Instancia</span>
                </div>
                <div v-if="filterRelacion" class="d-flex align-center">
                  <v-avatar size="12" color="#E91E63" class="mr-2"></v-avatar>
                  <span class="text-caption">Filtrado por Relación</span>
                </div>
              </template>

              <div class="d-flex align-center">
                <v-avatar size="12" color="#E0E0E0" class="mr-2"></v-avatar>
                <span class="text-caption">Sin coincidencias</span>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </v-expand-transition>
    </div>

    <!-- RESULTS TABLE -->
    <div v-if="hasAnyFilter" class="flex-none mb-1 px-1">
      <v-card
        elevation="3"
        class="rounded-lg border-primary border-t-2"
        style="max-height: 200px; overflow-y: auto"
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
                      backgroundColor:
                        u.color || getClaseColor(u.clase, clasesStore.clases),
                      height: '32px',
                      width: '4px',
                    }"
                    class="mr-2"
                  ></div>
                  <span class="text-slate-800">{{ u.codigo }}</span>
                </div>
              </td>

              <td class="text-caption">
                <div
                  class="font-weight-bold"
                  v-html="highlightText(u.nombre || u.denominacion, searchTerm)"
                ></div>
                <div v-if="u.color" class="text-xxs text-grey-darken-1">
                  <v-icon size="10">mdi-palette</v-icon> Personalizado
                </div>
              </td>

              <td class="text-center" @click.stop>
                <UnidadActionsMenu
                  :unidad-id="u.id"
                  show-quick-actions
                  density="compact"
                  @details="showNodeDetails"
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
      class="flex-grow-1 rounded-lg overflow-hidden border mb-0 position-relative d-flex flex-column"
    >
      <v-progress-linear
        v-if="unidadesStore.loading"
        indeterminate
        color="primary"
      />
      <div class="flow-container">
        <VueFlow
          :nodes="nodes"
          :edges="edges"
          fit-view-on-init
          :default-edge-options="{ type: 'smoothstep', data: { borderRadius: 0 } }"
          :min-zoom="0.05"
          :max-zoom="4"
        >
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
              :class="{
                'staff-node': data.isStaff,
                'faded-node':
                  (hasAnyFilter || mostrarDependencias) && !data.isMatch,
                'non-oficial-faded': data.isNonOficialInOficialView,
              }"
              :style="{
                borderColor:
                  (hasAnyFilter || mostrarDependencias) && !data.isMatch
                    ? '#E0E0E0'
                    : data.isNonOficialInOficialView
                      ? '#BDBDBD'
                      : data.color,
                '--node-color': data.color,
                background: data.isNonOficialInOficialView
                  ? '#f5f5f5'
                  : (hasAnyFilter || mostrarDependencias) && !data.isMatch
                    ? '#ffffff'
                    : data.isStaff
                      ? `color-mix(in srgb, ${data.color} 8%, #FFFFFF)`
                      : `color-mix(in srgb, ${data.color} 15%, #FFFFFF)`,
                borderLeft: `10px solid ${(hasAnyFilter || mostrarDependencias) && !data.isMatch ? '#E0E0E0' : data.isNonOficialInOficialView ? '#9E9E9E' : data.color}`,
              }"
            >
              <div
                v-if="data.isStaff"
                class="staff-badge-top"
                :style="{ backgroundColor: data.color }"
              >
                <v-icon size="14" color="white" class="mr-1"
                  >mdi-account-tie-outline</v-icon
                ><span>STAFF</span>
              </div>
              <div
                v-else
                class="node-top-accent"
                :style="{ backgroundColor: data.color }"
              ></div>
              <div class="node-content" @click="showNodeDetails(id)">
                <div class="node-line code-line">
                  <span>{{ data.codigo }}</span>
                </div>
                <div class="node-line title-line">
                  {{ data.nombre }}
                </div>
                <div class="node-line detail-line" v-if="data.sigla && data.sigla !== '-'">
                  <v-icon size="16" class="mr-2" :style="{ color: data.color }"
                    >mdi-identifier</v-icon
                  ><span>SIGLA: {{ data.sigla }}</span>
                </div>
                <div class="node-line detail-line">
                  <v-icon size="16" class="mr-2" :style="{ color: data.color }"
                    >mdi-layers-outline</v-icon
                  >{{ data.nivel }}
                </div>
                <div class="node-line detail-line">
                  <v-icon size="16" class="mr-2" :style="{ color: data.color }"
                    >mdi-tag-outline</v-icon
                  >{{ data.tipo }}
                </div>
                <v-tooltip activator="parent" location="top"
                  >Ver detalles de {{ data.nombre }}</v-tooltip
                >
              </div>
              <div class="node-actions pa-1 d-flex justify-end" @click.stop>
                <UnidadActionsMenu
                  :unidad-id="id"
                  :show-quick-actions="false"
                  density="node"
                  @details="showNodeDetails"
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
                :style="{ background: data.color }"
              />
              <Handle
                v-else-if="data.isStaff && data.staffSide === 'left'"
                id="target-right"
                type="target"
                position="right"
                :style="{ background: data.color }"
              />
              <Handle
                v-else
                id="target-top"
                type="target"
                position="top"
                :style="{ background: data.color }"
              />
              <Handle
                id="source-bottom"
                type="source"
                position="bottom"
                :style="{ background: data.color }"
              />
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
          detailsDrawer = false;
        }
      "
      @reporte="(id) => verReporte(id)"
      @pdf="(id) => verReporte(id)"
      @dependencias="
        (id) => {
          detailsDrawer = false;
          verDependencias(id);
        }
      "
      @add-child="
        (id) => {
          openForm(id, false);
          detailsDrawer = false;
        }
      "
      @delete="
        (id) => {
          selectedNode =
            unidadesList.value.find((u) => String(u.id) === String(id)) ||
            detailData.value;
          deleteDialog = true;
          detailsDrawer = false;
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
      v-model="hierarchyDrawer"
      location="right"
      temporary
      :width="$vuetify.display.xs ? '100%' : hierarchyDrawerWidth"
    >
      <HierarchyManagerDrawer
        :width="$vuetify.display.xs ? 360 : hierarchyDrawerWidth"
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
}
.h-screen-custom {
  height: calc(100vh - 120px) !important;
  max-height: calc(100vh - 120px) !important;
}
.flow-container {
  width: 100%;
  flex-grow: 1;
  min-height: 500px;
  background: #f8f9fa;
}
.v-theme--dark .flow-container {
  background: #030712 !important;
}
.node-bridge-container {
  width: 320px;
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.bridge-line {
  width: 2.5px;
  height: 100%;
  background-color: #bbb;
}
.v-theme--dark .bridge-line {
  background-color: #475569;
}
.bridge-line.dashed {
  background-color: transparent;
  border-left: 2.5px dashed #bbb;
  width: 0;
}
.v-theme--dark .bridge-line.dashed {
  border-left: 2.5px dashed #475569;
}
.custom-node {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  width: 320px;
  height: 210px;
  max-height: 210px;
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.25s ease;
  overflow: hidden;
}
.v-theme--dark .custom-node {
  /* Mantenemos el fondo de la tarjeta claro y opaco */
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.custom-node:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 30px var(--node-color);
}
.v-theme--dark .custom-node:hover {
  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.8),
    0 0 15px var(--node-color);
}
/* Removemos las sobreescrituras de textos claros (.code-line, .title-line, .detail-line) */
/* para que el texto permanezca oscuro y legible sobre el fondo claro del nodo */
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
}
.non-oficial-faded {
  opacity: 0.4;
  filter: grayscale(1);
  background-color: #f5f5f5 !important;
}
.staff-node {
  border-style: dashed !important;
  border-width: 2.5px !important;
}
.node-top-accent {
  height: 10px;
  width: 100%;
  border: none !important;
}
.staff-badge-top {
  height: 32px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  border: none !important;
}
.node-content {
  padding: 12px 16px 36px 16px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  flex-grow: 1;
  cursor: pointer;
  text-align: left;
  border: none !important;
  overflow: hidden;
}
.node-line {
  line-height: 1.35;
  margin-bottom: 4px;
  border: none !important;
}
.code-line {
  font-size: 13px;
  font-weight: 800;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}
.title-line {
  font-weight: 850;
  font-size: 15px;
  color: #0f172a;
  text-transform: uppercase;
  margin-bottom: 8px;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
}
.detail-line {
  font-size: 13px;
  color: #334155;
  font-weight: 600;
  display: flex;
  align-items: center;
  line-height: 1.3;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.node-actions {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  z-index: 10;
}
:deep(.vue-flow__handle) {
  width: 12px;
  height: 12px;
  border: 2px solid white;
}
:deep(.vue-flow__handle.vue-flow__handle-top) {
  left: 50% !important;
  transform: translateX(-50%) !important;
}
:deep(.vue-flow__handle.vue-flow__handle-bottom) {
  left: 50% !important;
  transform: translateX(-50%) !important;
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
    border: 2px solid #ccc !important;
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
