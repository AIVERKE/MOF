<script setup>
import { computed, onMounted, ref } from "vue";
import { useAllCargosMofStore } from "../../../stores/cargos_mof";
import { useSnackbar } from "@/composables/useSnackbar";
import { hints } from "@/config/hints";
import CargoCatalogDialog from "./CargoCatalogDialog.vue";

/**
 * Cargos asignados a una unidad (filas de cargo_unidad) con su nivel en esa unidad.
 * modelValue: Array<{ assignmentId: string|null, cargoId: string, nombre: string, nivelOrden: number|null }>
 */
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  hint: { type: String, default: () => hints.unidadForm.cargos },
});
const emit = defineEmits(["update:modelValue"]);

const cargosStore = useAllCargosMofStore();
const { mostrar } = useSnackbar();

const selectedToAdd = ref(null);
const search = ref("");
const dialog = ref(false);
const editingCargo = ref(null);
const dialogInitialName = ref("");

const deleteConfirmDialog = ref(false);
const itemToDelete = ref(null);
const deleting = ref(false);

const rows = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []));
const assignedIds = computed(() => new Set(rows.value.map((r) => String(r.cargoId))));

const catalogById = computed(() => {
  const map = new Map();
  cargosStore.cargos.forEach((c) => map.set(String(c.id), c));
  return map;
});

const availableCargos = computed(() =>
  cargosStore.cargos
    .filter((c) => !assignedIds.value.has(String(c.id)))
    .map((c) => ({
      ...c,
      id: String(c.id),
      label: [c.nombre, c.nivelOrden != null ? `N${c.nivelOrden}` : null, `#${c.id}`]
        .filter(Boolean)
        .join(" · "),
    })),
);

const nivelRule = (v) =>
  v == null ||
  v === "" ||
  (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 99) ||
  "Entero entre 1 y 99";

function addCargo(cargoId) {
  if (cargoId == null) return;
  const id = String(cargoId);
  const cat = catalogById.value.get(id);
  if (!cat || assignedIds.value.has(id)) {
    selectedToAdd.value = null;
    return;
  }
  if (cat.activo === false) {
    mostrar(`El cargo "${cat.nombre}" está inactivo en el catálogo. Edítelo para activarlo si desea asignarlo.`, "warning");
    selectedToAdd.value = null;
    return;
  }
  emit("update:modelValue", [
    ...rows.value,
    {
      assignmentId: null,
      cargoId: id,
      nombre: cat.nombre || "",
      nivelOrden: cat.nivelOrden ?? null,
    },
  ]);
  selectedToAdd.value = null;
  search.value = "";
}

function updateNivel(index, value) {
  const nivelOrden = value === "" || value == null ? null : Number(value);
  emit(
    "update:modelValue",
    rows.value.map((r, i) => (i === index ? { ...r, nivelOrden } : r)),
  );
}

function removeRow(index) {
  emit(
    "update:modelValue",
    rows.value.filter((_, i) => i !== index),
  );
}

function openDialog(item = null) {
  editingCargo.value = item;
  dialogInitialName.value = item ? "" : search.value;
  dialog.value = true;
}

function onCargoSaved({ id, nombre, isNew }) {
  mostrar(`Cargo "${nombre}" guardado en el catálogo`, "success");
  if (isNew) {
    const found = cargosStore.cargos.find(
      (c) => c.nombre.trim().toLowerCase() === nombre.trim().toLowerCase(),
    );
    if (found && !assignedIds.value.has(String(found.id))) {
      addCargo(found.id);
    }
  } else if (id) {
    const idStr = String(id);
    emit(
      "update:modelValue",
      rows.value.map((r) =>
        String(r.cargoId) === idStr ? { ...r, nombre } : r,
      ),
    );
  }
}

function getActiveCargoChildren(cargoId) {
  return cargosStore.cargos.filter(
    (c) =>
      c.activo !== false &&
      String(c.parentId) === String(cargoId) &&
      String(c.id) !== String(cargoId),
  );
}

