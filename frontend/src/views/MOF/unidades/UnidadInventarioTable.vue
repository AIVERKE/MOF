<script setup>
import { computed, ref, provide } from "vue";
import { hints } from "@/config/hints";

// Desconectar los inputs de este componente del v-form padre para que
// filas nuevas sin descripción o en edición no apaguen el botón "Guardar Unidad"
provide(Symbol.for("vuetify:form"), null);

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  hint: {
    type: String,
    default: () => hints.unidadForm?.inventarios || "Bienes, equipos y materiales inventariados pertenecientes a esta unidad",
  },
  readonly: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const rows = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []));

// Estado para validar solo al guardar o cuando se interactúa
const saveAttempted = ref(false);

function addRow() {
  emit("update:modelValue", [
    ...rows.value,
    { id: null, descripcion: "", cantidad: 1 },
  ]);
}

function updateDescripcion(index, value) {
  emit(
    "update:modelValue",
    rows.value.map((r, i) => (i === index ? { ...r, descripcion: value } : r)),
  );
}

function updateCantidad(index, value) {
  let val;
  if (value === "" || value == null) {
    val = "";
  } else {
    const parsed = parseInt(value, 10);
    val = Number.isNaN(parsed) ? value : parsed;
  }
  emit(
    "update:modelValue",
    rows.value.map((r, i) => (i === index ? { ...r, cantidad: val } : r)),
  );
}

function removeRow(index) {
  emit(
    "update:modelValue",
    rows.value.filter((_, i) => i !== index),
  );
}

function getCantidadError(row) {
  const hasDesc = typeof row.descripcion === "string" && row.descripcion.trim().length > 0;
  if (hasDesc && (saveAttempted.value || (row.cantidad !== "" && row.cantidad != null))) {
    if (
      row.cantidad === "" ||
      row.cantidad == null ||
      Number(row.cantidad) < 1 ||
      !Number.isInteger(Number(row.cantidad))
    ) {
      return "Entero ≥ 1";
    }
  }
  return "";
}

function isCantidadInvalid(row) {
  return Boolean(getCantidadError(row));
}

function isDescripcionMissing(row) {
  return !row.descripcion || !row.descripcion.trim();
}

function validate() {
  saveAttempted.value = true;
  // Bloquear solo si hay filas con descripción que tengan cantidad vacía o < 1
  const hasInvalidCantidad = rows.value.some((r) => {
    const hasDesc = typeof r.descripcion === "string" && r.descripcion.trim().length > 0;
    if (!hasDesc) return false;
    return (
      r.cantidad === "" ||
      r.cantidad == null ||
      Number(r.cantidad) < 1 ||
      !Number.isInteger(Number(r.cantidad))
    );
  });
  return !hasInvalidCantidad;
}

defineExpose({
  validate,
  saveAttempted,
});
</script>

