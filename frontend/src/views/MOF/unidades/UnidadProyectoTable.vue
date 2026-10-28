<script setup>
import { computed, ref, onMounted, provide } from "vue";
import { hints } from "@/config/hints";
import { ENDPOINTS, apiFetch } from "@/config/api";

// Desconectar los inputs de este componente del v-form padre para que
// filas nuevas en edición no apaguen el botón "Guardar Unidad"
provide(Symbol.for("vuetify:form"), null);

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  unidadesDisponibles: { type: Array, default: () => [] },
  hint: {
    type: String,
    default: () =>
      hints.unidadForm?.proyectos ||
      "Proyectos de interacción social, investigación, académicos u otros gestionados por esta unidad",
  },
  readonly: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const rows = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []));
const saveAttempted = ref(false);

const tiposSugeridos = ref([
  "Investigación",
  "Interacción social",
  "Académico",
  "Extensión universitaria",
  "Innovación docente",
]);

onMounted(async () => {
  try {
    const res = await apiFetch(ENDPOINTS.MOF.PROYECTOS_TIPOS);
    if (res.ok) {
      const body = await res.json();
      const list = body.data || body;
      if (Array.isArray(list) && list.length > 0) {
        const tipos = list
          .map((item) => (typeof item === "object" ? item.tipo : item))
          .filter(Boolean);
        if (tipos.length > 0) {
          tiposSugeridos.value = Array.from(new Set([...tipos, ...tiposSugeridos.value]));
        }
      }
    }
  } catch (e) {
    // Fallback silencioso a las sugerencias por defecto
  }
});

function addRow() {
  emit("update:modelValue", [
    ...rows.value,
    { id: null, tipo: "", detalle: "", unidadIds: [] },
  ]);
}

function updateTipo(index, value) {
  emit(
    "update:modelValue",
    rows.value.map((r, i) => (i === index ? { ...r, tipo: value } : r)),
  );
}

function updateDetalle(index, value) {
  emit(
    "update:modelValue",
    rows.value.map((r, i) => (i === index ? { ...r, detalle: value } : r)),
  );
}

function updateUnidadIds(index, value) {
  emit(
    "update:modelValue",
    rows.value.map((r, i) => (i === index ? { ...r, unidadIds: value } : r)),
  );
}

function removeRow(index) {
  emit(
    "update:modelValue",
    rows.value.filter((_, i) => i !== index),
  );
}

function isTipoInvalid(row) {
  if (!saveAttempted.value) return false;
  return !row.tipo || !String(row.tipo).trim();
}

function isDetalleInvalid(row) {
  if (!saveAttempted.value) return false;
  return !row.detalle || !String(row.detalle).trim();
}

function validate() {
  saveAttempted.value = true;
  for (const row of rows.value) {
    if (!row.tipo || !String(row.tipo).trim()) return false;
    if (!row.detalle || !String(row.detalle).trim()) return false;
  }
  return true;
}

defineExpose({
  validate,
  saveAttempted,
});
</script>