function openDeleteConfirm(item) {
  if (!item) return;
  const hijos = getActiveCargoChildren(item.id);
  if (hijos.length > 0) {
    mostrar(
      `Error: No se puede eliminar este cargo porque tiene ${hijos.length} hijo(s) activo(s) en la jerarquía.`,
      "error",
    );
    return;
  }
  itemToDelete.value = item;
  deleteConfirmDialog.value = true;
}

async function confirmDelete() {
  if (!itemToDelete.value) return;
  const id = itemToDelete.value.id;
  deleting.value = true;
  try {
    const success = await cargosStore.deleteCargo(id);
    if (success) {
      mostrar("Cargo eliminado permanentemente del catálogo", "success");
      deleteConfirmDialog.value = false;
      emit(
        "update:modelValue",
        rows.value.filter((r) => String(r.cargoId) !== String(id)),
      );
      itemToDelete.value = null;
    } else {
      mostrar(
        cargosStore.error || "No se pudo eliminar el cargo: verifique dependencias vinculadas.",
        "error",
      );
    }
  } catch (err) {
    mostrar(err?.message || "Error al eliminar el cargo del catálogo", "error");
  } finally {
    deleting.value = false;
  }
}

function rowNombre(row) {
  return catalogById.value.get(String(row.cargoId))?.nombre || row.nombre || `Cargo #${row.cargoId}`;
}

function rowNivelSugerido(row) {
  return catalogById.value.get(String(row.cargoId))?.nivelOrden ?? null;
}

onMounted(async () => {
  if (cargosStore.cargos.length === 0) {
    await cargosStore.getFetchCargos();
  }
});
</script>

