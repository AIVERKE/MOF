<script setup>
import { computed, ref, onMounted, provide } from "vue";
import { hints } from "@/config/hints";
import { ENDPOINTS, apiFetch, getApiErrorMeta } from "@/config/api";
import { useSnackbar } from "@/composables/useSnackbar";

// Desconectar los inputs de este componente del v-form padre para que
// filas nuevas en edición no apaguen el botón "Guardar Unidad"
provide(Symbol.for("vuetify:form"), null);

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  unidadesDisponibles: { type: Array, default: () => [] },
  hint: {
    type: String,
    default: () =>
      hints.unidadForm?.programas ||
      "Programas académicos, de investigación o de interacción social y extensión universitaria gestionados por esta unidad",
  },
  readonly: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);
const { mostrar } = useSnackbar();

const rows = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []));
const saveAttempted = ref(false);

/** Catálogo de tipos (`GET /mof/programas/tipos`): [{ id, tipo }]. */
const tipos = ref([]);

/**
 * Opciones del selector: el catálogo activo más los tipos que ya traen las
 * filas y no están en él (p. ej. uno dado de baja), para no mostrar un id suelto.
 */
const tiposItems = computed(() => {
  const ids = new Set(tipos.value.map((t) => String(t.id)));
  const extra = [];
  for (const r of rows.value) {
    if (r.tipoId != null && r.tipo && !ids.has(String(r.tipoId))) {
      ids.add(String(r.tipoId));
      extra.push({ id: Number(r.tipoId), tipo: r.tipo });
    }
  }
  return [...tipos.value, ...extra];
});

function normalizarTipo(item) {
  if (!item || typeof item !== "object" || item.id == null) return null;
  return { id: Number(item.id), tipo: String(item.tipo ?? item.descripcion ?? "") };
}

async function cargarTipos() {
  try {
    const res = await apiFetch(ENDPOINTS.MOF.PROGRAMAS_TIPOS);
    if (!res.ok) return;
    const body = await res.json();
    const list = body?.data ?? body;
    if (Array.isArray(list)) {
      tipos.value = list.map(normalizarTipo).filter(Boolean);
    }
  } catch (e) {
    // Sin catálogo el selector queda vacío; el resto del formulario sigue usable
  }
}

onMounted(cargarTipos);

function tipoNombre(row) {
  if (row?.tipoId == null) return "";
  const t = tiposItems.value.find((x) => String(x.id) === String(row.tipoId));
  return t?.tipo || row.tipo || "";
}

function addRow() {
  emit("update:modelValue", [
    ...rows.value,
    {
      id: null,
      tipoId: null,
      tipo: "",
      nombre: "",
      detalle: "",
      resolucion: "",
      unidadIds: [],
    },
  ]);
}

function updateTipo(index, value) {
  const tipoId = value == null || value === "" ? null : Number(value);
  const tipo = tiposItems.value.find((t) => t.id === tipoId)?.tipo || "";
  emit(
    "update:modelValue",
    rows.value.map((r, i) => (i === index ? { ...r, tipoId, tipo } : r)),
  );
}

/** Reemplaza un campo de la fila `index` (nombre, detalle, resolucion, unidadIds). */
function updateCampo(index, campo, value) {
  emit(
    "update:modelValue",
    rows.value.map((r, i) => (i === index ? { ...r, [campo]: value } : r)),
  );
}

function removeRow(index) {
  emit(
    "update:modelValue",
    rows.value.filter((_, i) => i !== index),
  );
}

function tieneTipo(row) {
  return row?.tipoId != null && Number(row.tipoId) > 0;
}

function isTipoInvalid(row) {
  if (!saveAttempted.value) return false;
  return !tieneTipo(row);
}

function tieneTexto(value) {
  return value != null && String(value).trim() !== "";
}

function isNombreInvalid(row) {
  if (!saveAttempted.value) return false;
  return !tieneTexto(row.nombre);
}

function isDetalleInvalid(row) {
  if (!saveAttempted.value) return false;
  return !tieneTexto(row.detalle);
}

function isRowInvalid(row) {
  return isTipoInvalid(row) || isNombreInvalid(row) || isDetalleInvalid(row);
}

function validate() {
  saveAttempted.value = true;
  return rows.value.every(
    (row) => tieneTipo(row) && tieneTexto(row.nombre) && tieneTexto(row.detalle),
  );
}