<template>
  <div class="unidad-proyecto-table">
    <!-- Encabezado de la sección uniforme con inventarios/SIA -->
    <div class="d-flex align-center justify-space-between mb-2">
      <div>
        <div class="text-subtitle-2 font-weight-bold text-slate-800 d-flex align-center">
          <v-icon size="18" color="primary" class="mr-1">mdi-folder-multiple-outline</v-icon>
          Proyectos de la Unidad
          <v-chip
            v-if="rows.length > 0"
            size="x-small"
            color="primary"
            variant="flat"
            class="ml-2 font-weight-black"
          >
            {{ rows.length }}
          </v-chip>
        </div>
        <div class="text-caption text-slate-500">
          {{ hint }}
        </div>
      </div>

      <v-btn
        v-if="!readonly"
        color="primary"
        variant="tonal"
        size="small"
        prepend-icon="mdi-plus"
        class="font-weight-bold"
        data-test="btn-add-proyecto-row"
        @click="addRow"
      >
        Añadir proyecto
      </v-btn>
    </div>

    <!-- Lista vacía -->
    <div
      v-if="rows.length === 0"
      class="pa-4 text-center rounded-lg border border-dashed bg-slate-50 text-caption text-medium-emphasis my-2"
    >
      <v-icon size="28" color="grey-lighten-1" class="mb-1 d-block mx-auto">mdi-folder-plus-outline</v-icon>
      <span>No hay proyectos registrados para esta unidad.</span>
      <span v-if="!readonly" class="d-block text-slate-500 mt-1">
        Presione <strong>«Añadir proyecto»</strong> para registrar uno con tipo libre.
      </span>
    </div>

    <!-- Lista de tarjetas de proyectos -->
    <div v-else class="d-flex flex-column gap-3 mt-2">
      <v-card
        v-for="(row, idx) in rows"
        :key="row.id || idx"
        variant="outlined"
        class="proyecto-card pa-3 pa-sm-4 rounded-lg bg-white"
        :class="{ 'border-error': isTipoInvalid(row) || isDetalleInvalid(row) }"
      >
        <!-- Encabezado de tarjeta -->
        <div class="d-flex align-center justify-space-between mb-3 pb-2 border-b">
          <div class="d-flex align-center ga-2">
            <v-chip size="x-small" color="primary" variant="flat" class="font-weight-bold">
              #{{ idx + 1 }}
            </v-chip>
            <span class="text-caption font-weight-bold text-slate-700">
              {{ row.tipo && row.tipo.trim() ? row.tipo.trim() : 'NUEVO PROYECTO' }}
            </span>
          </div>

          <v-btn
            v-if="!readonly"
            icon="mdi-delete-outline"
            size="small"
            variant="text"
            color="error"
            density="compact"
            title="Quitar proyecto"
            :data-test="`btn-remove-proyecto-${idx}`"
            @click="removeRow(idx)"
          />
        </div>

        <v-row dense>
          <!-- Tipo (Texto libre con autocompletado sugerido) -->
          <v-col cols="12" sm="5">
            <v-combobox
              :model-value="row.tipo"
              :items="tiposSugeridos"
              label="Tipo de proyecto *"
              density="compact"
              variant="outlined"
              hide-details="auto"
              :readonly="readonly"
              :error="isTipoInvalid(row)"
              :error-messages="isTipoInvalid(row) ? ['El tipo de proyecto es requerido'] : []"
              @update:model-value="updateTipo(idx, $event)"
            >
              <template #prepend-inner>
                <v-icon size="16" color="primary">mdi-tag-outline</v-icon>
              </template>
            </v-combobox>
          </v-col>

          <!-- Unidades participantes conjuntas (opcional) -->
          <v-col cols="12" sm="7">
            <v-autocomplete
              :model-value="row.unidadIds || []"
              :items="unidadesDisponibles"
              item-title="nombre"
              item-value="id"
              label="Unidades conjuntas (opcional)"
              density="compact"
              variant="outlined"
              multiple
              chips
              closable-chips
              hide-details="auto"
              :readonly="readonly"
              @update:model-value="updateUnidadIds(idx, $event)"
            >
              <template #prepend-inner>
                <v-icon size="16" color="primary">mdi-domain</v-icon>
              </template>
              <template #chip="{ props: chipProps, item }">
                <v-chip
                  v-bind="chipProps"
                  size="x-small"
                  variant="tonal"
                  color="primary"
                  class="font-weight-medium"
                >
                  {{ item.raw.sigla && item.raw.sigla !== '-' ? item.raw.sigla : item.raw.nombre }}
                </v-chip>
              </template>
            </v-autocomplete>
          </v-col>

          <!-- Detalle del proyecto -->
          <v-col cols="12" class="mt-2">
            <v-textarea
              :model-value="row.detalle"
              label="Detalle / Descripción del proyecto *"
              rows="2"
              auto-grow
              density="compact"
              variant="outlined"
              hide-details="auto"
              :readonly="readonly"
              :error="isDetalleInvalid(row)"
              :error-messages="isDetalleInvalid(row) ? ['El detalle del proyecto es requerido'] : []"
              @update:model-value="updateDetalle(idx, $event)"
            />
          </v-col>
        </v-row>
      </v-card>
    </div>
  </div>
</template>

<style scoped>
.unidad-proyecto-table :deep(.v-card.border-error) {
  border-color: #ef4444 !important;
}
.gap-3 {
  gap: 12px;
}
.proyecto-card {
  border-color: #e2e8f0;
  transition: border-color 0.15s ease-in-out;
}
.proyecto-card:hover {
  border-color: #cbd5e1;
}
</style>
