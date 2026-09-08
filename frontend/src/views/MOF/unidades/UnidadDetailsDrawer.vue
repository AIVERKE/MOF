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

const { xs, sm, md } = useDisplay();

// Ancho responsivo: xs=100%, sm=90%, md=480px, lg/xl=520px
const drawerWidth = computed(() => {
  if (xs.value) return "100%";
  if (sm.value) return "90%";
  if (md.value) return 480;
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

// Definición declarativa de los 10 paneles
const panels = computed(() => {
  const data = props.detailData;
  return [
    {
      key: "nivel",
      title: "NIVEL",
      type: "text",
      value: props.getNivelNombre ? props.getNivelNombre(data?.nivel) : data?.nivel,
      emptyText: "---",
    },
    {
      key: "tipo",
      title: "TIPO",
      type: "text",
      value: props.getTipoNombre ? props.getTipoNombre(data?.tipo) : data?.tipo,
      emptyText: "---",
    },
    {
      key: "relacion",
      title: "RELACIÓN",
      type: "text",
      value: props.getRelacionNombre
        ? props.getRelacionNombre(data?.relacion)
        : data?.relacion,
      emptyText: "---",
    },
    {
      key: "clase",
      title: "CLASE",
      type: "text",
      value: props.getClaseNombre ? props.getClaseNombre(data?.clase) : data?.clase,
      emptyText: "---",
    },
    {
      key: "resolucion",
      title: "RESOLUCIÓN CREACIÓN",
      type: "text",
      value: data?.resCreacion || data?.res_creacion,
      emptyText: "---",
    },
    {
      key: "base_legal",
      title: "BASE LEGAL",
      type: "text",
      value: data?.baseLegal || data?.base_legal,
      emptyText: "---",
    },
    {
      key: "cargos",
      title: "CARGOS",
      type: "cargos",
    },
    {
      key: "dependencias",
      title: "DEPENDENCIAS",
      type: "dependencias",
    },
    {
      key: "objetivo",
      title: "OBJETIVO",
      type: "objetivo",
    },
    {
      key: "funciones",
      title: "FUNCIONES",
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
            {{ panel.title }}
          </v-expansion-panel-title>

          <v-expansion-panel-text class="px-3 py-2 text-slate-800">
            <!-- Panel tipo texto simple -->
            <template v-if="panel.type === 'text'">
              <div class="text-caption font-weight-bold text-slate-800">
                {{ panel.value || panel.emptyText }}
              </div>
            </template>

            <!-- Panel Cargos -->
            <template v-else-if="panel.type === 'cargos'">
              <div v-if="detailData.cargos_detalle?.length">
                <div
                  v-for="c in detailData.cargos_detalle"
                  :key="c.id"
                  class="text-caption font-weight-medium mb-1 line-height-1-2 text-slate-700"
                >
                  • {{ c.nombre || c.descripcion }}
                </div>
              </div>
              <div v-else class="text-caption text-grey font-italic">
                Sin cargos registrados.
              </div>
            </template>

            <!-- Panel Dependencias -->
            <template v-else-if="panel.type === 'dependencias'">
              <div v-if="detailData.dependencias_nombres?.length">
                <div
                  v-for="name in detailData.dependencias_nombres"
                  :key="name"
                  class="text-caption font-weight-medium mb-1 text-indigo-darken-3 line-height-1-2"
                >
                  • {{ name }}
                </div>
              </div>
              <div v-else class="text-caption text-grey font-italic">
                Sin dependencias registradas.
              </div>
            </template>

            <!-- Panel Objetivo -->
            <template v-else-if="panel.type === 'objetivo'">
              <div class="text-caption text-justify font-weight-medium line-height-1-3 text-slate-800">
                {{ detailData.objetivo_display || "Sin objetivo registrado." }}
              </div>
            </template>

            <!-- Panel Funciones (MOF-007) -->
            <template v-else-if="panel.type === 'funciones'">
              <v-card
                v-if="detailData.funciones?.length"
                variant="outlined"
                class="rounded-md border-slate-200 overflow-hidden"
              >
                <v-table density="compact">
                  <thead>
                    <tr class="bg-slate-100 border-b-slate">
                      <th class="text-xxs font-weight-black px-2 border-r-slate">FUNCIÓN</th>
                      <th class="text-xxs font-weight-black px-2">BASE LEGAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="f in detailData.funciones"
                      :key="f.id"
                      class="border-b-slate"
                    >
                      <td class="text-xxs font-weight-bold py-1 px-2 border-r-slate">
                        {{ f.funcion }}
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
  min-height: 38px !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  letter-spacing: 0.5px;
}

.unidad-accordion :deep(.v-expansion-panel-title--active) {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

:deep(.v-theme--dark) .unidad-accordion .v-expansion-panel-title--active {
  background-color: rgba(var(--v-theme-primary), 0.15);
}

.unidad-accordion :deep(.v-expansion-panel-title__icon .v-icon) {
  color: rgb(var(--v-theme-primary));
  font-size: 18px;
}

.gap-1 {
  gap: 4px;
}
</style>
