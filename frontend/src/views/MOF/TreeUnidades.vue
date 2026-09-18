<script setup>
import { ref, onMounted, computed, watch, nextTick } from "vue";
import { useAllUnidadesMofStore } from "../../stores/unidades_mof";
import { useAllTiposMofStore } from "@/stores/tipos_mof";
import { useAllNivelesMofStore } from "@/stores/niveles_mof";
import { useAllRelacionesMofStore } from "@/stores/relaciones_mof";
import { useAllCargosMofStore } from "@/stores/cargos_mof";
import { useAllClasesMofStore } from "@/stores/clases_mof";

// Componentes modulares
import UnidadFormDialog from "./unidades/UnidadFormDialog.vue";
import UnidadDeleteDialog from "./unidades/UnidadDeleteDialog.vue";
import UnidadDetailsDrawer from "./unidades/UnidadDetailsDrawer.vue";
import UnidadActionsMenu from "./unidades/UnidadActionsMenu.vue";
import MofReportMenu from "./common/MofReportMenu.vue";
import HighlightedText from "@/components/HighlightedText.vue";
import { exportTreeUnidadesPdf, exportToCsv } from "@/utils/mofReport";

// --- PLUGINS & UTILS ---
import {
  buildHierarchyTree,
  normalizeText,
  filterHierarchyByQuery,
  collectTreeIds,
  findFirstMatchingUnit,
} from "@/utils/mofHelpers";

// --- COMPOSABLES ---
import { useUnidadForm } from "@/composables/useUnidadForm";
import { useUnidadDetails } from "@/composables/useUnidadDetails";
import { useSnackbar } from "@/composables/useSnackbar";
import { useMofResolvers } from "@/composables/useMofResolvers";
import { useUnidadActions } from "@/composables/useUnidadActions";
import { usePrefetchCatalogs } from "@/composables/usePrefetchCatalogs";
import { useAccessibilityStore } from "@/stores/accessibility";
import { useResponsive } from "@/composables/useResponsive";

const accessibilityStore = useAccessibilityStore();
const isColorblind = computed(() => accessibilityStore.colorblindMode);
const { isMobile } = useResponsive();

const { mostrar } = useSnackbar();

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

const {
  detailsDrawer,
  detailData,
  loadingDetail,
  initialOpenPanels,
  showDetails,
  showDependenciasInDrawer,
  verReporte,
} = useUnidadDetails({ unidadesStore });

const addDialog = ref(false);
const selectedItem = ref(null);
const deleteDialog = ref(false);
const itemToDelete = ref(null);
const search = ref("");
const openedIds = ref([]);
/** Unidad cuyo menú de acciones está montado (hover/focus o menú abierto). */
const activeActionsUnitId = ref(null);
const actionsMenuOpen = ref(false);

const expandAll = () => {
  openedIds.value = collectTreeIds(filteredTreeItems.value);
};

const collapseAll = () => {
  openedIds.value = [];
};

onMounted(async () => {
  await Promise.all([
    unidadesStore.getFetchUnidades(),
    prefetchCatalogs(),
  ]);
  if (isMobile.value && filteredTreeItems.value?.length) {
    openedIds.value = collectTreeIds(filteredTreeItems.value);
  }
});

const treeItems = computed(() => buildHierarchyTree(unidadesStore.unidades));

const filteredTreeItems = computed(() =>
  filterHierarchyByQuery(treeItems.value, search.value),
);

const hasSearchQuery = computed(() => Boolean(String(search.value || "").trim()));

watch(
  filteredTreeItems,
  async (nodes) => {
    const q = String(search.value || "").trim();
    if (!q) return;
    openedIds.value = collectTreeIds(nodes);
    await nextTick();
    await nextTick();
    const first = findFirstMatchingUnit(nodes, search.value);
    if (!first?.id) return;
    const el = document.querySelector(
      `[data-tree-unit-id="${CSS.escape(String(first.id))}"]`,
    );
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  },
  { immediate: true },
);

