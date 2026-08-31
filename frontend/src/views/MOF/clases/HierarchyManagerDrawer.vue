<script setup>
import { useAllClasesMofStore } from "@/stores/clases_mof";
import { useAllNivelesMofStore } from "@/stores/niveles_mof";
import { useAllTiposMofStore } from "@/stores/tipos_mof";
import { useAllRelacionesMofStore } from "@/stores/relaciones_mof";
import { useAllCargosMofStore } from "@/stores/cargos_mof";
import { useAllUnidadesMofStore } from "@/stores/unidades_mof";
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import { swatches, getUsedColors } from "@/utils/mofHelpers";
import { useSnackbar } from "@/composables/useSnackbar";

const clasesStore = useAllClasesMofStore();
const nivelesStore = useAllNivelesMofStore();
const tiposStore = useAllTiposMofStore();
const relacionesStore = useAllRelacionesMofStore();
const cargosStore = useAllCargosMofStore();
const unidadesStore = useAllUnidadesMofStore();

const { mostrar } = useSnackbar();

const emit = defineEmits(['close', 'updated', 'resize']);

const props = defineProps({
  width: { type: Number, default: 400 }
});

// --- ESTADO DE UI ---
const tab = ref(0);
const loading = ref(false);
const dialog = ref(false);
const editingItem = ref(null);

// Diálogo de confirmación de borrado
const deleteConfirmDialog = ref(false);
const itemToDelete = ref(null);

// Colores usados en el sistema
const usedColors = computed(() => getUsedColors(unidadesStore.unidades, clasesStore.clases));

// Formulario Genérico
const form = ref({
  descripcion: "",
  activo: true,
  oficial: true,
  color: "#1976D2",
  parentId: null
});

const colorMenu = ref(false);

const refreshData = async () => {
  loading.value = true;
  await Promise.all([
    clasesStore.getFetchClases(),
    nivelesStore.getFetchNiveles(),
    tiposStore.getFetchTipos(),
    relacionesStore.getFetchRelaciones(),
    cargosStore.getFetchCargos()
  ]);
  loading.value = false;
};

onMounted(async () => {
  await refreshData();
});

watch(tab, () => {
  dialog.value = false;
  editingItem.value = null;
});

/** Descendientes de un cargo (ids), para evitar ciclos en el selector de padre. */
function getCargoDescendantIds(cargoId) {
  const idStr = String(cargoId);
  const result = new Set();
  const walk = (pid) => {
    cargosStore.cargos.forEach((c) => {
      if (c.parentId != null && String(c.parentId) === String(pid) && !result.has(String(c.id))) {
        result.add(String(c.id));
        walk(c.id);
      }
    });
  };
  walk(idStr);
  return result;
}

function getActiveCargoChildren(cargoId) {
  return cargosStore.cargos.filter(
    (c) =>
      c.parentId != null &&
      String(c.parentId) === String(cargoId) &&
      (c.activo === true || c.activo === 1 || String(c.activo) === "true")
  );
}

/** Lista indentada de cargos (raíces → hijos). */
const cargosTree = computed(() => {
  const items = cargosStore.cargos || [];
  const byParent = new Map();
  items.forEach((c) => {
    const key = c.parentId == null ? "root" : String(c.parentId);
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(c);
  });
  byParent.forEach((arr) =>
    arr.sort((a, b) => String(a.descripcion || a.nombre || "").localeCompare(String(b.descripcion || b.nombre || "")))
  );

  const flat = [];
  const visit = (parentKey, depth) => {
    const children = byParent.get(parentKey) || [];
    children.forEach((c) => {
      flat.push({ ...c, _depth: depth });
      visit(String(c.id), depth + 1);
    });
  };
  visit("root", 0);

  // Cargos huérfanos (padre inexistente / soft-deleted) al final
  const placed = new Set(flat.map((c) => String(c.id)));
  items.forEach((c) => {
    if (!placed.has(String(c.id))) flat.push({ ...c, _depth: 0 });
  });
  return flat;
});

const parentCargoOptions = computed(() => {
  const exclude = editingItem.value
    ? new Set([String(editingItem.value.id), ...getCargoDescendantIds(editingItem.value.id)])
    : new Set();
  return (cargosStore.cargos || [])
    .filter((c) => !exclude.has(String(c.id)))
    .map((c) => ({
      title: c.descripcion || c.nombre,
      value: Number(c.id)
    }));
});

const tabLabel = computed(() => {
  if (tab.value === 0) return "Instancia";
  if (tab.value === 1) return "Nivel";
  if (tab.value === 2) return "Tipo";
  if (tab.value === 3) return "Relación";
  if (tab.value === 4) return "Cargo";
  return "Ítem";
});