<template>
  <div class="unidad-inventario-table">
    <div class="d-flex align-center justify-space-between mb-2">
      <div>
        <div class="text-subtitle-2 font-weight-bold text-slate-800 d-flex align-center">
          <v-icon size="18" color="teal-darken-2" class="mr-1">mdi-package-variant-closed</v-icon>
          Inventarios de la Unidad
          <v-chip size="x-small" color="teal-darken-2" variant="flat" class="ml-2 font-weight-black">
            {{ rows.length }}
          </v-chip>
        </div>
        <div class="text-caption text-slate-500">
          {{ hint }}
        </div>
      </div>
      <v-btn
        v-if="!readonly"
        color="teal-darken-2"
        variant="tonal"
        size="small"
        prepend-icon="mdi-plus"
        class="font-weight-bold"
        data-test="btn-add-inventario-row"
        @click="addRow"
      >
        Añadir ítem de inventario
      </v-btn>
    </div>

    <v-table density="compact" class="border rounded inventario-table-container">
      <thead>
        <tr class="bg-slate-50">
          <th class="text-caption font-weight-bold text-slate-600 text-center" style="width: 48px">
            #
          </th>
          <th class="text-left text-caption font-weight-bold text-slate-600">
            <div class="d-flex align-center">
              <v-icon color="teal-darken-2" size="15" class="mr-1">mdi-format-list-bulleted</v-icon>
              <span>Descripción del ítem</span>
            </div>
          </th>
          <th class="text-left text-caption font-weight-bold text-slate-600" style="width: 150px">
            <div class="d-flex align-center">
              <v-icon color="primary" size="15" class="mr-1">mdi-counter</v-icon>
              <span>Cantidad</span>
            </div>
          </th>
          <th v-if="!readonly" style="width: 56px"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="rows.length === 0">
          <td :colspan="readonly ? 3 : 4" class="text-center text-medium-emphasis py-4">
            <div class="d-flex flex-column align-center justify-center">
              <v-icon size="28" color="grey-lighten-1" class="mb-1">mdi-table-cancel</v-icon>
              <span class="text-caption">Sin ítems de inventario asignados a esta unidad.</span>
              <span v-if="!readonly" class="text-xxs text-grey">
                Presione "Añadir ítem de inventario" para registrar bienes, equipos o materiales.
              </span>
            </div>
          </td>
        </tr>
        <tr v-for="(row, index) in rows" :key="row.id || index" class="inventario-row">
          <td class="text-center text-caption font-weight-bold text-slate-500">
            {{ index + 1 }}
          </td>
          <td>
            <v-text-field
              :model-value="row.descripcion"
              density="compact"
              variant="underlined"
              hide-details="auto"

              class="inventario-desc-input"
              placeholder="ej. Computadora de escritorio, Escritorio de madera, etc."
              :disabled="readonly"
              :data-test="`inventario-input-descripcion-${index}`"
              @update:model-value="(v) => updateDescripcion(index, v)"
            />
            <div
              v-if="!readonly && isDescripcionMissing(row)"
              class="d-flex align-center text-caption text-amber-darken-3 mt-1 inventario-aviso-desc"
              data-test="inventario-aviso-descripcion"
            >
              <v-icon size="14" class="mr-1">mdi-alert-circle-outline</v-icon>
              <span>Descripción requerida para registrar este ítem</span>
            </div>
          </td>
          <td>
            <v-text-field
              :model-value="row.cantidad"
              type="number"
              min="1"
              max="1000000"
              density="compact"
              variant="underlined"
              :error="isCantidadInvalid(row)"
              :error-messages="getCantidadError(row) ? [getCantidadError(row)] : []"
              hide-details="auto"
              class="inventario-cant-input"
              placeholder="1"
              :disabled="readonly"
              :data-test="`inventario-input-cantidad-${index}`"
              @update:model-value="(v) => updateCantidad(index, v)"
            />
          </td>
          <td v-if="!readonly" class="text-right">
            <v-btn
              variant="text"
              size="small"
              color="error"
              icon
              :data-test="`btn-remove-inventario-${index}`"
              @click="removeRow(index)"
            >
              <v-icon size="18">mdi-close-circle</v-icon>
              <v-tooltip activator="parent" location="top">Eliminar ítem</v-tooltip>
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<style scoped>
.inventario-table-container :deep(table) {
  width: 100%;
}

.inventario-cant-input {
  max-width: 130px;
}

.inventario-desc-input :deep(.v-field),
.inventario-cant-input :deep(.v-field) {
  --v-field-padding-start: 8px !important;
  padding-inline-start: 8px !important;
  padding-inline-end: 8px !important;
}

.inventario-desc-input :deep(input),
.inventario-cant-input :deep(input) {
  padding-inline-start: 4px !important;
  font-weight: 500;
}

.inventario-aviso-desc {
  font-size: 0.72rem !important;
  line-height: 1.1;
  padding-left: 8px;
}
</style>