function unitIdOf(item) {
  return (item?.raw || item)?.id;
}

function isActionsVisible(id) {
  return id != null && String(activeActionsUnitId.value) === String(id);
}

let actionsLeaveTimer = null;

function onActionsEnter(id) {
  if (actionsLeaveTimer != null) {
    clearTimeout(actionsLeaveTimer);
    actionsLeaveTimer = null;
  }
  activeActionsUnitId.value = id;
}

function onActionsLeave(id) {
  if (actionsLeaveTimer != null) clearTimeout(actionsLeaveTimer);
  actionsLeaveTimer = setTimeout(() => {
    actionsLeaveTimer = null;
    if (actionsMenuOpen.value) return;
    if (String(activeActionsUnitId.value) === String(id)) {
      activeActionsUnitId.value = null;
    }
  }, 120);
}

function onActionsMenuOpen(id, open) {
  actionsMenuOpen.value = open;
  if (open) {
    if (actionsLeaveTimer != null) {
      clearTimeout(actionsLeaveTimer);
      actionsLeaveTimer = null;
    }
    activeActionsUnitId.value = id;
  } else if (String(activeActionsUnitId.value) === String(id)) {
    activeActionsUnitId.value = null;
  }
}

async function editItem(id) {
  const item = unidadesStore.unidades.find((u) => String(u.id) === String(id));
  selectedItem.value = item;
  await openUnitForm(item, true);
  addDialog.value = true;
}

function deleteItem(id) {
  const item =
    unidadesStore.unidades.find((u) => String(u.id) === String(id)) ||
    detailData.value;
  itemToDelete.value = item;
  deleteDialog.value = true;
}

const { confirmAddItem, confirmDelete } = useUnidadActions({
  unidadesStore,
  saveUnidad,
  onRefresh: () => unidadesStore.getFetchUnidades(),
  addDialog,
  deleteDialog,
  itemToDelete,
});

function openAddDialog(itemOrId) {
  let item = itemOrId;
  if (itemOrId != null && typeof itemOrId !== "object") {
    item = unidadesStore.unidades.find(
      (u) => String(u.id) === String(itemOrId),
    );
  }
  selectedItem.value = item;
  openUnitForm(item, false);
  addDialog.value = true;
}

// --- HELPER WRAPPERS ---
const {
  resolveNivel,
  resolveTipo,
  resolveRelacion,
  resolveClase,
  resolveClaseColor,
  checkOficial,
} = useMofResolvers(clasesStore, nivelesStore, tiposStore, relacionesStore);

const loadingReport = ref(false);

const activeFiltersList = computed(() => {
  const filters = [];
  if (search.value && search.value.trim()) {
    filters.push({ label: "Término de Búsqueda", value: search.value.trim() });
  }
  return filters;
});

function flattenTree(nodes, depth = 0, parentItem = null, result = []) {
  for (const node of nodes) {
    result.push({
      ...node,
      _depth: depth,
      hasChildren: Boolean(node.children && node.children.length > 0),
      parent_codigo: parentItem ? parentItem.codigo : "-",
      parent_nombre: parentItem
        ? parentItem.nombre || parentItem.denominacion
        : "-",
    });
    if (node.children && node.children.length > 0) {
      flattenTree(node.children, depth + 1, node, result);
    }
  }
  return result;
}

const flatTreeList = computed(() => {
  const flat = flattenTree(filteredTreeItems.value);
  if (!search.value || !search.value.trim()) return flat;

  const q = normalizeText(search.value);
  return flat.filter((u) => {
    const name = normalizeText(u.display_name || u.nombre || u.denominacion);
    const code = normalizeText(u.codigo);
    const sigla = normalizeText(u.sigla);
    return name.includes(q) || code.includes(q) || sigla.includes(q);
  });
});

