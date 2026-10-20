<script setup>
import { computed, onMounted, ref } from "vue";
import { useAllCargosMofStore } from "../../../stores/cargos_mof";
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

const selectedToAdd = ref(null);
const search = ref("");
const dialog = ref(false);
const editingCargo = ref(null);
const dialogInitialName = ref("");

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
      props: { disabled: c.activo === false },
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
  if (!cat || cat.activo === false || assignedIds.value.has(id)) return;
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

function rowNombre(row) {
  return row.nombre || catalogById.value.get(String(row.cargoId))?.nombre || `Cargo #${row.cargoId}`;
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
          <th style="width: 56px"></th>
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
          <td class="text-right">
            <v-btn variant="text" size="small" color="error" icon @click="removeRow(index)">
              <v-icon size="18">mdi-close-circle</v-icon>
              <v-tooltip activator="parent" location="top">Quitar de la unidad</v-tooltip>
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <CargoCatalogDialog
      v-model="dialog"
      :cargo="editingCargo"
      :initial-name="dialogInitialName"
    />
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
