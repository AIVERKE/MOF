<script setup>
import { ref, computed, watch } from "vue";
import { useDisplay } from "vuetify";

const props = defineProps({
  modelValue: Boolean,
  detailData: Object,
  loading: Boolean,
  getNivelNombre: Function,
  getTipoNombre: Function,
  getRelacionNombre: Function,
  getClaseNombre: Function,
});

const emit = defineEmits(["update:modelValue", "edit", "reporte"]);

const display = useDisplay();

// Ancho responsivo: xs=100%, sm=90%, md=480px, lg/xl=520px
const drawerWidth = computed(() => {
  if (display.xs.value) return "100%";
  if (display.sm.value) return "90%";
  if (display.md.value) return 480;
  return 520;
});

// Paneles abiertos (colapsados por defecto)
const openedPanels = ref([]);

// Reiniciar a todo colapsado al abrir el drawer o cambiar de unidad
watch(
  () => [props.modelValue, props.detailData?.id],
  ([isOpen]) => {
    if (isOpen) {
      openedPanels.value = [];
    }
  }
);

function close() {
  emit("update:modelValue", false);
}

// Definición declarativa de los 10 paneles con iconos, colores y badges
const panels = computed(() => {
  const data = props.detailData;
  if (!data) return [];

  const cargosCount = data.cargos_detalle?.length ?? 0;
  const depCount = data.dependencias_nombres?.length ?? 0;
  const funcCount = data.funciones?.length ?? 0;

  return [
    {
      key: "nivel",
      title: "NIVEL",
      icon: "mdi-layers-outline",
      avatarColor: "teal",
      type: "text",
      value: props.getNivelNombre ? props.getNivelNombre(data.nivel) : data.nivel,
      emptyText: "---",
    },
    {
      key: "tipo",
      title: "TIPO",
      icon: "mdi-shape-outline",
      avatarColor: "indigo",
      type: "text",
      value: props.getTipoNombre ? props.getTipoNombre(data.tipo) : data.tipo,
      emptyText: "---",
    },
    {
      key: "relacion",
      title: "RELACIÓN",
      icon: "mdi-transit-connection-variant",
      avatarColor: "purple",
      type: "text",
      value: props.getRelacionNombre
        ? props.getRelacionNombre(data.relacion)
        : data.relacion,
      emptyText: "---",
    },
    {
      key: "clase",
      title: "CLASE",
      icon: "mdi-briefcase-outline",
      avatarColor: "blue-grey",
      type: "text",
      value: props.getClaseNombre ? props.getClaseNombre(data.clase) : data.clase,
      emptyText: "---",
    },
    {
      key: "resolucion",
      title: "RESOLUCIÓN CREACIÓN",
      icon: "mdi-file-certificate-outline",
      avatarColor: "amber-darken-2",
      type: "text",
      value: data.resCreacion || data.res_creacion,
      emptyText: "---",
    },
    {
      key: "base_legal",
      title: "BASE LEGAL",
      icon: "mdi-scale-balance",
      avatarColor: "cyan-darken-1",
      type: "text",
      value: data.baseLegal || data.base_legal,
      emptyText: "---",
    },
    {
      key: "cargos",
      title: "CARGOS",
      icon: "mdi-account-tie-outline",
      avatarColor: "deep-orange",
      badge: cargosCount > 0 ? cargosCount : null,
      type: "cargos",
    },
    {
      key: "dependencias",
      title: "DEPENDENCIAS",
      icon: "mdi-file-tree-outline",
      avatarColor: "deep-purple",
      badge: depCount > 0 ? depCount : null,
      type: "dependencias",
    },
    {
      key: "objetivo",
      title: "OBJETIVO",
      icon: "mdi-bullseye-arrow",
      avatarColor: "primary",
      type: "objetivo",
    },
    {
      key: "funciones",
      title: "FUNCIONES",
      icon: "mdi-clipboard-list-outline",
      avatarColor: "green-darken-1",
      badge: funcCount > 0 ? funcCount : null,
      type: "funciones",
    },
  ];
});
</script>

