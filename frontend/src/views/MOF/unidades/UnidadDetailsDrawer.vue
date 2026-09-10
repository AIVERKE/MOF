<script setup>
import { ref, computed, watch, onUnmounted } from "vue";
import { useDisplay } from "vuetify";
import UnidadActionsMenu from "./UnidadActionsMenu.vue";

const props = defineProps({
  modelValue: Boolean,
  detailData: Object,
  loading: Boolean,
  getNivelNombre: Function,
  getTipoNombre: Function,
  getRelacionNombre: Function,
  getClaseNombre: Function,
  /** Panel keys to expand when opening (e.g. ['dependencias']) */
  initialOpenPanels: { type: Array, default: () => [] },
});

const emit = defineEmits([
  "update:modelValue",
  "edit",
  "reporte",
  "details",
  "pdf",
  "dependencias",
  "add-child",
  "delete",
]);

const display = useDisplay();

// Ancho ajustable y redimensionable con arrastre
const customWidth = ref(520);
const isResizing = ref(false);

const drawerWidth = computed(() => {
  if (display.xs.value) return "100%";
  return customWidth.value;
});

const drawerStyle = computed(() => {
  if (display.xs.value) {
    return { width: "100% !important", maxWidth: "100vw !important" };
  }
  return {
    width: `${customWidth.value}px !important`,
    maxWidth: "95vw !important",
  };
});

// Lógica de Redimensionamiento (Mouse)
const startResizing = (e) => {
  e?.preventDefault?.();
  e?.stopPropagation?.();
  isResizing.value = true;
  document.addEventListener("mousemove", handleResize);
  document.addEventListener("mouseup", stopResizing);
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
};

const handleResize = (e) => {
  if (!isResizing.value) return;
  const minWidth = 360;
  const maxWidth = Math.min(1400, Math.floor(window.innerWidth * 0.95));
  const newWidth = window.innerWidth - e.clientX;
  customWidth.value = Math.max(minWidth, Math.min(maxWidth, newWidth));
};

const stopResizing = () => {
  if (!isResizing.value) return;
  isResizing.value = false;
  document.removeEventListener("mousemove", handleResize);
  document.removeEventListener("mouseup", stopResizing);
  document.body.style.cursor = "default";
  document.body.style.userSelect = "";
};

// Soporte Táctil (Móviles / Tablets)
const startResizingTouch = (e) => {
  isResizing.value = true;
  document.addEventListener("touchmove", handleResizeTouch, { passive: false });
  document.addEventListener("touchend", stopResizingTouch);
};

const handleResizeTouch = (e) => {
  if (isResizing.value && e.touches.length > 0) {
    e.preventDefault?.();
    const minWidth = 360;
    const maxWidth = Math.min(1400, Math.floor(window.innerWidth * 0.95));
    const newWidth = window.innerWidth - e.touches[0].clientX;
    customWidth.value = Math.max(minWidth, Math.min(maxWidth, newWidth));
  }
};

const stopResizingTouch = () => {
  if (!isResizing.value) return;
  isResizing.value = false;
  document.removeEventListener("touchmove", handleResizeTouch);
  document.removeEventListener("touchend", stopResizingTouch);
};

onUnmounted(() => {
  stopResizing();
  stopResizingTouch();
});

// Paneles abiertos (colapsados por defecto)
const openedPanels = ref([]);

// Reiniciar paneles al abrir el drawer o cambiar de unidad
watch(
  () => [props.modelValue, props.detailData?.id, props.initialOpenPanels],
  ([isOpen]) => {
    if (isOpen) {
      const mapped = (props.initialOpenPanels || []).map((k) =>
        k === "dependencias" ? "dependencias_funcionales" : k,
      );
      openedPanels.value = [...mapped];
    }
  },
);

function close() {
  emit("update:modelValue", false);
}

function formatFecha(val) {
  if (!val) return null;
  try {
    const s = String(val);
    if (s.includes("-")) {
      const p = s.split("T")[0].split("-");
      if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
    }
    return s;
  } catch {
    return String(val);
  }
}