// --- LÓGICA DE DIÁLOGOS ---
function openDialog(item = null) {
  editingItem.value = item;
  if (item) {
    form.value = { 
      descripcion: item.descripcion || item.nombre || "", 
      activo: item.activo === true || item.activo === 1 || String(item.activo) === 'true',
      oficial: item.oficial === true || item.oficial === 1 || String(item.oficial) === 'true',
      color: item.color || "#1976D2",
      parentId: item.parentId != null ? Number(item.parentId) : null
    };
  } else {
    form.value = { 
      descripcion: "", 
      activo: true, 
      oficial: true, 
      color: "#1976D2",
      parentId: null
    };
  }
  dialog.value = true;
}

async function handleSave() {
  if (!form.value.descripcion.trim()) return;
  
  // VALIDACIÓN PREVENTIVA GLOBAL: No permitir desactivar si está en uso
  if (editingItem.value && form.value.activo === false) {
    let vinculados = [];
    const descLower = String(editingItem.value.descripcion || "").trim().toLowerCase();
    const idStr = String(editingItem.value.id);

    if (tab.value === 0) { // Clases
      vinculados = unidadesStore.unidades.filter(u => {
        const val = u.clase && typeof u.clase === 'object' ? u.clase.id : u.clase;
        return String(val) === idStr || String(u.clase).trim().toLowerCase() === descLower;
      });
    } else if (tab.value === 1) { // Niveles
      vinculados = unidadesStore.unidades.filter(u => 
        String(u.nivel).trim().toLowerCase() === descLower || String(u.nivel) === idStr
      );
    } else if (tab.value === 2) { // Tipos
      vinculados = unidadesStore.unidades.filter(u => 
        String(u.tipo).trim().toLowerCase() === descLower || String(u.tipo) === idStr
      );
    } else if (tab.value === 3) { // Relaciones
      vinculados = unidadesStore.unidades.filter(u => String(u.relacion) === idStr);
    } else if (tab.value === 4) { // Cargos: hijos activos
      const hijos = getActiveCargoChildren(editingItem.value.id);
      if (hijos.length > 0) {
        mostrar(`Error: No se puede desactivar este cargo porque tiene ${hijos.length} hijo(s) activo(s).`, 'error');
        return;
      }
    }

    if (vinculados.length > 0) {
      const tipoLabel = tab.value === 0 ? 'clase' : tab.value === 1 ? 'nivel' : tab.value === 2 ? 'tipo' : 'relación';
      mostrar(`Error: No se puede desactivar este ${tipoLabel} porque está siendo usado por ${vinculados.length} unidades.`, 'error');
      return;
    }
  }

  loading.value = true;
  let success = false;
  let storeRef = null;

  try {
    if (tab.value === 0) storeRef = clasesStore;
    else if (tab.value === 1) storeRef = nivelesStore;
    else if (tab.value === 2) storeRef = tiposStore;
    else if (tab.value === 3) storeRef = relacionesStore;
    else if (tab.value === 4) storeRef = cargosStore;

    if (tab.value === 0) {
      success = editingItem.value 
        ? await clasesStore.updateClase(editingItem.value.id, form.value.descripcion, form.value.color, form.value.activo, form.value.oficial)
        : await clasesStore.createClase(form.value.descripcion, form.value.color, form.value.activo, form.value.oficial);
    } else if (tab.value === 1) {
      success = editingItem.value
        ? await nivelesStore.updateNivel(editingItem.value.id, form.value.descripcion, form.value.activo)
        : await nivelesStore.createNivel(form.value.descripcion, form.value.activo);
    } else if (tab.value === 2) {
      success = editingItem.value
        ? await tiposStore.updateTipo(editingItem.value.id, form.value.descripcion, form.value.activo)
        : await tiposStore.createTipo(form.value.descripcion, form.value.activo);
    } else if (tab.value === 3) {
      success = editingItem.value
        ? await relacionesStore.updateRelacion(editingItem.value.id, form.value.descripcion, form.value.activo)
        : await relacionesStore.createRelacion(form.value.descripcion, form.value.activo);
    } else if (tab.value === 4) {
      const newParentId = form.value.parentId == null || form.value.parentId === "" ? null : Number(form.value.parentId);
      if (editingItem.value) {
        success = await cargosStore.updateCargo(editingItem.value.id, form.value.descripcion, form.value.activo);
        if (success) {
          const prevParent = editingItem.value.parentId != null ? Number(editingItem.value.parentId) : null;
          if (prevParent !== newParentId) {
            success = await cargosStore.setParentCargo(editingItem.value.id, newParentId);
          }
        }
      } else {
        success = await cargosStore.createCargo(form.value.descripcion, form.value.activo, newParentId);
      }
    }

    if (success) {
      dialog.value = false;
      mostrar("Operación exitosa", "success");
      await refreshData(); // Forzamos refresco local
      emit('updated');
    } else {
      mostrar(storeRef?.error || "Error en la operación", "error");
    }
  } finally {
    loading.value = false;
  }
}