<template>
  <v-navigation-drawer
    :model-value="modelValue"
    @update:model-value="(val) => emit('update:modelValue', val)"
    location="right"
    temporary
    :width="drawerWidth"
    elevation="10"
    class="unidad-details-drawer"
  >
    <v-toolbar :color="detailData?.color || 'primary'" dark density="compact">
      <v-toolbar-title class="text-caption font-weight-bold">Detalles de la Unidad</v-toolbar-title>
      <v-spacer />
      <v-btn icon size="small" @click="close">
        <v-icon size="20">mdi-close</v-icon>
        <v-tooltip activator="parent" location="bottom">Cerrar detalles</v-tooltip>
      </v-btn>
    </v-toolbar>

    <v-progress-linear v-if="loading" indeterminate color="primary" height="2" />

    <div v-if="detailData" class="pa-3 bg-slate-50 drawer-content d-flex flex-column">
      <!-- Identificación de la unidad -->
      <div class="mb-3">
        <div class="text-subtitle-2 font-weight-black mb-1 line-height-1-1">
          {{ detailData.nombre_display }}
        </div>
        <div class="d-flex align-center flex-wrap gap-1">
          <v-chip
            size="x-small"
            label
            color="grey-darken-4"
            class="font-weight-black"
            style="font-size: 9px !important;"
          >
            CÓDIGO: {{ detailData.codigo }}
          </v-chip>
          <v-chip
            v-if="detailData.sigla"
            size="x-small"
            label
            color="primary"
            variant="tonal"
            class="font-weight-black"
            style="font-size: 9px !important;"
          >
            SIGLA: {{ detailData.sigla }}
          </v-chip>
        </div>
      </div>

      <v-divider class="mb-3" />

      <!-- Acordeón de 10 paneles declarativos -->
      <v-expansion-panels
        v-model="openedPanels"
        multiple
        variant="accordion"
        class="unidad-accordion"
      >
        <v-expansion-panel
          v-for="panel in panels"
          :key="panel.key"
          :value="panel.key"
          class="mb-2 rounded border-slate-200 overflow-hidden"
          elevation="0"
        >
          <v-expansion-panel-title
            class="text-xxs font-weight-black text-primary text-uppercase px-3 py-2 accordion-title"
          >
            <div class="d-flex align-center w-100 pr-2">
              <v-icon size="16" color="primary" class="mr-2 flex-shrink-0">
                {{ panel.icon }}
              </v-icon>
              <span class="font-weight-bold text-truncate">{{ panel.title }}</span>
              <v-spacer />
              <v-chip
                v-if="panel.badge !== undefined && panel.badge !== null"
                size="x-small"
                color="primary"
                variant="flat"
                class="font-weight-black px-2 mr-2"
                style="height: 18px; font-size: 10px;"
              >
                {{ panel.badge }}
              </v-chip>
            </div>
          </v-expansion-panel-title>

          <v-expansion-panel-text class="px-3 py-2 text-slate-800">
            <!-- Panel tipo texto simple con icono y presentación viva -->
            <template v-if="panel.type === 'text'">
              <div class="d-flex align-center py-1">
                <v-avatar
                  size="26"
                  :color="panel.avatarColor || 'primary'"
                  variant="tonal"
                  class="mr-2 flex-shrink-0"
                >
                  <v-icon size="14">{{ panel.icon }}</v-icon>
                </v-avatar>
                <span class="text-caption font-weight-bold text-slate-800">
                  {{ panel.value || panel.emptyText }}
                </span>
              </div>
            </template>

            <!-- Panel Cargos con viñetas estilizadas e icono -->
            <template v-else-if="panel.type === 'cargos'">
              <div v-if="detailData.cargos_detalle?.length" class="d-flex flex-column gap-1">
                <div
                  v-for="c in detailData.cargos_detalle"
                  :key="c.id"
                  class="d-flex align-center py-1 px-2 rounded bg-slate-100 border-b-thin"
                >
                  <v-icon size="15" color="deep-orange-darken-1" class="mr-2 flex-shrink-0">
                    mdi-account-tie
                  </v-icon>
                  <span class="text-caption font-weight-medium text-slate-800 line-height-1-2">
                    {{ c.nombre || c.descripcion }}
                  </span>
                </div>
              </div>
              <div v-else class="d-flex align-center text-caption text-grey py-1">
                <v-icon size="16" class="mr-1 text-grey-lighten-1">mdi-information-outline</v-icon>
                <span class="font-italic">Sin cargos registrados.</span>
              </div>
            </template>

            <!-- Panel Dependencias con viñetas estilizadas e icono -->
            <template v-else-if="panel.type === 'dependencias'">
              <div v-if="detailData.dependencias_nombres?.length" class="d-flex flex-column gap-1">
                <div
                  v-for="name in detailData.dependencias_nombres"
                  :key="name"
                  class="d-flex align-center py-1 px-2 rounded bg-slate-100 border-b-thin"
                >
                  <v-icon size="15" color="indigo-darken-2" class="mr-2 flex-shrink-0">
                    mdi-source-branch
                  </v-icon>
                  <span class="text-caption font-weight-medium text-indigo-darken-3 line-height-1-2">
                    {{ name }}
                  </span>
                </div>
              </div>
              <div v-else class="d-flex align-center text-caption text-grey py-1">
                <v-icon size="16" class="mr-1 text-grey-lighten-1">mdi-information-outline</v-icon>
                <span class="font-italic">Sin dependencias registradas.</span>
              </div>
            </template>

            <!-- Panel Objetivo con bloque destacado -->
            <template v-else-if="panel.type === 'objetivo'">
              <div class="pa-3 rounded bg-slate-100 border-s-lg border-primary">
                <div class="d-flex align-start">
                  <v-icon size="16" color="primary" class="mr-2 mt-0-5 flex-shrink-0">
                    mdi-bullseye-arrow
                  </v-icon>
                  <div class="text-caption text-justify font-weight-medium line-height-1-4 text-slate-800">
                    {{ detailData.objetivo_display || "Sin objetivo registrado." }}
                  </div>
                </div>
              </div>
            </template>

            <!-- Panel Funciones (MOF-007) con tabla con divisores reforzados -->
            <template v-else-if="panel.type === 'funciones'">
              <v-card
                v-if="detailData.funciones?.length"
                variant="outlined"
                class="rounded-md border-slate-200 overflow-hidden"
              >
                <v-table density="compact">
                  <thead>
                    <tr class="bg-slate-100 border-b-slate">
                      <th class="text-xxs font-weight-black px-2 border-r-slate">
                        <v-icon size="13" color="primary" class="mr-1">mdi-cog-outline</v-icon>
                        FUNCIÓN
                      </th>
                      <th class="text-xxs font-weight-black px-2">
                        <v-icon size="13" color="primary" class="mr-1">mdi-scale-balance</v-icon>
                        BASE LEGAL
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="f in detailData.funciones"
                      :key="f.id"
                      class="border-b-slate"
                    >
                      <td class="text-xxs font-weight-bold py-1 px-2 border-r-slate">
                        <div class="d-flex align-start">
                          <v-icon size="10" color="primary" class="mr-1 mt-1 flex-shrink-0">
                            mdi-circle-small
                          </v-icon>
                          <span>{{ f.funcion }}</span>
                        </div>
                      </td>
                      <td class="text-xxs font-weight-black py-1 px-2">
                        {{ f.baseLegal }}
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card>
              <v-alert
                v-else
                type="warning"
                variant="tonal"
                density="compact"
                class="text-xxs"
              >
                Sin funciones asignadas.
              </v-alert>
            </template>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <!-- Botones de Acción (Intactos) -->
      <div class="d-flex flex-column gap-1 mt-4">
        <v-btn
          color="primary"
          block
          prepend-icon="mdi-pencil"
          size="small"
          @click="emit('edit', detailData.id)"
        >
          Editar Información
          <v-tooltip activator="parent" location="top">Abrir formulario</v-tooltip>
        </v-btn>
        <v-btn
          variant="flat"
          block
          prepend-icon="mdi-file-pdf-box"
          color="error"
          size="small"
          @click="emit('reporte', detailData.id)"
        >
          Exportar PDF
          <v-tooltip activator="parent" location="top">Generar reporte oficial</v-tooltip>
        </v-btn>
      </div>
    </div>
  </v-navigation-drawer>