// Definición declarativa de los 26 paneles S-MAU con títulos exactos
const panels = computed(() => {
  const data = props.detailData;
  if (!data) return [];

  const cargosCount = data.cargos_detalle?.length ?? 0;
  const depFuncCount =
    (data.dependencias_nombres?.length ||
      data.dependenciasFuncionales?.length) ??
    0;
  const hijasLinCount = data.hijas_lineales?.length ?? 0;
  const hijasFuncCount = data.hijas_funcionales?.length ?? 0;
  const relIntCount = data.relaciones_internas?.length ?? 0;
  const relExtCount = data.relaciones_externas?.length ?? 0;
  const funcCount = data.funciones?.length ?? 0;

  return [
    {
      key: "nombre",
      title: "NOMBRE DE LA UNIDAD ORGANIZACIONAL",
      icon: "mdi-office-building-outline",
      avatarColor: "blue-grey-darken-1",
      type: "text",
      value: data.nombre_display || data.nombre,
      emptyText: "---",
    },
    {
      key: "sigla",
      title: "SIGLA",
      icon: "mdi-tag-outline",
      avatarColor: "primary",
      type: "text",
      value: data.sigla,
      emptyText: "---",
    },
    {
      key: "codigo",
      title: "CÓDIGO",
      icon: "mdi-barcode",
      avatarColor: "grey-darken-3",
      type: "text",
      value: data.codigo,
      emptyText: "---",
    },
    {
      key: "resolucion",
      title: "RESOLUCIÓN DE CREACIÓN",
      icon: "mdi-file-certificate-outline",
      avatarColor: "amber-darken-2",
      type: "text",
      value: data.resCreacion || data.res_creacion,
      emptyText: "---",
    },
    {
      key: "fec_creacion",
      title: "FECHA DE CREACIÓN",
      icon: "mdi-calendar-range",
      avatarColor: "deep-purple",
      type: "text",
      value: formatFecha(data.fec_creacion || data.fecCreacion),
      emptyText: "---",
    },
    {
      key: "clase",
      title: "NIVEL DE AUTORIDAD",
      icon: "mdi-briefcase-outline",
      avatarColor: "blue-grey",
      type: "text",
      value: props.getClaseNombre ? props.getClaseNombre(data.clase) : data.clase,
      emptyText: "---",
    },
    {
      key: "nivel",
      title: "NIVEL JERÁRQUICO",
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
      key: "dependencia_lineal",
      title: "DEPENDENCIA LINEAL",
      icon: "mdi-arrow-up-bold-box-outline",
      avatarColor: "blue-darken-3",
      type: "text",
      value:
        data.dependencia_lineal_nombre ||
        data.parent?.nombre ||
        data.dependencia,
      emptyText: "--- (Raíz / Sin superior lineal)",
    },
    {
      key: "dependencias_funcionales",
      title: "DEPENDENCIA FUNCIONAL",
      icon: "mdi-source-branch",
      avatarColor: "deep-purple-accent-3",
      badge: depFuncCount > 0 ? depFuncCount : null,
      type: "dependencias_funcionales",
    },
    {
      key: "unidades_dependientes_lineal",
      title: "UNIDADES DEPENDIENTES (LINEAL)",
      icon: "mdi-file-tree-outline",
      avatarColor: "teal-darken-1",
      badge: hijasLinCount > 0 ? hijasLinCount : null,
      type: "hijas_lineales",
    },
    {
      key: "unidades_dependientes_funcional",
      title: "UNIDADES DEPENDIENTES (FUNCIONAL)",
      icon: "mdi-routes",
      avatarColor: "deep-purple-darken-1",
      badge: hijasFuncCount > 0 ? hijasFuncCount : null,
      type: "hijas_funcionales",
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
      title: "FUNCIONES Y BASE LEGAL",
      icon: "mdi-clipboard-list-outline",
      avatarColor: "green-darken-1",
      badge: funcCount > 0 ? funcCount : null,
      type: "funciones",
    },
    {
      key: "relaciones_internas",
      title: "RELACIONAMIENTO Y COORDINACIÓN INTERNA",
      icon: "mdi-account-switch-outline",
      avatarColor: "indigo-darken-1",
      badge: relIntCount > 0 ? relIntCount : null,
      type: "relaciones_internas",
    },
    {
      key: "relaciones_externas",
      title: "RELACIONAMIENTO Y COORDINACIÓN INTERINSTITUCIONAL",
      icon: "mdi-domain",
      avatarColor: "blue-darken-2",
      badge: relExtCount > 0 ? relExtCount : null,
      type: "relaciones_externas",
    },
    {
      key: "cargos",
      title: "PERSONAL (FIJO)",
      icon: "mdi-account-tie-outline",
      avatarColor: "deep-orange",
      badge: cargosCount > 0 ? cargosCount : null,
      type: "cargos",
    },
    {
      key: "tramites_atendidos",
      title: "TRÁMITES ATENDIDOS",
      icon: "mdi-file-document-multiple-outline",
      avatarColor: "amber-darken-3",
      type: "text_multiline",
      value: data.tramites_atendidos || data.tramitesAtendidos,
    },
    {
      key: "ejecucion_poa",
      title: "EJECUCIÓN POA",
      icon: "mdi-chart-line",
      avatarColor: "light-blue-darken-2",
      type: "text_multiline",
      value: data.ejecucion_poa || data.ejecucionPoa,
    },
    {
      key: "ejecucion_presupuestaria",
      title: "EJECUCIÓN PRESUPUESTARIA",
      icon: "mdi-cash-multiple",
      avatarColor: "green-darken-2",
      type: "text_multiline",
      value: data.ejecucion_presupuestaria || data.ejecucionPresupuestaria,
    },
    {
      key: "carga_horaria_programada",
      title: "CARGA HORARIA PROGRAMADA",
      icon: "mdi-clock-outline",
      avatarColor: "orange-darken-2",
      type: "text_multiline",
      value: data.carga_horaria_programada || data.cargaHorariaProgramada,
    },
    {
      key: "carga_horaria_ejecutada",
      title: "CARGA HORARIA EJECUTADA",
      icon: "mdi-clock-check-outline",
      avatarColor: "deep-orange-darken-2",
      type: "text_multiline",
      value: data.carga_horaria_ejecutada || data.cargaHorariaEjecutada,
    },
    {
      key: "infraestructura",
      title: "INFRAESTRUCTURA FÍSICA ULITIZADA",
      icon: "mdi-domain-plus",
      avatarColor: "blue-grey-darken-2",
      type: "text_multiline",
      value: data.infraestructura || data.infraestructura_fisica,
    },
    {
      key: "ubicacion",
      title: "UBICACIÓN",
      icon: "mdi-map-marker-outline",
      avatarColor: "red-darken-1",
      type: "text_multiline",
      value: data.ubicacion,
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
    :style="drawerStyle"
    elevation="10"
    :class="['unidad-details-drawer', { 'is-resizing': isResizing }]"
  >
    <!-- Asa lateral izquierda para redimensionar arrastrando con el mouse -->
    <div
      v-if="!display.xs.value"
      class="resize-handle"
      @mousedown.prevent="startResizing"
      @touchstart.prevent="startResizingTouch"
      title="Arrastre para modificar el ancho del panel"
    >
      <div class="resize-handle-bar"></div>
    </div>

    <v-toolbar :color="detailData?.color || 'primary'" dark density="compact">
      <v-toolbar-title class="text-caption font-weight-bold">Detalles de la Unidad</v-toolbar-title>
      <v-spacer />
      <!-- Botón para alternar ancho normal (520px) o expandido (850px) -->
      <v-btn
        v-if="!display.xs.value"
        icon
        size="small"
        @click="customWidth = customWidth > 650 ? 520 : 850"
      >
        <v-icon size="18">{{ customWidth > 650 ? 'mdi-arrow-collapse-right' : 'mdi-arrow-expand-left' }}</v-icon>
        <v-tooltip activator="parent" location="bottom">
          {{ customWidth > 650 ? 'Ancho estándar (520px)' : 'Expandir panel (850px)' }}
        </v-tooltip>
      </v-btn>
      <UnidadActionsMenu
        v-if="detailData?.id"
        :unidad-id="detailData.id"
        :show-quick-actions="false"
        :show-details="false"
        density="compact"
        activator-color="white"
        @pdf="(id) => emit('pdf', id)"
        @dependencias="(id) => emit('dependencias', id)"
        @add-child="(id) => emit('add-child', id)"
        @edit="(id) => emit('edit', id)"
        @delete="(id) => emit('delete', id)"
      />
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

            <!-- Panel tipo texto multilínea / observaciones -->
            <template v-else-if="panel.type === 'text_multiline'">
              <div v-if="panel.value" class="pa-2 rounded bg-slate-100 border-b-thin">
                <div class="text-caption text-slate-800 line-height-1-4" style="white-space: pre-wrap;">
                  {{ panel.value }}
                </div>
              </div>
              <div v-else class="d-flex align-center text-caption text-grey py-1">
                <v-icon size="16" class="mr-1 text-grey-lighten-1">mdi-information-outline</v-icon>
                <span class="font-italic">Sin información registrada.</span>
              </div>
            </template>

            <!-- Panel Dependencia Funcional -->
            <template v-else-if="panel.type === 'dependencias_funcionales'">
              <div
                v-if="(detailData.dependenciasFuncionales && detailData.dependenciasFuncionales.length) || (detailData.dependencias_nombres && detailData.dependencias_nombres.length)"
                class="d-flex flex-column gap-1"
              >
                <div
                  v-for="(dep, idx) in (detailData.dependenciasFuncionales?.length ? detailData.dependenciasFuncionales : detailData.dependencias_nombres)"
                  :key="idx"
                  class="d-flex align-center justify-space-between py-1 px-2 rounded bg-slate-100 border-b-thin"
                >
                  <div class="d-flex align-center">
                    <v-icon size="15" color="deep-purple-accent-3" class="mr-2 flex-shrink-0">
                      mdi-source-branch
                    </v-icon>
                    <span class="text-caption font-weight-medium text-slate-800 line-height-1-2">
                      {{ typeof dep === 'object' ? (dep.denominacion || dep.nombre) : dep }}
                    </span>
                  </div>
                  <v-chip
                    v-if="typeof dep === 'object' && dep.codigo"
                    size="x-small"
                    label
                    variant="outlined"
                    class="ml-2 font-weight-bold"
                    style="font-size: 9px;"
                  >
                    {{ dep.codigo }}
                  </v-chip>
                </div>
              </div>
              <div v-else class="d-flex align-center text-caption text-grey py-1">
                <v-icon size="16" class="mr-1 text-grey-lighten-1">mdi-information-outline</v-icon>
                <span class="font-italic">Sin dependencias funcionales registradas.</span>
              </div>
            </template>

            <!-- Panel Unidades Dependientes (Lineal) -->
            <template v-else-if="panel.type === 'hijas_lineales'">
              <div v-if="detailData.hijas_lineales?.length" class="d-flex flex-column gap-1">
                <div
                  v-for="hija in detailData.hijas_lineales"
                  :key="hija.id"
                  class="d-flex align-center justify-space-between py-1 px-2 rounded bg-slate-100 border-b-thin"
                >
                  <div class="d-flex align-center">
                    <v-icon size="15" color="teal-darken-2" class="mr-2 flex-shrink-0">
                      mdi-file-tree-outline
                    </v-icon>
                    <span class="text-caption font-weight-medium text-slate-800 line-height-1-2">
                      {{ hija.nombre }}
                    </span>
                  </div>
                  <div class="d-flex align-center gap-1 ml-2">
                    <v-chip
                      v-if="hija.sigla"
                      size="x-small"
                      label
                      color="primary"
                      variant="tonal"
                      style="font-size: 9px;"
                    >
                      {{ hija.sigla }}
                    </v-chip>
                    <v-chip
                      v-if="hija.codigo"
                      size="x-small"
                      label
                      variant="outlined"
                      style="font-size: 9px;"
                    >
                      {{ hija.codigo }}
                    </v-chip>
                  </div>
                </div>
              </div>
              <div v-else class="d-flex align-center text-caption text-grey py-1">
                <v-icon size="16" class="mr-1 text-grey-lighten-1">mdi-information-outline</v-icon>
                <span class="font-italic">Sin unidades dependientes lineales.</span>
              </div>
            </template>

            <!-- Panel Unidades Dependientes (Funcional) -->
            <template v-else-if="panel.type === 'hijas_funcionales'">
              <div v-if="detailData.hijas_funcionales?.length" class="d-flex flex-column gap-1">
                <div
                  v-for="hija in detailData.hijas_funcionales"
                  :key="hija.id"
                  class="d-flex align-center justify-space-between py-1 px-2 rounded bg-slate-100 border-b-thin"
                >
                  <div class="d-flex align-center">
                    <v-icon size="15" color="deep-purple-darken-1" class="mr-2 flex-shrink-0">
                      mdi-routes
                    </v-icon>
                    <span class="text-caption font-weight-medium text-slate-800 line-height-1-2">
                      {{ hija.nombre }}
                    </span>
                  </div>
                  <div class="d-flex align-center gap-1 ml-2">
                    <v-chip
                      v-if="hija.sigla"
                      size="x-small"
                      label
                      color="primary"
                      variant="tonal"
                      style="font-size: 9px;"
                    >
                      {{ hija.sigla }}
                    </v-chip>
                    <v-chip
                      v-if="hija.codigo"
                      size="x-small"
                      label
                      variant="outlined"
                      style="font-size: 9px;"
                    >
                      {{ hija.codigo }}
                    </v-chip>
                  </div>
                </div>
              </div>
              <div v-else class="d-flex align-center text-caption text-grey py-1">
                <v-icon size="16" class="mr-1 text-grey-lighten-1">mdi-information-outline</v-icon>
                <span class="font-italic">Sin unidades dependientes funcionales.</span>
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

            <!-- Panel Relacionamiento Interno -->
            <template v-else-if="panel.type === 'relaciones_internas'">
              <div v-if="detailData.relaciones_internas?.length" class="d-flex flex-column gap-1">
                <div
                  v-for="(rel, idx) in detailData.relaciones_internas"
                  :key="rel.id || idx"
                  class="d-flex align-center justify-space-between py-1 px-2 rounded bg-slate-100 border-b-thin"
                >
                  <div class="d-flex align-center">
                    <v-icon size="15" color="indigo-darken-1" class="mr-2 flex-shrink-0">
                      mdi-account-switch-outline
                    </v-icon>
                    <span class="text-caption font-weight-medium text-slate-800 line-height-1-2">
                      {{ rel.nombre || ('Unidad #' + (rel.relacionadaId || rel.id)) }}
                    </span>
                  </div>
                  <div class="d-flex align-center gap-1 ml-2">
                    <v-chip
                      v-if="rel.sigla"
                      size="x-small"
                      label
                      color="primary"
                      variant="tonal"
                      style="font-size: 9px;"
                    >
                      {{ rel.sigla }}
                    </v-chip>
                    <v-chip
                      v-if="rel.codigo"
                      size="x-small"
                      label
                      variant="outlined"
                      style="font-size: 9px;"
                    >
                      {{ rel.codigo }}
                    </v-chip>
                    <v-chip
                      v-if="rel.tipo"
                      size="x-small"
                      color="indigo"
                      variant="flat"
                      style="font-size: 9px;"
                    >
                      {{ rel.tipo }}
                    </v-chip>
                  </div>
                </div>
              </div>
              <div v-else class="d-flex align-center text-caption text-grey py-1">
                <v-icon size="16" class="mr-1 text-grey-lighten-1">mdi-information-outline</v-icon>
                <span class="font-italic">Sin relacionamiento interno registrado.</span>
              </div>
            </template>

            <!-- Panel Relacionamiento Externo (Interinstitucional) -->
            <template v-else-if="panel.type === 'relaciones_externas'">
              <div v-if="detailData.relaciones_externas?.length" class="d-flex flex-column gap-1">
                <div
                  v-for="rel in detailData.relaciones_externas"
                  :key="rel.id || rel.entidadExterna"
                  class="pa-2 rounded bg-slate-100 border-b-thin"
                >
                  <div class="d-flex align-center mb-1">
                    <v-icon size="15" color="blue-darken-2" class="mr-1 flex-shrink-0">
                      mdi-domain
                    </v-icon>
                    <span class="text-caption font-weight-bold text-slate-800">
                      {{ rel.entidadExterna }}
                    </span>
                  </div>
                  <div v-if="rel.descripcion" class="text-caption text-slate-600 line-height-1-3 pl-4">
                    {{ rel.descripcion }}
                  </div>
                </div>
              </div>
              <div v-else class="d-flex align-center text-caption text-grey py-1">
                <v-icon size="16" class="mr-1 text-grey-lighten-1">mdi-information-outline</v-icon>
                <span class="font-italic">Sin relacionamiento interinstitucional registrado.</span>
              </div>
            </template>

            <!-- Panel Cargos con viñetas estilizadas e icono -->
            <template v-else-if="panel.type === 'cargos'">
              <div v-if="detailData.cargos_detalle?.length" class="d-flex flex-column gap-1">
                <div
                  v-for="c in detailData.cargos_detalle"
                  :key="c.id"
                  class="d-flex align-center justify-space-between py-1 px-2 rounded bg-slate-100 border-b-thin"
                >
                  <div class="d-flex align-center">
                    <v-icon size="15" color="deep-orange-darken-1" class="mr-2 flex-shrink-0">
                      mdi-account-tie
                    </v-icon>
                    <span class="text-caption font-weight-medium text-slate-800 line-height-1-2">
                      {{ c.nombre || c.denominacion || c.descripcion }}
                    </span>
                  </div>
                  <v-chip
                    v-if="c.item"
                    size="x-small"
                    label
                    variant="outlined"
                    style="font-size: 9px;"
                  >
                    Ítem: {{ c.item }}
                  </v-chip>
                </div>
              </div>
              <div v-else class="d-flex align-center text-caption text-grey py-1">
                <v-icon size="16" class="mr-1 text-grey-lighten-1">mdi-information-outline</v-icon>
                <span class="font-italic">Sin cargos registrados.</span>
              </div>
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
  max-width: 95vw !important;
}

@media (max-width: 599.99px) {
  .unidad-details-drawer,
  :deep(.unidad-details-drawer) {
    width: 100vw !important;
    max-width: 100vw !important;
  }
}

/* Desactivar transiciones durante el arrastre para máxima fluidez */
.unidad-details-drawer.is-resizing,
.unidad-details-drawer.is-resizing :deep(*),
.unidad-details-drawer.is-resizing :deep(.v-navigation-drawer__content) {
  transition: none !important;
  user-select: none !important;
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

/* Asa de redimensionamiento arrastrable */
.resize-handle {
  position: absolute;
  top: 0;
  left: 0;
  width: 14px;
  height: 100%;
  min-height: 100%;
  cursor: col-resize;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  transition: background 0.15s ease;
}

.resize-handle:hover,
.resize-handle:active {
  background: rgba(var(--v-theme-primary), 0.15);
}

.resize-handle-bar {
  position: sticky;
  top: 50vh;
  transform: translateY(-50%);
  width: 3px;
  height: 48px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.25);
  transition: all 0.2s ease;
}

.resize-handle:hover .resize-handle-bar,
.resize-handle:active .resize-handle-bar {
  background: rgb(var(--v-theme-primary));
  height: 68px;
  width: 4px;
}

@media (max-width: 600px) {
  .resize-handle {
    display: none !important;
  }
}
</style>
