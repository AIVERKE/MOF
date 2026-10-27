<script>
import { hints } from "@/config/hints";

/**
 * Columnas autorizadas para la primera entrega de la tabla SIA (MOF-075).
 * Estructura extensible: añadir nuevas columnas aquí las renderiza dinámicamente
 * en encabezados, celdas y validaciones sin tocar la plantilla ni refactorizar.
 */
export const SIA_COLUMNS = [
  {
    key: "aprobados",
    label: "Aprobados",
    icon: "mdi-check-circle-outline",
    color: "success",
    placeholder: "0",
    hint: hints.sia?.aprobados || "Cantidad de estudiantes aprobados",
  },
  {
    key: "reprobados",
    label: "Reprobados",
    icon: "mdi-close-circle-outline",
    color: "error",
    placeholder: "0",
    hint: hints.sia?.reprobados || "Cantidad de estudiantes reprobados",
  },
  {
    key: "matriculados",
    label: "Matriculados",
    icon: "mdi-account-school-outline",
    color: "primary",
    placeholder: "0",
    hint: hints.sia?.matriculados || "Total de estudiantes matriculados",
  },
];
</script>

<script setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  hint: {
    type: String,
    default: () => hints.unidadForm?.sia || "Métricas académicas SIA de la Carrera",
  },
  readonly: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const rows = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []));

const integerRule = (v) =>
  v == null ||
  v === "" ||
  (Number.isInteger(Number(v)) && Number(v) >= 0) ||
  "Entero ≥ 0";

function addRow() {
  const newRow = { id: null };
  SIA_COLUMNS.forEach((col) => {
    newRow[col.key] = null;
  });
  emit("update:modelValue", [...rows.value, newRow]);
}

function updateCell(index, key, value) {
  const numValue =
    value === "" || value == null
      ? null
      : Math.max(0, parseInt(value, 10) || 0);
  emit(
    "update:modelValue",
    rows.value.map((r, i) => (i === index ? { ...r, [key]: numValue } : r)),
  );
}

function removeRow(index) {
  emit(
    "update:modelValue",
    rows.value.filter((_, i) => i !== index),
  );
}
</script>

<template>
  <div class="unidad-sia-table">
    <div class="d-flex align-center justify-space-between mb-2">
      <div>
        <div class="text-subtitle-2 font-weight-bold text-slate-800 d-flex align-center">
          <v-icon size="18" color="indigo-darken-2" class="mr-1">mdi-school</v-icon>
          Métricas Académicas (SIA)
          <v-chip size="x-small" color="indigo-darken-2" variant="flat" class="ml-2 font-weight-black">
            {{ rows.length }}
          </v-chip>
        </div>
        <div class="text-caption text-slate-500">
          {{ hint }}
        </div>
      </div>
      <v-btn
        v-if="!readonly"
        color="indigo-darken-2"
        variant="tonal"
        size="small"
        prepend-icon="mdi-plus"
        class="font-weight-bold"
        data-test="btn-add-sia-row"
        @click="addRow"
      >
        Añadir registro SIA
      </v-btn>
    </div>

    <v-table density="compact" class="border rounded sia-table-container">
      <thead>
        <tr class="bg-slate-50">
          <th class="text-caption font-weight-bold text-slate-600 text-center" style="width: 48px">
            #
          </th>
          <th
            v-for="col in SIA_COLUMNS"
            :key="col.key"
            class="text-left text-caption font-weight-bold"
            style="min-width: 140px"
          >
            <div class="d-flex align-center">
              <v-icon :color="col.color" size="15" class="mr-1">{{ col.icon }}</v-icon>
              <span>{{ col.label }}</span>
            </div>
          </th>
          <th v-if="!readonly" style="width: 56px"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="rows.length === 0">
          <td :colspan="SIA_COLUMNS.length + (readonly ? 1 : 2)" class="text-center text-medium-emphasis py-4">
            <div class="d-flex flex-column align-center justify-center">
              <v-icon size="28" color="grey-lighten-1" class="mb-1">mdi-table-cancel</v-icon>
              <span class="text-caption">Sin registros SIA en esta unidad.</span>
              <span v-if="!readonly" class="text-xxs text-grey">
                Presione "Añadir registro SIA" para registrar estudiantes aprobados, reprobados y matriculados.
              </span>
            </div>
          </td>
        </tr>
        <tr v-for="(row, index) in rows" :key="row.id || index" class="sia-row">
          <td class="text-center text-caption font-weight-bold text-slate-500">
            {{ index + 1 }}
          </td>
          <td v-for="col in SIA_COLUMNS" :key="col.key">
            <v-text-field
              :model-value="row[col.key]"
              type="number"
              min="0"
              max="1000000"
              density="compact"
              variant="underlined"
              hide-details="auto"
              class="sia-input"
              :placeholder="col.placeholder"
              :hint="col.hint"
              :persistent-hint="false"
              :rules="[integerRule]"
              :disabled="readonly"
              :data-test="`sia-input-${col.key}-${index}`"
              @update:model-value="(v) => updateCell(index, col.key, v)"
            />
          </td>
          <td v-if="!readonly" class="text-right">
            <v-btn
              variant="text"
              size="small"
              color="error"
              icon
              :data-test="`btn-remove-sia-${index}`"
              @click="removeRow(index)"
            >
              <v-icon size="18">mdi-close-circle</v-icon>
              <v-tooltip activator="parent" location="top">Eliminar registro</v-tooltip>
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<style scoped>
.sia-table-container :deep(table) {
  width: 100%;
}

.sia-input {
  max-width: 140px;
}

.sia-input :deep(.v-field) {
  --v-field-padding-start: 8px !important;
  padding-inline-start: 8px !important;
  padding-inline-end: 8px !important;
}

.sia-input :deep(input) {
  padding-inline-start: 4px !important;
  text-align: left !important;
  font-weight: 600;
}
</style>