const handleExportPdf = () => {
  try {
    loadingReport.value = true;
    exportTreeUnidadesPdf({
      title: "Estructura Organizacional - Árbol de Unidades",
      flatTreeRows: flatTreeList.value,
      activeFilters: activeFiltersList.value,
      resolveClase,
      resolveNivel,
      resolveClaseColor,
      isOficialCheck: checkOficial,
      isColorblind: isColorblind.value,
    });
  } catch (err) {
    console.error("Error al exportar PDF en TreeUnidades:", err);
  } finally {
    loadingReport.value = false;
  }
};

const handleExportCsv = () => {
  try {
    loadingReport.value = true;
    const columns = [
      { header: "CÓDIGO", key: "codigo" },
      { header: "NIVEL_JERARQUÍA", getter: (u) => u._depth ?? 0 },
      {
        header: "UNIDAD ADMINISTRATIVA",
        getter: (u) => u.display_name || u.nombre || u.denominacion || "",
      },
      { header: "SIGLA", getter: (u) => u.sigla || "-" },
      { header: "CÓDIGO_PADRE", getter: (u) => u.parent_codigo || "-" },
      { header: "UNIDAD_PADRE", getter: (u) => u.parent_nombre || "-" },
      { header: "INSTANCIA / CLASE", getter: (u) => resolveClase(u.clase) || "-" },
      { header: "NIVEL", getter: (u) => resolveNivel(u.nivel) || "-" },
      {
        header: "ESTADO",
        getter: (u) => (checkOficial(u) ? "OFICIAL" : "NO OFICIAL"),
      },
    ];

    exportToCsv({
      filename: "Arbol_Estructura_Unidades_MOF.csv",
      columns,
      rows: flatTreeList.value,
    });
  } catch (err) {
    console.error("Error al exportar CSV en TreeUnidades:", err);
  } finally {
    loadingReport.value = false;
  }
};
</script>