</template>

<style scoped>
/* Responsive width enforcement */
.unidad-details-drawer {
  max-width: 100vw !important;
}

@media (max-width: 599.99px) {
  .unidad-details-drawer,
  :deep(.unidad-details-drawer) {
    width: 100vw !important;
    max-width: 100vw !important;
  }
}

@media (min-width: 600px) and (max-width: 959.99px) {
  .unidad-details-drawer,
  :deep(.unidad-details-drawer) {
    width: 90vw !important;
    max-width: 90vw !important;
  }
}

@media (min-width: 960px) and (max-width: 1279.99px) {
  .unidad-details-drawer,
  :deep(.unidad-details-drawer) {
    width: 480px !important;
    max-width: 480px !important;
  }
}

@media (min-width: 1280px) {
  .unidad-details-drawer,
  :deep(.unidad-details-drawer) {
    width: 520px !important;
    max-width: 520px !important;
  }
}

.drawer-content {
  min-height: calc(100% - 48px);
  overflow-x: hidden;
}

.text-xxs {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.unidad-accordion {
  width: 100%;
}

.unidad-accordion :deep(.v-expansion-panel) {
  background-color: #ffffff;
}

:deep(.v-theme--dark) .unidad-accordion .v-expansion-panel {
  background-color: #1e293b;
}

.accordion-title {
  min-height: 40px !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  letter-spacing: 0.5px;
}

.unidad-accordion :deep(.v-expansion-panel-title--active) {
  background-color: rgba(var(--v-theme-primary), 0.06);
}

:deep(.v-theme--dark) .unidad-accordion .v-expansion-panel-title--active {
  background-color: rgba(var(--v-theme-primary), 0.18);
}

.unidad-accordion :deep(.v-expansion-panel-title__icon .v-icon) {
  color: rgb(var(--v-theme-primary));
  font-size: 18px;
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}

.mt-0-5 {
  margin-top: 2px;
}
</style>