<template>
  <div>
    <v-autocomplete
      v-model="selectedToAdd"
      v-model:search="search"
      label="Agregar cargo a la unidad"
      :hint="hint"
      :persistent-hint="false"
      :items="availableCargos"
      item-title="label"
      item-value="id"
      variant="underlined"
      clearable
      :loading="cargosStore.loading"
      @update:model-value="addCargo"
    >
      <template v-slot:item="{ props: itemProps, item }">
        <v-list-item
          v-bind="itemProps"
          :title="undefined"
          :class="{ 'opacity-60 text-grey-darken-1': item.raw.activo === false }"
        >
          <template v-slot:title>
            <div class="d-flex align-center flex-wrap">
              <span class="font-weight-medium">{{ item.raw.nombre }}</span>
              <span v-if="item.raw.nivelOrden != null" class="text-caption text-medium-emphasis ml-1">
                · N{{ item.raw.nivelOrden }}
              </span>
              <span class="text-caption text-disabled ml-1">#{{ item.raw.id }}</span>
              <v-chip
                v-if="item.raw.activo === false"
                size="x-small"
                color="grey"
                variant="outlined"
                class="ml-2 font-italic"
              >
                Inactivo
              </v-chip>
            </div>
          </template>
          <template v-slot:append>
            <div class="d-flex align-center" @click.stop>
              <v-btn
                icon
                size="x-small"
                variant="text"
                color="primary"
                class="mr-1"
                @click.stop="openDialog(item.raw)"
              >
                <v-icon size="16">mdi-pencil</v-icon>
                <v-tooltip activator="parent" location="top">Editar cargo en el catálogo</v-tooltip>
              </v-btn>
              <v-btn
                icon
                size="x-small"
                variant="text"
                color="error"
                @click.stop="openDeleteConfirm(item.raw)"
              >
                <v-icon size="16">mdi-delete</v-icon>
                <v-tooltip activator="parent" location="top">Eliminar cargo del catálogo</v-tooltip>
              </v-btn>
            </div>
          </template>
        </v-list-item>
      </template>

      <template v-slot:no-data>
        <v-list-item @click="openDialog()">
          <template v-slot:prepend>
            <v-icon color="primary">mdi-plus</v-icon>
          </template>
          <v-list-item-title>
            Crear nuevo cargo: "<strong>{{ search }}</strong>"
          </v-list-item-title>
        </v-list-item>
      </template>
      <template v-slot:append-item>
        <v-divider />
        <v-list-item @click="openDialog()" color="primary">
          <template v-slot:prepend>
            <v-icon color="primary">mdi-plus-circle</v-icon>
          </template>
          <v-list-item-title class="text-primary font-weight-bold">
            AÑADIR NUEVO CARGO AL CATÁLOGO
          </v-list-item-title>
        </v-list-item>
      </template>
    </v-autocomplete>

    <v-table density="compact" class="mt-2 border rounded">
      <thead>
        <tr>
          <th class="text-left">Cargo</th>
          <th class="text-left" style="width: 140px">Nivel en la unidad</th>
          <th style="width: 84px"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="rows.length === 0">
          <td colspan="3" class="text-center text-medium-emphasis py-3">
            Sin cargos asignados
          </td>
        </tr>
        <tr v-for="(row, index) in rows" :key="row.cargoId">
          <td>
            {{ rowNombre(row) }}
            <span class="text-caption text-medium-emphasis ml-1">#{{ row.cargoId }}</span>
          </td>
          <td>
            <v-text-field
              :model-value="row.nivelOrden"
              type="number"
              min="1"
              max="99"
              density="compact"
              variant="underlined"
              hide-details="auto"
              class="nivel-cargo-input"
              :placeholder="rowNivelSugerido(row) != null ? `Sug. ${rowNivelSugerido(row)}` : ''"
              :hint="hints.cargos.nivelUnidad"
              :persistent-hint="false"
              :rules="[nivelRule]"
              @update:model-value="(v) => updateNivel(index, v)"
            />
          </td>
          <td class="text-right text-no-wrap">
            <v-btn
              variant="text"
              size="small"
              color="primary"
              icon
              class="mr-1"
              @click="openDialog(catalogById.get(String(row.cargoId)) || { id: row.cargoId, nombre: rowNombre(row) })"
            >
              <v-icon size="18">mdi-pencil</v-icon>
              <v-tooltip activator="parent" location="top">Editar cargo en el catálogo</v-tooltip>
            </v-btn>
            <v-btn variant="text" size="small" color="error" icon @click="removeRow(index)">
              <v-icon size="18">mdi-close-circle</v-icon>
              <v-tooltip activator="parent" location="top">Quitar de esta unidad</v-tooltip>
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <CargoCatalogDialog
      v-model="dialog"
      :cargo="editingCargo"
      :initial-name="dialogInitialName"
      @saved="onCargoSaved"
      @delete="openDeleteConfirm"
    />

    <!-- Diálogo de confirmación para eliminar cargo del catálogo -->
    <v-dialog v-model="deleteConfirmDialog" max-width="440">
      <v-card class="rounded-xl">
        <v-card-title class="text-h6 d-flex align-center pt-4 px-4">
          <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
          Eliminar Cargo del Catálogo
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4 text-body-2">
          ¿Está seguro de que desea eliminar permanentemente el cargo
          <strong>"{{ itemToDelete?.nombre }}"</strong>
          <span v-if="itemToDelete?.id" class="text-caption text-medium-emphasis ml-1">#{{ itemToDelete.id }}</span>
          del catálogo general?
          <div class="text-caption text-error mt-2 font-weight-medium">
            Esta acción realizará un borrado lógico del cargo en todo el sistema.
          </div>
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-4">
          <v-spacer />
          <v-btn
            variant="text"
            class="rounded-lg font-weight-medium px-4"
            :disabled="deleting"
            @click="deleteConfirmDialog = false"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            class="rounded-lg font-weight-bold px-4"
            :loading="deleting"
            @click="confirmDelete"
          >
            Eliminar del Catálogo
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.nivel-cargo-input {
  max-width: 120px;
}

.nivel-cargo-input :deep(.v-field) {
  --v-field-padding-start: 12px !important;
  padding-inline-start: 12px !important;
  padding-inline-end: 8px !important;
}

.nivel-cargo-input :deep(.v-field__input) {
  padding-inline-start: 6px !important;
  padding-inline-end: 6px !important;
}

.nivel-cargo-input :deep(input) {
  padding-inline-start: 4px !important;
  text-align: left !important;
}
</style>
