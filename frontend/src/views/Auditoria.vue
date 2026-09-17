<script setup>
import { onMounted, ref } from "vue";
import { apiFetch, ENDPOINTS, parseApiError } from "@/config/api";
import { useSnackbar } from "@/composables/useSnackbar";

const { mostrar } = useSnackbar();

const loading = ref(false);
const items = ref([]);
const total = ref(0);
const page = ref(1);
const limit = ref(20);
const filtroTabla = ref("");
const filtroAccion = ref(null);

const ACCIONES = ["CREATE", "UPDATE", "DELETE", "VERSION"];

const headers = [
  { title: "Fecha", key: "createdAt", sortable: false },
  { title: "Tabla", key: "tablaAfectada", sortable: false },
  { title: "Acción", key: "accion", sortable: false },
  { title: "Registro", key: "idRegistroOriginal", sortable: false },
  { title: "Usuario", key: "usuario", sortable: false },
];

function formatFecha(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-BO", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return String(value);
  }
}

function usuarioLabel(row) {
  if (row?.usuario?.email) return row.usuario.email;
  if (row?.usuario?.nombre) return row.usuario.nombre;
  if (row?.idUsuario) return `#${row.idUsuario}`;
  return "—";
}

async function load() {
  loading.value = true;
  try {
    const params = new URLSearchParams({
      page: String(page.value),
      limit: String(limit.value),
    });
    if (filtroTabla.value?.trim()) {
      params.set("tabla_afectada", filtroTabla.value.trim());
    }
    if (filtroAccion.value) {
      params.set("accion", filtroAccion.value);
    }
    const response = await apiFetch(
      `${ENDPOINTS.VERSIONES.LIST}?${params.toString()}`,
    );
    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }
    const json = await response.json();
    items.value = json.data || [];
    total.value = json.total ?? items.value.length;
  } catch (err) {
    items.value = [];
    total.value = 0;
    mostrar(err?.message || "No se pudo cargar la auditoría", "error");
  } finally {
    loading.value = false;
  }
}

function onPageChange(nextPage) {
  page.value = nextPage;
  load();
}

function buscar() {
  page.value = 1;
  load();
}

onMounted(load);
</script>

<template>
  <v-container fluid class="pa-0">
    <div class="mb-6 d-flex flex-wrap align-center justify-space-between ga-3">
      <div>
        <h1 class="text-h4 font-weight-black mb-1 text-slate-800">Auditoría</h1>
        <div class="text-body-2 d-flex align-center text-slate-500">
          <v-icon size="18" class="mr-2">mdi-history</v-icon>
          <span>Seguridad</span>
          <v-icon size="16" class="mx-1">mdi-chevron-right</v-icon>
          <span class="font-weight-bold text-primary">Historial de cambios</span>
        </div>
      </div>
      <v-btn variant="tonal" prepend-icon="mdi-cog" to="/configuracion">
        Volver a configuración
      </v-btn>
    </div>

    <v-card class="rounded-xl border-0 shadow-sm" elevation="3">
      <v-card-text class="pa-4">
        <v-row dense align="center">
          <v-col cols="12" sm="4" md="3">
            <v-text-field
              v-model="filtroTabla"
              label="Tabla afectada"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              placeholder="ej. usuario"
              @keyup.enter="buscar"
            />
          </v-col>
          <v-col cols="12" sm="4" md="3">
            <v-select
              v-model="filtroAccion"
              :items="ACCIONES"
              label="Acción"
              density="compact"
              variant="outlined"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" sm="4" md="3">
            <v-btn color="primary" variant="tonal" @click="buscar">
              Filtrar
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
      <v-divider />
      <v-data-table
        :headers="headers"
        :items="items"
        :loading="loading"
        :items-per-page="limit"
        hide-default-footer
        class="bg-transparent"
      >
        <template #item.createdAt="{ item }">
          {{ formatFecha(item.createdAt) }}
        </template>
        <template #item.accion="{ item }">
          <v-chip size="small" variant="tonal">{{ item.accion }}</v-chip>
        </template>
        <template #item.idRegistroOriginal="{ item }">
          {{ item.idRegistroOriginal ?? "—" }}
        </template>
        <template #item.usuario="{ item }">
          {{ usuarioLabel(item) }}
        </template>
        <template #bottom>
          <div class="d-flex justify-center pa-4">
            <v-pagination
              :model-value="page"
              :length="Math.max(1, Math.ceil(total / limit))"
              :total-visible="7"
              @update:model-value="onPageChange"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<style scoped>
.shadow-sm {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05) !important;
}
</style>
