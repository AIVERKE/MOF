<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAllUnidadesMofStore } from '../../stores/unidades_mof'
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
import { exportListarUnidadesPdf, exportToCsv } from "@/utils/mofReport";

// --- PLUGINS & UTILS ---
import {
  getContrastingTextColor,
  highlightText,
  normalizeText,
} from "@/utils/mofHelpers";

// --- COMPOSABLES ---
import { useUnidadForm } from "@/composables/useUnidadForm";
import { useUnidadDetails } from "@/composables/useUnidadDetails";
import { useSnackbar } from "@/composables/useSnackbar";
import { useMofResolvers } from "@/composables/useMofResolvers";
import { useUnidadActions } from "@/composables/useUnidadActions";
import { usePrefetchCatalogs } from "@/composables/usePrefetchCatalogs";

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

const { mostrar } = useSnackbar();

// --- FORM COMPOSABLE ---
const unitForm = useUnidadForm({
  unidadesStore,
  cargosStore,
  clasesStore,
  nivelesStore,
  tiposStore,
  relacionesStore
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
  moverFuncionAbajo
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

// Estados para diálogos y UI
const search = ref('')
const addDialog = ref(false)
const deleteDialog = ref(false)
const selectedNode = ref(null)

const headers = [
  { title: 'CÓDIGO', key: 'codigo', align: 'start', sortable: true },
  { title: 'UNIDAD ADMINISTRATIVA', key: 'display_name', align: 'start', sortable: true },
  { title: 'JERARQUÍA / CLASE', key: 'clase', align: 'start', sortable: true },
  { title: 'NIVEL', key: 'nivel', align: 'start', sortable: true },
  { title: 'ESTADO', key: 'oficial', align: 'center', sortable: true },
  { title: 'ACCIONES', key: 'actions', align: 'center', sortable: false },
]

const vistaModo = ref('analitico')

const filteredUnidades = computed(() => {
  let list = unidadesStore.unidades;

  // Filtro Estructural para Modo Estricto
  if (vistaModo.value === 'estricto') {
    list = list.filter(u => checkOficial(u));
  }

  if (search.value) {
    const q = normalizeText(search.value);
    list = list.filter(u => 
      normalizeText(u.nombre || u.denominacion).includes(q) ||
      normalizeText(u.codigo).includes(q) ||
      normalizeText(u.sigla).includes(q)
    );
  }

  return list.map(u => ({
    ...u,
    display_name: u.denominacion || u.nombre,
    clase: u.clase || u.tipo_unidad || u.tipoUnidad
  }));
});

// --- HELPER WRAPPERS ---
const {
  resolveNivel,
  resolveTipo,
  resolveRelacion,
  resolveClase,
  resolveClaseColor,
  checkOficial,
} = useMofResolvers(clasesStore, nivelesStore, tiposStore, relacionesStore);

const getFadedClass = (item) => {
  if (vistaModo.value === 'analitico' && !checkOficial(item)) {
    return 'opacity-60 grayscale';
  }
  return '';
};

const loadingReport = ref(false);

const activeFiltersList = computed(() => {
  const modoLabels = {
    integral: "INTEGRAL (TODAS)",
    analitico: "ANALÍTICA",
    estricto: "OFICIAL ESTRICTO",
  };
  const filters = [
    { label: "Modo de Vista", value: modoLabels[vistaModo.value] || vistaModo.value.toUpperCase() },
  ];
  if (search.value && search.value.trim()) {
    filters.push({ label: "Término de Búsqueda", value: search.value.trim() });
  }
  return filters;
});

const handleExportPdf = () => {
  try {
    loadingReport.value = true;
    exportListarUnidadesPdf({
      title: "Listado de Unidades Administrativas",
      unidades: filteredUnidades.value,
      activeFilters: activeFiltersList.value,
      resolveClase,
      resolveNivel,
      resolveClaseColor,
      isOficialCheck: checkOficial,
    });
  } catch (err) {
    console.error("Error al exportar PDF en ListarUnidades:", err);
  } finally {
    loadingReport.value = false;
  }
};

const handleExportCsv = () => {
  try {
    loadingReport.value = true;
    const columns = [
      { header: "CÓDIGO", key: "codigo" },
      { header: "UNIDAD ADMINISTRATIVA", getter: (u) => u.display_name || u.nombre || u.denominacion || "" },
      { header: "SIGLA", getter: (u) => u.sigla || "-" },
      { header: "JERARQUÍA / CLASE", getter: (u) => resolveClase(u.clase) || "-" },
      { header: "NIVEL", getter: (u) => resolveNivel(u.nivel) || "-" },
      { header: "TIPO", getter: (u) => resolveTipo(u.tipo) || "-" },
      { header: "RELACIÓN", getter: (u) => resolveRelacion(u.relacion) || "-" },
      { header: "ESTADO", getter: (u) => (checkOficial(u) ? "OFICIAL" : "NO OFICIAL") },
    ];

    exportToCsv({
      filename: `Listado_Unidades_${vistaModo.value}.csv`,
      columns,
      rows: filteredUnidades.value,
    });
  } catch (err) {
    console.error("Error al exportar CSV en ListarUnidades:", err);
  } finally {
    loadingReport.value = false;
  }
};

onMounted(async () => {
  await Promise.all([
    unidadesStore.getFetchUnidades(),
    prefetchCatalogs(),
  ]);
});

async function openForm(nodeId = null, edit = false) {
  const node = nodeId ? unidadesStore.unidades.find(u => String(u.id) === String(nodeId)) : null;
  selectedNode.value = node;
  await openUnitForm(node, edit);
  addDialog.value = true;
}

function deleteItem(id) {
  const item = unidadesStore.unidades.find((u) => String(u.id) === String(id));
  selectedNode.value = item || detailData.value;
  deleteDialog.value = true;
}

const { confirmAddItem, confirmDelete } = useUnidadActions({
  unidadesStore,
  saveUnidad,
  onRefresh: () => unidadesStore.getFetchUnidades(),
  addDialog,
  deleteDialog,
  selectedNode,
});
</script>

<template>
  <v-container fluid class="pa-0">
    <!-- Header & Breadcrumb -->
    <div class="mb-6">
      <h1 class="text-h4 font-weight-black mb-1 text-slate-800">Listado de Unidades</h1>
      <div class="text-body-2 d-flex align-center text-slate-500">
        <v-icon size="18" class="mr-2">mdi-office-building</v-icon>
        <span>MOF</span>
        <v-icon size="16" class="mx-1">mdi-chevron-right</v-icon>
        <span class="font-weight-bold text-primary">Unidades UMSA</span>
      </div>
    </div>

    <v-progress-linear v-if="unidadesStore.loading" indeterminate color="primary" class="mb-4 rounded-pill" height="6" />

    <v-card class="rounded-xl border-0 shadow-sm" elevation="3">
      <v-card-title class="pa-5 d-flex align-center flex-wrap gap-4">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Filtrar por código o nombre..."
          variant="outlined"
          density="compact"
          hide-details
          class="max-width-400"
          clearable
          autocomplete="off"
        ></v-text-field>
        
        <v-spacer></v-spacer>

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
            OFICIAL ESTRICTO
          </v-btn>
        </v-btn-toggle>

        <MofReportMenu
          :loading="loadingReport"
          :has-pdf="true"
          :has-csv="true"
          class="mr-2"
          @export-pdf="handleExportPdf"
          @export-csv="handleExportCsv"
        />
        
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          class="rounded-lg font-weight-bold"
          @click="openForm(null, false)"
        >
          Nueva Unidad
          <v-tooltip activator="parent" location="top">Registrar una nueva unidad administrativa</v-tooltip>
        </v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <v-data-table
        :headers="headers"
        :items="filteredUnidades"
        :search="search"
        hover
        density="comfortable"
        class="bg-transparent"
      >
        <!-- Custom Row Rendering for Fading -->
        <template v-slot:item="{ item }">
          <tr :class="getFadedClass(item)">
            <!-- Custom Slot: Código -->
            <td class="text-start">
              <div class="d-flex align-center">
                <div :style="{ backgroundColor: item.color || resolveClaseColor(item.clase), height: '24px', width: '4px' }" class="mr-2 rounded-pill"></div>
                <span class="font-weight-black text-caption text-slate-800">
                  {{ item.codigo }}
                </span>
              </div>
            </td>

            <!-- Custom Slot: Nombre -->
            <td class="text-start">
              <div class="py-2">
                <div class="text-body-2 font-weight-bold text-slate-800 d-flex align-center gap-1">
                  <span v-html="highlightText(item.display_name, search)"></span>
                  <v-chip v-if="item.sigla" size="x-small" label variant="outlined" color="primary" class="font-weight-black ml-1 text-xxs">
                    {{ item.sigla }}
                  </v-chip>
                </div>
                <div class="text-xxs text-grey-darken-1 text-uppercase">{{ item.tipo }}</div>
              </div>
            </td>

            <!-- Custom Slot: Clase -->
            <td class="text-start">
              <v-chip 
                size="x-small" 
                label 
                class="font-weight-bold" 
                :style="{ backgroundColor: resolveClaseColor(item.clase), color: getContrastingTextColor(resolveClaseColor(item.clase)) }"
              >
                {{ resolveClase(item.clase) }}
              </v-chip>
            </td>

            <!-- Custom Slot: Nivel -->
            <td class="text-start">
              <v-chip size="x-small" label variant="tonal" color="indigo-darken-2" class="font-weight-bold chip-nivel">
                {{ resolveNivel(item.nivel) }}
              </v-chip>
            </td>

            <!-- Custom Slot: Estado -->
            <td class="text-center">
              <div class="d-flex align-center justify-center">
                <span :class="checkOficial(item) ? 'text-success font-weight-bold' : 'text-grey'" style="font-size: 11px;">
                  {{ checkOficial(item) ? 'OFICIAL' : 'NO OFICIAL' }}
                </span>
              </div>
            </td>

            <!-- Custom Slot: Acciones [👁][📄][⋮] -->
            <td class="text-center" @click.stop>
              <UnidadActionsMenu
                :unidad-id="item.id"
                show-quick-actions
                density="compact"
                @details="showDetails"
                @pdf="verReporte"
                @dependencias="showDependenciasInDrawer"
                @add-child="(id) => openForm(id, false)"
                @edit="(id) => openForm(id, true)"
                @delete="deleteItem"
              />
            </td>
          </tr>
        </template>
      </v-data-table>
    </v-card>

    <!-- COMPONENTES MODULARES -->
    <UnidadFormDialog
      v-model="addDialog" :form-data="formData" :is-edit-mode="isEditMode" :selected-node="selectedNode" v-model:form-valid="formValid"
      @confirm="confirmAddItem" @add-funcion="({ funcion, baseLegal }) => addFuncion(funcion, baseLegal)"
      @edit-funcion="({ index, funcion, baseLegal }) => updateFuncion(index, funcion, baseLegal)" @remove-funcion="(index) => removeFuncion(index)"
      @mover-arriba="(index) => moverFuncionArriba(index)" @mover-abajo="(index) => moverFuncionAbajo(index)"
    />

    <UnidadDeleteDialog v-model="deleteDialog" :nombre-unidad="selectedNode?.nombre || selectedNode?.denominacion" @confirm="confirmDelete" />

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
      @reporte="verReporte"
      @pdf="verReporte"
      @dependencias="showDependenciasInDrawer"
      @add-child="
        (id) => {
          openForm(id, false);
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
  </v-container>
</template>

<style scoped>
.max-width-400 { max-width: 400px; }
.shadow-sm { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05) !important; }
.text-xxs { font-size: 10px; font-weight: 700; }
</style>
