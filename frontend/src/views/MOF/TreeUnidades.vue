<script setup>
import { ref, onMounted, computed } from "vue";
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

// --- PLUGINS & UTILS ---
import {
  getClaseNombre,
  getNivelNombre,
  getTipoNombre,
  getRelacionNombre,
  getClaseColor,
  highlightText,
} from "@/utils/mofHelpers";

// --- COMPOSABLES ---
import { useUnidadForm } from "@/composables/useUnidadForm";
import { useUnidadDetails } from "@/composables/useUnidadDetails";
import { useSnackbar } from "@/composables/useSnackbar";

const { mostrar } = useSnackbar();

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

onMounted(async () => {
  await Promise.all([
    unidadesStore.getFetchUnidades(),
    tiposStore.getFetchTipos(),
    nivelesStore.getFetchNiveles(),
    relacionesStore.getFetchRelaciones(),
    cargosStore.getFetchCargos(),
    clasesStore.getFetchClases(),
  ]);
});

function buildTree(list) {
  const map = {};
  const roots = [];
  list.forEach((item) => {
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
  list.forEach((item) => {
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
}

const treeItems = computed(() => buildTree(unidadesStore.unidades));

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

async function confirmDelete() {
  const id = itemToDelete.value.id;
  const hasChildren = unidadesStore.unidades.some((u) => {
    let pId = null;
    if (u.parent) {
      pId = typeof u.parent === "object" ? u.parent.id : u.parent;
    }
    return String(pId) === String(id);
  });
  if (hasChildren) {
    mostrar("No se puede eliminar: tiene unidades dependientes.", "error");
    deleteDialog.value = false;
    return;
  }
  await unidadesStore.deletePersonalUnidad(id);
  await unidadesStore.deleteUnidad(id);
  if (!unidadesStore.error) {
    mostrar("¡Unidad eliminada!", "success");
    deleteDialog.value = false;
    await unidadesStore.getFetchUnidades();
  } else {
    mostrar("Error: " + unidadesStore.error, "error");
  }
}

async function confirmAddItem() {
  mostrar("Procesando...", "info");
  const result = await saveUnidad();
  if (result.success) {
    addDialog.value = false;
    mostrar("¡Operación realizada con éxito!", "success");
    await unidadesStore.getFetchUnidades();
  } else {
    mostrar("Error: " + result.error, "error");
  }
}

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

const resolveClaseColor = (val) => getClaseColor(val, clasesStore.clases);
const resolveClase = (val) => getClaseNombre(val, clasesStore.clases);
const resolveNivel = (val) => getNivelNombre(val, nivelesStore.niveles);
const resolveTipo = (val) => getTipoNombre(val, tiposStore.tipos);
const resolveRelacion = (val) =>
  getRelacionNombre(val, relacionesStore.relaciones);

const customTreeFilter = (value, query, item) => {
  if (!query) return true;
  const searchNorm = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  const raw = item?.raw || item || {};
  const nameNorm = String(raw.display_name || raw.nombre || raw.denominacion || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const siglaNorm = String(raw.sigla || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const codigoNorm = String(raw.codigo || "").toLowerCase();

  return (
    nameNorm.includes(searchNorm) ||
    siglaNorm.includes(searchNorm) ||
    codigoNorm.includes(searchNorm)
  );
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
          v-if="treeItems.length"
          :items="treeItems"
          :search="search"
          :custom-filter="customTreeFilter"
          item-title="display_name"
          item-value="id"
          item-children="children"
          open-all
          density="comfortable"
          class="simple-tree"
        >
          <template #prepend="{ item }">
            <v-icon
              :color="(item?.raw || item).color || resolveClaseColor((item?.raw || item).clase)"
              size="24"
              class="mr-2 flex-shrink-0"
            >
              {{
                (item?.raw || item).children?.length ? "mdi-sitemap" : "mdi-office-building"
              }}
            </v-icon>
          </template>

          <template #title="{ item }">
            <span
              class="text-body-2 font-weight-bold text-slate-800"
              v-html="highlightText((item?.raw || item).display_name || (item?.raw || item).nombre, search)"
            ></span>
          </template>

          <template #append="{ item }">
            <div class="d-flex align-center" @click.stop>
              <UnidadActionsMenu
                :unidad-id="(item?.raw || item).id"
                show-quick-actions
                density="compact"
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
</style>