// --- Alta de un tipo de programa nuevo ---
const dialogNuevoTipo = ref(false);
const nuevoTipo = ref("");
const filaNuevoTipo = ref(null);
const guardandoTipo = ref(false);

function abrirNuevoTipo(index) {
  filaNuevoTipo.value = index;
  nuevoTipo.value = "";
  dialogNuevoTipo.value = true;
}

function cerrarNuevoTipo() {
  dialogNuevoTipo.value = false;
  filaNuevoTipo.value = null;
  nuevoTipo.value = "";
}

async function crearTipo() {
  const tipo = String(nuevoTipo.value || "").trim().replace(/\s+/g, " ");
  if (!tipo || guardandoTipo.value) return;
  guardandoTipo.value = true;
  try {
    const res = await apiFetch(ENDPOINTS.MOF.PROGRAMAS_TIPOS, {
      method: "POST",
      body: JSON.stringify({ tipo }),
    });
    if (!res.ok) {
      const { message } = await getApiErrorMeta(res);
      mostrar(message || "No se pudo añadir el tipo de programa", "error");
      return;
    }
    const body = await res.json();
    const creado = normalizarTipo(body?.data ?? body);
    if (!creado) return;
    if (!tipos.value.some((t) => t.id === creado.id)) {
      tipos.value = [...tipos.value, creado];
    }
    if (filaNuevoTipo.value != null) {
      updateTipo(filaNuevoTipo.value, creado.id);
    }
    mostrar(`Tipo «${creado.tipo}» disponible`, "success");
    cerrarNuevoTipo();
  } catch (e) {
    mostrar("No se pudo añadir el tipo de programa", "error");
  } finally {
    guardandoTipo.value = false;
  }
}

defineExpose({
  validate,
  saveAttempted,
  abrirNuevoTipo,
  crearTipo,
  nuevoTipo,
  tipos,
});
</script>