function openDeleteConfirm(item) {
  if (tab.value === 4) {
    const hijos = getActiveCargoChildren(item.id);
    if (hijos.length > 0) {
      mostrar(`Error: No se puede eliminar este cargo porque tiene ${hijos.length} hijo(s) activo(s).`, 'error');
      return;
    }
  }
  itemToDelete.value = item;
  deleteConfirmDialog.value = true;
}

async function confirmDelete() {
  if (!itemToDelete.value) return;
  const id = itemToDelete.value.id;
  
  loading.value = true;
  let success = false;
  let storeRef = null;

  try {
    if (tab.value === 0) { storeRef = clasesStore; success = await clasesStore.deleteClase(id); }
    else if (tab.value === 1) { storeRef = nivelesStore; success = await nivelesStore.deleteNivel(id); }
    else if (tab.value === 2) { storeRef = tiposStore; success = await tiposStore.deleteTipo(id); }
    else if (tab.value === 3) { storeRef = relacionesStore; success = await relacionesStore.deleteRelacion(id); }
    else if (tab.value === 4) { storeRef = cargosStore; success = await cargosStore.deleteCargo(id); }

    if (success) {
      mostrar("Eliminado permanentemente", "success");
      deleteConfirmDialog.value = false;
      itemToDelete.value = null;
      emit('updated');
    } else {
      mostrar(storeRef?.error || "No se pudo eliminar: verifique si existen dependencias vinculadas.", "error");
    }
  } finally {
    loading.value = false;
  }
}

async function handleSubir(id) {
  await clasesStore.subirClase(id);
  emit('updated');
}

async function handleBajar(id) {
  await clasesStore.bajarClase(id);
  emit('updated');
}

// --- Lógica de Redimensionamiento (Mouse) ---
const isResizing = ref(false);
const startResizing = () => {
  isResizing.value = true;
  document.addEventListener("mousemove", resize);
  document.addEventListener("mouseup", stopResizing);
  document.body.style.cursor = "col-resize";
};
const resize = (e) => {
  if (isResizing.value) {
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 350 && newWidth < 900) emit('resize', newWidth);
  }
};
const stopResizing = () => {
  isResizing.value = false;
  document.removeEventListener("mousemove", resize);
  document.removeEventListener("mouseup", stopResizing);
  document.body.style.cursor = "default";
};

// --- Soporte Táctil (Móviles / Tablets) ---
const startResizingTouch = () => {
  isResizing.value = true;
  document.addEventListener("touchmove", resizeTouch);
  document.addEventListener("touchend", stopResizingTouch);
};
const resizeTouch = (e) => {
  if (isResizing.value && e.touches.length > 0) {
    const newWidth = window.innerWidth - e.touches[0].clientX;
    if (newWidth > 350 && newWidth < 900) emit('resize', newWidth);
  }
};
const stopResizingTouch = () => {
  isResizing.value = false;
  document.removeEventListener("touchmove", resizeTouch);
  document.removeEventListener("touchend", stopResizingTouch);
};

onUnmounted(() => {
  stopResizing();
  stopResizingTouch();
});

const getDependencies = (item) => {
  if (!item) return [];
  const queryId = String(item.id).trim();
  const queryText = String(item.descripcion || "").trim().toUpperCase();

  return unidadesStore.unidades.filter(u => {
    let uField = null;
    if (tab.value === 0) uField = u.clase;
    else if (tab.value === 1) uField = u.nivel;
    else if (tab.value === 2) uField = u.tipo;
    else if (tab.value === 3) uField = u.relacion;

    if (!uField) return false;
    if (typeof uField === "object") {
      const uFieldId = String(uField.id ?? uField.value ?? "").trim();
      const uFieldDesc = String(uField.descripcion || uField.description || "").trim().toUpperCase();
      return uFieldId === queryId || uFieldDesc === queryText;
    }
    const uFieldStr = String(uField).trim();
    return uFieldStr === queryId || uFieldStr.toUpperCase() === queryText;
  });
};
</script>