<template>
  <v-container fluid class="pa-0">
    <div class="mb-6">
      <h1 class="text-h4 font-weight-black mb-1 text-slate-800">
        Estructura Organizacional
      </h1>
      <div class="text-body-2 d-flex align-center text-slate-500">
        <v-icon size="18" class="mr-2">mdi-tree</v-icon>
        <span>MOF</span>
        <v-icon size="16" class="mx-1">mdi-chevron-right</v-icon>
        <span class="font-weight-bold text-primary">Árbol de Unidades</span>
      </div>
    </div>

    <v-progress-linear
      v-if="unidadesStore.loading"
      indeterminate
      color="primary"
      class="mb-4"
    />

    <v-card class="rounded-lg border shadow-sm" elevation="0">
      <v-card-title class="pa-4 d-flex align-center flex-wrap gap-2">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Buscar unidad..."
          variant="outlined"
          density="compact"
          hide-details
          class="max-width-300"
          clearable
        ></v-text-field>
        <v-spacer></v-spacer>
        <v-btn
          variant="tonal"
          size="small"
          density="comfortable"
          class="mr-1"
          aria-label="Expandir todos los nodos del árbol"
          @click="expandAll"
        >
          <v-icon start size="16">mdi-arrow-expand-all</v-icon>
          <span class="d-none d-sm-inline">Expandir</span>
        </v-btn>
        <v-btn
          variant="tonal"
          size="small"
          density="comfortable"
          class="mr-2"
          aria-label="Contraer todos los nodos del árbol"
          @click="collapseAll"
        >
          <v-icon start size="16">mdi-arrow-collapse-all</v-icon>
          <span class="d-none d-sm-inline">Contraer</span>
        </v-btn>
        <MofReportMenu
          :loading="loadingReport"
          :has-pdf="true"
          :has-csv="true"
          class="mr-2"
          @export-pdf="handleExportPdf"
          @export-csv="handleExportCsv"
        />
        <v-btn
          v-if="!unidadesStore.unidades.length"
          color="primary"
          prepend-icon="mdi-plus"
          @click="openAddDialog(null)"
        >
          Añadir Raíz
        </v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pa-2">
        <v-treeview
          v-if="filteredTreeItems.length"
          v-model:opened="openedIds"
          :items="filteredTreeItems"
          item-title="display_name"
          item-value="id"
          item-children="children"
          density="comfortable"
          class="simple-tree"
        >
          <template #prepend="{ item }">
            <v-icon
              :color="
                isColorblind
                  ? resolveClaseColor((item?.raw || item).clase)
                  : (item?.raw || item).color ||
                    resolveClaseColor((item?.raw || item).clase)
              "
              size="24"
              class="mr-2 flex-shrink-0"
            >
              {{
                (item?.raw || item).children?.length
                  ? "mdi-sitemap"
                  : "mdi-office-building"
              }}
            </v-icon>
          </template>

          <template #title="{ item }">
            <span
              :data-tree-unit-id="(item?.raw || item).id"
              class="d-inline-block tree-match-row"
            >
              <HighlightedText
                v-if="hasSearchQuery"
                class="text-body-2 font-weight-bold text-slate-800"
                :text="
                  (item?.raw || item).display_name || (item?.raw || item).nombre
                "
                :query="search"
              />
              <span
                v-else
                class="text-body-2 font-weight-bold text-slate-800"
              >
                {{
                  (item?.raw || item).display_name || (item?.raw || item).nombre
                }}
              </span>
            </span>
          </template>

          <template #append="{ item }">
            <div
              class="d-flex align-center tree-actions-slot"
              @click.stop
              @mouseenter="onActionsEnter(unitIdOf(item))"
              @mouseleave="onActionsLeave(unitIdOf(item))"
            >
              <UnidadActionsMenu
                v-if="isActionsVisible(unitIdOf(item))"
                :unidad-id="unitIdOf(item)"
                show-quick-actions
                density="compact"
                @update:menu-open="(open) => onActionsMenuOpen(unitIdOf(item), open)"
                @details="showDetails"
                @pdf="verReporte"
                @dependencias="showDependenciasInDrawer"
                @add-child="openAddDialog"
                @edit="editItem"
                @delete="deleteItem"
              />
            </div>
          </template>
        </v-treeview>

        <div
          v-else-if="!unidadesStore.loading && search && treeItems.length"
          class="text-center py-8"
        >
          <v-icon size="48" color="grey-lighten-2">mdi-magnify-close</v-icon>
          <p class="text-body-1 text-grey mt-2">
            Sin coincidencias para la búsqueda
          </p>
        </div>

        <div v-else-if="!unidadesStore.loading" class="text-center py-8">
          <v-icon size="48" color="grey-lighten-2">mdi-database-off</v-icon>
          <p class="text-body-1 text-grey mt-2">No hay datos para mostrar</p>
        </div>
      </v-card-text>
    </v-card>
  </v-container>

  <UnidadFormDialog
    v-model="addDialog"
    :form-data="formData"
    :is-edit-mode="isEditMode"
    :selected-node="selectedItem"
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

  <UnidadDeleteDialog
    v-model="deleteDialog"
    :nombre-unidad="itemToDelete?.nombre || itemToDelete?.denominacion"
    @confirm="confirmDelete"
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
        editItem(id);
        detailsDrawer = false;
      }
    "
    @reporte="verReporte"
    @pdf="verReporte"
    @dependencias="showDependenciasInDrawer"
    @add-child="
      (id) => {
        openAddDialog(id);
        detailsDrawer = false;
      }
    "
    @delete="
      (id) => {
        deleteItem(id);
        detailsDrawer = false;
      }
    "
  />
</template>

<style scoped>
.max-width-300 {
  max-width: 300px;
}
.simple-tree :deep(.v-treeview-node__root) {
  min-height: 40px;
  border-bottom: 1px solid #f1f5f9;
}
.simple-tree :deep(.v-treeview-node__root:hover) {
  background-color: #f8fafc;
}
.tree-match-row {
  scroll-margin-block: 80px;
}
.tree-actions-slot {
  min-width: 108px;
  min-height: 32px;
  justify-content: flex-end;
}
</style>