<template>
  <div class="unidad-programa-table">
    <!-- Encabezado de la sección uniforme con inventarios/SIA -->
    <div class="d-flex align-center justify-space-between mb-2">
      <div>
        <div class="text-subtitle-2 font-weight-bold text-slate-800 d-flex align-center">
          <v-icon size="18" color="primary" class="mr-1">mdi-folder-multiple-outline</v-icon>
          Programas de la Unidad
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
        data-test="btn-add-programa-row"
        @click="addRow"
      >
        Añadir programa
      </v-btn>
    </div>

    <!-- Lista vacía -->
    <div
      v-if="rows.length === 0"
      class="pa-4 text-center rounded-lg border border-dashed bg-slate-50 text-caption text-medium-emphasis my-2"
    >
      <v-icon size="28" color="grey-lighten-1" class="mb-1 d-block mx-auto">mdi-folder-plus-outline</v-icon>
      <span>No hay programas registrados para esta unidad.</span>
      <span v-if="!readonly" class="d-block text-slate-500 mt-1">
        Presione <strong>«Añadir programa»</strong> para registrar uno.
      </span>
    </div>

    <!-- Lista de tarjetas de programas -->
    <div v-else class="d-flex flex-column gap-3 mt-2">
      <v-card
        v-for="(row, idx) in rows"
        :key="row.id || idx"
        variant="outlined"
        class="programa-card pa-3 pa-sm-4 rounded-lg bg-white"
        :class="{ 'border-error': isRowInvalid(row) }"
      >
        <!-- Encabezado de tarjeta -->
        <div class="d-flex align-center justify-space-between mb-3 pb-2 border-b">
          <div class="d-flex align-center ga-2">
            <v-chip size="x-small" color="primary" variant="flat" class="font-weight-bold">
              #{{ idx + 1 }}
            </v-chip>
            <span class="text-caption font-weight-bold text-slate-700">
              {{ row.nombre || tipoNombre(row) || 'NUEVO PROGRAMA' }}
            </span>
          </div>

          <v-btn
            v-if="!readonly"
            icon="mdi-delete-outline"
            size="small"
            variant="text"
            color="error"
            density="compact"
            title="Quitar programa"
            :data-test="`btn-remove-programa-${idx}`"
            @click="removeRow(idx)"
          />
        </div>

        <v-row dense>
          <!-- Nombre del programa -->
          <v-col cols="12" class="mb-2">
            <v-text-field
              :model-value="row.nombre"
              label="Nombre del programa *"
              density="compact"
              variant="outlined"
              hide-details="auto"
              :readonly="readonly"
              :error="isNombreInvalid(row)"
              :error-messages="isNombreInvalid(row) ? ['El nombre del programa es requerido'] : []"
              :data-test="`input-nombre-programa-${idx}`"
              @update:model-value="updateCampo(idx, 'nombre', $event)"
            >
              <template #prepend-inner>
                <v-icon size="16" color="primary">mdi-format-title</v-icon>
              </template>
            </v-text-field>
          </v-col>

          <!-- Tipo (catálogo, con alta de tipos nuevos) -->
          <v-col cols="12" sm="5">
            <v-autocomplete
              class="tipo-programa-select"
              :model-value="row.tipoId"
              :items="tiposItems"
              item-title="tipo"
              item-value="id"
              label="Tipo de programa *"
              density="compact"
              variant="outlined"
              hide-details="auto"
              :readonly="readonly"
              :error="isTipoInvalid(row)"
              :error-messages="isTipoInvalid(row) ? ['El tipo de programa es requerido'] : []"
              :data-test="`select-tipo-programa-${idx}`"
              @update:model-value="updateTipo(idx, $event)"
            >
              <template #prepend-inner>
                <v-icon size="16" color="primary">mdi-tag-outline</v-icon>
              </template>
              <template v-if="!readonly" #append-item>
                <v-divider class="my-1" />
                <v-list-item
                  prepend-icon="mdi-plus"
                  title="Añadir tipo de programa"
                  class="text-primary font-weight-bold"
                  :data-test="`btn-nuevo-tipo-programa-${idx}`"
                  @click="abrirNuevoTipo(idx)"
                />
              </template>
            </v-autocomplete>
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
              @update:model-value="updateCampo(idx, 'unidadIds', $event)"
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

          <!-- Detalle del programa -->
          <v-col cols="12" class="mt-2">
            <v-textarea
              :model-value="row.detalle"
              label="Detalle / Descripción del programa *"
              rows="2"
              auto-grow
              density="compact"
              variant="outlined"
              hide-details="auto"
              :readonly="readonly"
              :error="isDetalleInvalid(row)"
              :error-messages="isDetalleInvalid(row) ? ['El detalle del programa es requerido'] : []"
              :data-test="`input-detalle-programa-${idx}`"
              @update:model-value="updateCampo(idx, 'detalle', $event)"
            />
          </v-col>

          <!-- Resolución (texto libre, opcional) -->
          <v-col cols="12" class="mt-2">
            <v-text-field
              :model-value="row.resolucion"
              label="Resolución (opcional)"
              density="compact"
              variant="outlined"
              hide-details="auto"
              :readonly="readonly"
              :data-test="`input-resolucion-programa-${idx}`"
              @update:model-value="updateCampo(idx, 'resolucion', $event)"
            >
              <template #prepend-inner>
                <v-icon size="16" color="primary">mdi-file-document-outline</v-icon>
              </template>
            </v-text-field>
          </v-col>
        </v-row>
      </v-card>
    </div>

    <!-- Alta de un tipo de programa nuevo -->
    <v-dialog v-model="dialogNuevoTipo" max-width="440">
      <v-card class="pa-4 rounded-lg">
        <div class="text-subtitle-1 font-weight-bold mb-1">Nuevo tipo de programa</div>
        <div class="text-caption text-slate-500 mb-3">
          Quedará disponible para todas las unidades.
        </div>
        <v-text-field
          v-model="nuevoTipo"
          label="Tipo de programa *"
          density="compact"
          variant="outlined"
          hide-details="auto"
          autofocus
          data-test="input-nuevo-tipo-programa"
          @keydown.enter.prevent="crearTipo"
        />
        <div class="d-flex justify-end ga-2 mt-4">
          <v-btn variant="text" @click="cerrarNuevoTipo">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="guardandoTipo"
            :disabled="!nuevoTipo || !nuevoTipo.trim()"
            data-test="btn-guardar-nuevo-tipo-programa"
            @click="crearTipo"
          >
            Añadir
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.unidad-programa-table :deep(.v-card.border-error) {
  border-color: #ef4444 !important;
}
.gap-3 {
  gap: 12px;
}
.programa-card {
  border-color: #e2e8f0;
  transition: border-color 0.15s ease-in-out;
}
.programa-card:hover {
  border-color: #cbd5e1;
}
</style>