<template>
  <v-card flat class="fill-height d-flex flex-column resizable-container">
    <div class="resize-handle" @mousedown="startResizing" @touchstart="startResizingTouch"></div>

    <v-toolbar color="secondary" dark density="compact">
      <v-toolbar-title class="text-subtitle-1 font-weight-bold">
        Gestión de Catálogos MOF
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn v-if="!$vuetify.display.xs" icon @click="emit('resize', props.width > 500 ? 450 : 850)">
        <v-icon>{{ props.width > 500 ? 'mdi-arrow-collapse-right' : 'mdi-arrow-expand-left' }}</v-icon>
        <v-tooltip activator="parent" location="bottom">{{ props.width > 500 ? 'Restaurar' : 'Expandir' }}</v-tooltip>
      </v-btn>
      <v-btn icon @click="$emit('close')">
        <v-icon>mdi-close</v-icon>
        <v-tooltip activator="parent" location="bottom">Cerrar este panel</v-tooltip>
      </v-btn>
    </v-toolbar>

    <v-tabs v-model="tab" color="primary" show-arrows>
      <v-tab :value="0">
        <v-badge color="grey" :content="clasesStore.clases.length" inline>
          <v-icon start>mdi-office-building</v-icon> Instancias
        </v-badge>
      </v-tab>
      <v-tab :value="1">
        <v-badge color="grey" :content="nivelesStore.niveles.length" inline>
          <v-icon start>mdi-format-list-numbered</v-icon> Nivel
        </v-badge>
      </v-tab>
      <v-tab :value="2">
        <v-badge color="grey" :content="tiposStore.tipos.length" inline>
          <v-icon start>mdi-tag</v-icon> Tipo
        </v-badge>
      </v-tab>
      <v-tab :value="3">
        <v-badge color="grey" :content="relacionesStore.relaciones.length" inline>
          <v-icon start>mdi-transit-connection-variant</v-icon> Relación
        </v-badge>
      </v-tab>
      <v-tab :value="4">
        <v-badge color="grey" :content="cargosStore.cargos.length" inline>
          <v-icon start>mdi-badge-account-horizontal</v-icon> Cargos
        </v-badge>
      </v-tab>
    </v-tabs>

    <v-progress-linear v-if="loading" indeterminate color="primary"></v-progress-linear>

    <v-window v-model="tab" class="flex-grow-1 overflow-hidden" :transition="false" :reverse-transition="false">
      
      <!-- TAB 0: INSTANCIAS -->
      <v-window-item :value="0">
        <div class="fill-height d-flex flex-column">
          <div class="flex-shrink-0">
            <v-alert type="info" variant="tonal" density="compact" class="mx-3 my-2 text-caption">
              Define la jerarquía visual del organigrama. ({{ clasesStore.clases.length }} ítems)
            </v-alert>
            <div class="px-3 mb-2">
              <v-btn block color="primary" prepend-icon="mdi-plus" size="small" @click="openDialog()">
                Añadir Instancia
                <v-tooltip activator="parent" location="top">Crear nueva instancia</v-tooltip>
              </v-btn>
            </div>
          </div>
          <v-list class="flex-grow-1 overflow-y-auto px-2 pb-16">
            <v-list-item v-for="(item, index) in clasesStore.clases" :key="item.id" 
              class="mb-2 rounded-lg border"
              :class="{ 'inactive-item': !item.activo }"
              :style="{ borderLeft: `6px solid ${item.color || '#ccc'}` }">
              <template v-slot:prepend>
                <div class="d-flex flex-column align-center mr-2">
                  <span class="text-caption font-weight-bold text-grey">{{ index + 1 }}</span>
                </div>
              </template>
              <v-list-item-title class="font-weight-bold text-body-2 d-flex align-center flex-wrap" :class="{ 'text-grey': !item.activo }">
                <span>{{ item.descripcion }}</span>
                <span v-if="item.oficial" class="text-success font-weight-black ml-1" style="font-size: 8px;">OFICIAL</span>
                <span v-if="!item.activo" class="text-caption font-italic ml-1">(Inactivo)</span>
                
                <v-chip v-if="getDependencies(item).length > 0" size="x-small" color="primary" variant="tonal" class="ml-2 px-1">
                  {{ getDependencies(item).length }} {{ getDependencies(item).length === 1 ? 'unidad' : 'unidades' }}
                  <v-tooltip activator="parent" location="top" class="custom-tooltip">
                    <div class="text-caption font-weight-bold mb-1">Unidades vinculadas:</div>
                    <div style="max-height: 200px; overflow-y: auto;" class="text-caption">
                      <div v-for="u in getDependencies(item)" :key="u.id" class="mb-1">
                        • {{ u.nombre || u.denominacion }} ({{ u.codigo }})
                      </div>
                    </div>
                  </v-tooltip>
                </v-chip>
                <v-chip v-else size="x-small" color="grey-darken-1" variant="outlined" class="ml-2 px-1 text-xxs">
                  Sin uso activo
                </v-chip>
              </v-list-item-title>
              <template v-slot:append>
                <div class="d-flex align-center">
                  <div class="d-flex flex-column mr-1">
                    <v-btn icon variant="text" size="x-small" :disabled="index === 0" @click="handleSubir(item.id)">
                      <v-icon>mdi-chevron-up</v-icon>
                      <v-tooltip activator="parent" location="left">Subir nivel jerárquico</v-tooltip>
                    </v-btn>
                    <v-btn icon variant="text" size="x-small" :disabled="index === clasesStore.clases.length - 1" @click="handleBajar(item.id)">
                      <v-icon>mdi-chevron-down</v-icon>
                      <v-tooltip activator="parent" location="left">Bajar nivel jerárquico</v-tooltip>
                    </v-btn>
                  </div>
                  <v-btn icon variant="text" size="small" color="orange" @click="openDialog(item)">
                    <v-icon>mdi-pencil</v-icon>
                    <v-tooltip activator="parent" location="top">Editar información</v-tooltip>
                  </v-btn>
                  <v-btn icon variant="text" size="small" color="red" @click="openDeleteConfirm(item)">
                    <v-icon>mdi-delete</v-icon>
                    <v-tooltip activator="parent" location="top">Eliminar permanentemente</v-tooltip>
                  </v-btn>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-window-item>

      <!-- TAB 1: NIVELES -->
      <v-window-item :value="1">
        <div class="fill-height d-flex flex-column">
          <div class="flex-shrink-0">
            <v-alert type="info" variant="tonal" density="compact" class="mx-3 my-2 text-caption">Administre los Niveles Jerárquicos. ({{ nivelesStore.niveles.length }} ítems)</v-alert>
            <div class="px-3 mb-2">
              <v-btn block color="primary" prepend-icon="mdi-plus" size="small" @click="openDialog()">
                Añadir Nivel
                <v-tooltip activator="parent" location="top">Crear nuevo nivel descriptivo</v-tooltip>
              </v-btn>
            </div>
          </div>
          <v-list class="flex-grow-1 overflow-y-auto px-2 pb-16">
            <v-list-item v-for="item in nivelesStore.niveles" :key="item.id" 
              class="mb-2 rounded-lg border"
              :class="{ 'inactive-item': !item.activo }">
              <v-list-item-title class="font-weight-bold text-body-2 d-flex align-center flex-wrap" :class="{ 'text-grey': !item.activo }">
                <span>{{ item.descripcion }}</span>
                <span v-if="item.oficial" class="text-success font-weight-black ml-1" style="font-size: 8px;">OFICIAL</span>
                <span v-if="!item.activo" class="text-caption font-italic ml-1">(Inactivo)</span>
                
                <v-chip v-if="getDependencies(item).length > 0" size="x-small" color="primary" variant="tonal" class="ml-2 px-1">
                  {{ getDependencies(item).length }} {{ getDependencies(item).length === 1 ? 'unidad' : 'unidades' }}
                  <v-tooltip activator="parent" location="top" class="custom-tooltip">
                    <div class="text-caption font-weight-bold mb-1">Unidades vinculadas:</div>
                    <div style="max-height: 200px; overflow-y: auto;" class="text-caption">
                      <div v-for="u in getDependencies(item)" :key="u.id" class="mb-1">
                        • {{ u.nombre || u.denominacion }} ({{ u.codigo }})
                      </div>
                    </div>
                  </v-tooltip>
                </v-chip>
                <v-chip v-else size="x-small" color="grey-darken-1" variant="outlined" class="ml-2 px-1 text-xxs">
                  Sin uso activo
                </v-chip>
              </v-list-item-title>
              <template v-slot:append>
                <v-btn icon variant="text" size="small" color="orange" @click="openDialog(item)">
                  <v-icon>mdi-pencil</v-icon>
                  <v-tooltip activator="parent" location="top">Editar nivel</v-tooltip>
                </v-btn>
                <v-btn icon variant="text" size="small" color="red" @click="openDeleteConfirm(item)">
                  <v-icon>mdi-delete</v-icon>
                  <v-tooltip activator="parent" location="top">Eliminar nivel</v-tooltip>
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-window-item>

      <!-- TAB 2: TIPOS -->
      <v-window-item :value="2">
        <div class="fill-height d-flex flex-column">
          <div class="flex-shrink-0">
            <v-alert type="info" variant="tonal" density="compact" class="mx-3 my-2 text-caption">Administre los Tipos de Unidad. ({{ tiposStore.tipos.length }} ítems)</v-alert>
            <div class="px-3 mb-2">
              <v-btn block color="primary" prepend-icon="mdi-plus" size="small" @click="openDialog()">
                Añadir Tipo
                <v-tooltip activator="parent" location="top">Crear nuevo tipo de unidad</v-tooltip>
              </v-btn>
            </div>
          </div>
          <v-list class="flex-grow-1 overflow-y-auto px-2 pb-16">
            <v-list-item v-for="item in tiposStore.tipos" :key="item.id" 
              class="mb-2 rounded-lg border"
              :class="{ 'inactive-item': !item.activo }">
              <v-list-item-title class="font-weight-bold text-body-2 d-flex align-center flex-wrap" :class="{ 'text-grey': !item.activo }">
                <span>{{ item.descripcion }}</span>
                <span v-if="item.oficial" class="text-success font-weight-black ml-1" style="font-size: 8px;">OFICIAL</span>
                <span v-if="!item.activo" class="text-caption font-italic ml-1">(Inactivo)</span>
                
                <v-chip v-if="getDependencies(item).length > 0" size="x-small" color="primary" variant="tonal" class="ml-2 px-1">
                  {{ getDependencies(item).length }} {{ getDependencies(item).length === 1 ? 'unidad' : 'unidades' }}
                  <v-tooltip activator="parent" location="top" class="custom-tooltip">
                    <div class="text-caption font-weight-bold mb-1">Unidades vinculadas:</div>
                    <div style="max-height: 200px; overflow-y: auto;" class="text-caption">
                      <div v-for="u in getDependencies(item)" :key="u.id" class="mb-1">
                        • {{ u.nombre || u.denominacion }} ({{ u.codigo }})
                      </div>
                    </div>
                  </v-tooltip>
                </v-chip>
                <v-chip v-else size="x-small" color="grey-darken-1" variant="outlined" class="ml-2 px-1 text-xxs">
                  Sin uso activo
                </v-chip>
              </v-list-item-title>
              <template v-slot:append>
                <v-btn icon variant="text" size="small" color="orange" @click="openDialog(item)">
                  <v-icon>mdi-pencil</v-icon>
                  <v-tooltip activator="parent" location="top">Editar tipo</v-tooltip>
                </v-btn>
                <v-btn icon variant="text" size="small" color="red" @click="openDeleteConfirm(item)">
                  <v-icon>mdi-delete</v-icon>
                  <v-tooltip activator="parent" location="top">Eliminar tipo</v-tooltip>
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-window-item>

      <!-- TAB 3: RELACIONES -->
      <v-window-item :value="3">
        <div class="fill-height d-flex flex-column">
          <div class="flex-shrink-0">
            <v-alert type="info" variant="tonal" density="compact" class="mx-3 my-2 text-caption">Administre los Tipos de Relación. ({{ relacionesStore.relaciones.length }} ítems)</v-alert>
            <div class="px-3 mb-2">
              <v-btn block color="primary" prepend-icon="mdi-plus" size="small" @click="openDialog()">
                Añadir Relación
                <v-tooltip activator="parent" location="top">Crear nuevo tipo de relación</v-tooltip>
              </v-btn>
            </div>
          </div>
          <v-list class="flex-grow-1 overflow-y-auto px-2 pb-16">
            <v-list-item v-for="item in relacionesStore.relaciones" :key="item.id" 
              class="mb-2 rounded-lg border"
              :class="{ 'inactive-item': !item.activo }">
              <v-list-item-title class="font-weight-bold text-body-2 d-flex align-center flex-wrap" :class="{ 'text-grey': !item.activo }">
                <span>{{ item.descripcion }}</span>
                <span v-if="item.oficial" class="text-success font-weight-black ml-1" style="font-size: 8px;">OFICIAL</span>
                <span v-if="!item.activo" class="text-caption font-italic ml-1">(Inactivo)</span>
                
                <v-chip v-if="getDependencies(item).length > 0" size="x-small" color="primary" variant="tonal" class="ml-2 px-1">
                  {{ getDependencies(item).length }} {{ getDependencies(item).length === 1 ? 'unidad' : 'unidades' }}
                  <v-tooltip activator="parent" location="top" class="custom-tooltip">
                    <div class="text-caption font-weight-bold mb-1">Unidades vinculadas:</div>
                    <div style="max-height: 200px; overflow-y: auto;" class="text-caption">
                      <div v-for="u in getDependencies(item)" :key="u.id" class="mb-1">
                        • {{ u.nombre || u.denominacion }} ({{ u.codigo }})
                      </div>
                    </div>
                  </v-tooltip>
                </v-chip>
                <v-chip v-else size="x-small" color="grey-darken-1" variant="outlined" class="ml-2 px-1 text-xxs">
                  Sin uso activo
                </v-chip>
              </v-list-item-title>
              <template v-slot:append>
                <v-btn icon variant="text" size="small" color="orange" @click="openDialog(item)">
                  <v-icon>mdi-pencil</v-icon>
                  <v-tooltip activator="parent" location="top">Editar relación</v-tooltip>
                </v-btn>
                <v-btn icon variant="text" size="small" color="red" @click="openDeleteConfirm(item)">
                  <v-icon>mdi-delete</v-icon>
                  <v-tooltip activator="parent" location="top">Eliminar relación</v-tooltip>
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-window-item>

      <!-- TAB 4: CARGOS -->
      <v-window-item :value="4">
        <div class="fill-height d-flex flex-column">
          <div class="flex-shrink-0">
            <v-alert type="info" variant="tonal" density="compact" class="mx-3 my-2 text-caption">
              Administre los Cargos y su jerarquía (padre). ({{ cargosStore.cargos.length }} ítems)
            </v-alert>
            <div class="px-3 mb-2">
              <v-btn block color="primary" prepend-icon="mdi-plus" size="small" @click="openDialog()">
                Añadir Cargo
                <v-tooltip activator="parent" location="top">Crear nuevo cargo</v-tooltip>
              </v-btn>
            </div>
          </div>
          <v-list class="flex-grow-1 overflow-y-auto px-2 pb-16">
            <v-list-item
              v-for="item in cargosTree"
              :key="item.id"
              class="mb-2 rounded-lg border"
              :class="{ 'inactive-item': !item.activo }"
              :style="{ marginLeft: `${(item._depth || 0) * 16}px` }"
            >
              <template v-slot:prepend>
                <v-icon v-if="item._depth > 0" size="16" class="mr-1 text-grey">mdi-subdirectory-arrow-right</v-icon>
              </template>
              <v-list-item-title class="font-weight-bold text-body-2 d-flex align-center flex-wrap" :class="{ 'text-grey': !item.activo }">
                <span>{{ item.descripcion || item.nombre }}</span>
                <span v-if="!item.activo" class="text-caption font-italic ml-1">(Inactivo)</span>
                <v-chip
                  v-if="item.parentNombre || item.parentId"
                  size="x-small"
                  color="secondary"
                  variant="tonal"
                  class="ml-2 px-1"
                >
                  Padre: {{ item.parentNombre || ('#' + item.parentId) }}
                </v-chip>
                <v-chip
                  v-if="getActiveCargoChildren(item.id).length > 0"
                  size="x-small"
                  color="primary"
                  variant="tonal"
                  class="ml-2 px-1"
                >
                  {{ getActiveCargoChildren(item.id).length }} hijo(s)
                </v-chip>
              </v-list-item-title>
              <template v-slot:append>
                <v-btn icon variant="text" size="small" color="orange" @click="openDialog(item)">
                  <v-icon>mdi-pencil</v-icon>
                  <v-tooltip activator="parent" location="top">Editar cargo</v-tooltip>
                </v-btn>
                <v-btn icon variant="text" size="small" color="red" @click="openDeleteConfirm(item)">
                  <v-icon>mdi-delete</v-icon>
                  <v-tooltip activator="parent" location="top">Eliminar cargo (lógico)</v-tooltip>
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-window-item>

    </v-window>

    <v-divider></v-divider>
    <div class="pa-4 bg-slate-50">
      <v-btn block color="secondary" variant="flat" prepend-icon="mdi-refresh" @click="refreshData">
        Forzar Sincronización
        <v-tooltip activator="parent" location="top">Sincronizar todos los catálogos con el servidor</v-tooltip>
      </v-btn>
    </div>

    <!-- DIÁLOGO ÚNICO Y DINÁMICO -->
    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title class="text-h6 font-weight-bold pa-4">
          {{ editingItem ? 'Editar' : 'Añadir' }} {{ tabLabel }}
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <v-text-field v-model="form.descripcion" label="Descripción / Nombre" variant="outlined" class="mb-4" hide-details autofocus @keyup.enter="handleSave" />
          
          <div class="d-flex align-center justify-space-between pa-3 rounded border mb-4">
            <span class="text-body-2">Estado: <strong>{{ form.activo ? 'ACTIVO' : 'INACTIVO' }}</strong></span>
            <v-switch v-model="form.activo" color="success" hide-details inset density="compact" />
          </div>

          <!-- Selector de cargo padre (solo tab Cargos) -->
          <v-select
            v-if="tab === 4"
            v-model="form.parentId"
            :items="parentCargoOptions"
            label="Cargo padre (opcional)"
            variant="outlined"
            clearable
            hide-details
            class="mb-4"
            density="comfortable"
          />

          <!-- Switch de Oficial (Solo para Clases) -->
          <div v-if="tab === 0" class="d-flex align-center justify-space-between pa-3 rounded border mb-4">
            <div class="d-flex align-center">
              <span class="text-body-2 mr-2">Relevancia: <strong>{{ form.oficial ? 'OFICIAL' : 'NO OFICIAL' }}</strong></span>
              <v-icon v-if="form.oficial" size="16" color="success">mdi-check-decagram</v-icon>
            </div>
            <v-switch v-model="form.oficial" color="primary" hide-details inset density="compact" />
          </div>

          <!-- Solo mostramos el color si estamos en la pestaña 0 (Instancia) -->
          <div v-if="tab === 0">
            <v-menu v-model="colorMenu" :close-on-content-click="false">
              <template v-slot:activator="{ props }">
                <div v-bind="props" class="d-flex align-center pa-2 rounded border w-100 mb-2" style="cursor: pointer">
                  <v-avatar :color="form.color" size="24" class="mr-3 border" />
                  <span class="text-caption font-weight-bold uppercase">Color de Identidad</span>
                  <v-spacer />
                  <v-icon>mdi-palette</v-icon>
                </div>
              </template>
              <v-card min-width="300" class="pa-3">
                <div v-if="usedColors.length > 0" class="mb-4">
                  <div class="text-caption font-weight-bold mb-2 text-uppercase grey--text">Colores en uso</div>
                  <div class="d-flex flex-wrap gap-2">
                    <v-avatar 
                      v-for="c in usedColors" 
                      :key="c" 
                      :color="c" 
                      size="24" 
                      class="cursor-pointer border-sm shadow-sm hover-scale"
                      @click="form.color = c"
                    >
                      <v-icon v-if="form.color.toUpperCase() === c.toUpperCase()" size="14" color="white">mdi-check</v-icon>
                    </v-avatar>
                  </div>
                </div>
                <v-divider v-if="usedColors.length > 0" class="mb-3"></v-divider>
                <div class="text-caption font-weight-bold mb-2 text-uppercase grey--text">Paleta Institucional</div>
                <v-color-picker v-model="form.color" mode="hex" :swatches="swatches" show-swatches hide-inputs flat />
              </v-card>
            </v-menu>
          </div>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" variant="elevated" @click="handleSave" :loading="loading">Guardar Cambios</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DIÁLOGO DE CONFIRMACIÓN DE BORRADO -->
    <v-dialog v-model="deleteConfirmDialog" max-width="450">
      <v-card>
        <v-card-title class="bg-red-lighten-5 text-red-darken-4 pa-4 d-flex align-center">
          <v-icon start color="red-darken-4" class="mr-2">mdi-alert-octagon</v-icon>
          ADVERTENCIA DE ELIMINACIÓN
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-6">
          <div class="text-h6 font-weight-bold mb-3 text-red-darken-2">
            ¿Desea eliminar permanentemente este elemento?
          </div>
          <p class="text-body-2 mb-4 text-grey-darken-3">
            Usted está intentando eliminar: <br>
            <strong class="text-primary">{{ itemToDelete?.descripcion }}</strong>
          </p>
          <v-alert type="warning" variant="tonal" density="compact" class="text-caption mb-4">
            <strong>NOTA IMPORTANTE:</strong> Eliminar un elemento es una acción irreversible. Si este elemento está siendo utilizado en el organigrama (en unidades activas), el sistema denegará la acción por integridad de datos.
          </v-alert>
          <div class="bg-amber-lighten-5 pa-3 rounded border-amber-lighten-2 border d-flex align-center">
            <v-icon color="amber-darken-4" class="mr-3">mdi-information-outline</v-icon>
            <div class="text-caption text-amber-darken-4 font-weight-bold">
              CONSEJO: Si solo desea que este elemento deje de aparecer en las listas de selección, le recomendamos usar la opción <strong>DESACTIVAR</strong> en lugar de eliminar.
            </div>
          </div>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4 bg-grey-lighten-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="deleteConfirmDialog = false" :disabled="loading" class="font-weight-bold">CANCELAR</v-btn>
          <v-btn color="red-darken-2" variant="elevated" @click="confirmDelete" :loading="loading" class="px-6 font-weight-bold">
            SÍ, ELIMINAR PERMANENTEMENTE
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style scoped>
.resizable-container { 
  position: relative; 
  transition: none !important; 
  height: 100% !important;
  overflow: hidden;
}
:deep(.v-window) {
  height: calc(100% - 96px) !important;
}
:deep(.v-window-item) {
  height: 100% !important;
}
.resize-handle { position: absolute; top: 0; left: 0; width: 6px; height: 100%; cursor: col-resize; z-index: 100; background: transparent; }
.resize-handle:hover { background: rgba(var(--v-theme-primary), 0.3); }
.pb-16 { padding-bottom: 64px !important; }
.inactive-item { background-color: #f5f5f5 !important; border-style: dashed !important; }

@media (max-width: 600px) {
  .resize-handle {
    display: none !important;
  }
}
</style>