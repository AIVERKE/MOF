<script setup>
import { ref, computed, onMounted } from "vue";
import { useTheme } from "vuetify";
import { useAllUnidadesMofStore } from "@/stores/unidades_mof";
import { useAllClasesMofStore } from "@/stores/clases_mof";
import { useAllNivelesMofStore } from "@/stores/niveles_mof";
import { useAllTiposMofStore } from "@/stores/tipos_mof";
import { useAllRelacionesMofStore } from "@/stores/relaciones_mof";
import {
  getClaseNombre,
  getNivelNombre,
  getTipoNombre,
  getRelacionNombre,
  getClaseColor,
  isUnidadOficial,
} from "@/utils/mofHelpers";

const theme = useTheme();
const isDark = computed(() => theme.global.current.value.dark);

const unidadesStore = useAllUnidadesMofStore();
const clasesStore = useAllClasesMofStore();
const nivelesStore = useAllNivelesMofStore();
const tiposStore = useAllTiposMofStore();
const relacionesStore = useAllRelacionesMofStore();

const isUnidadOficialCheck = (u) => isUnidadOficial(u, clasesStore.clases);

const loading = ref(true);

// Estados para Filtros
const filtroClase = ref(null);
const filtroNivel = ref(null);
const filtroTipo = ref(null);
const filtroRelacion = ref(null);

// Estado para el tipo de gráfico por cada tarjeta (column o pie)
const chartTypes = ref({
  clase: "column",
  nivel: "column",
  tipo: "column",
  relacion: "column",
});

onMounted(async () => {
  loading.value = true;
  await Promise.all([
    unidadesStore.getFetchUnidades(),
    clasesStore.getFetchClases(),
    nivelesStore.getFetchNiveles(),
    tiposStore.getFetchTipos(),
    relacionesStore.getFetchRelaciones(),
  ]);
  loading.value = false;
});

// Resuelve nombres reales desde los stores
const resolveClase = (val) => getClaseNombre(val, clasesStore.clases);
const resolveNivel = (val) => getNivelNombre(val, nivelesStore.niveles);
const resolveTipo = (val) => getTipoNombre(val, tiposStore.tipos);
const resolveRelacion = (val) =>
  getRelacionNombre(val, relacionesStore.relaciones);

// Listas para los selectores de filtros
const listaClases = computed(() => {
  return clasesStore.clases
    .filter(
      (c) =>
        c.activo === true ||
        c.activo === 1 ||
        String(c.activo).toLowerCase() === "true",
    )
    .map((c) => ({ title: c.descripcion, value: c.descripcion }));
});
const listaNiveles = computed(() =>
  nivelesStore.niveles
    .filter(
      (n) =>
        n.activo === true ||
        n.activo === 1 ||
        String(n.activo).toLowerCase() === "true",
    )
    .map((n) => ({
      title: n.descripcion,
      value: n.descripcion,
    })),
);
const listaTipos = computed(() =>
  tiposStore.tipos
    .filter(
      (t) =>
        t.activo === true ||
        t.activo === 1 ||
        String(t.activo).toLowerCase() === "true",
    )
    .map((t) => ({ title: t.descripcion, value: t.descripcion })),
);
const listaRelaciones = computed(() =>
  relacionesStore.relaciones
    .filter(
      (r) =>
        r.activo === true ||
        r.activo === 1 ||
        String(r.activo).toLowerCase() === "true",
    )
    .map((r) => ({
      title: r.descripcion,
      value: r.descripcion,
    })),
);

const unidadesFiltradas = computed(() => {
  let data = unidadesStore.unidades || [];
  if (filtroClase.value)
    data = data.filter((u) => resolveClase(u.clase) === filtroClase.value);
  if (filtroNivel.value)
    data = data.filter((u) => resolveNivel(u.nivel) === filtroNivel.value);
  if (filtroTipo.value)
    data = data.filter((u) => resolveTipo(u.tipo) === filtroTipo.value);
  if (filtroRelacion.value)
    data = data.filter(
      (u) => resolveRelacion(u.relacion) === filtroRelacion.value,
    );

  return data;
});

const getRowClass = (u) => {
  if (!isUnidadOficialCheck(u)) {
    return "opacity-60 grayscale bg-slate-50";
  }
  return "";
};

const resetFiltros = () => {
  filtroClase.value =
    filtroNivel.value =
    filtroTipo.value =
    filtroRelacion.value =
      null;
};

// Lógica de Agrupación
const agrupar = (campo, resolver) => {
  const groups = {};
  unidadesFiltradas.value.forEach((u) => {
    const val = resolver(u[campo]) || "Sin Especificar";
    if (!groups[val]) groups[val] = [];
    groups[val].push(u);
  });
  return groups;
};

const agrupaciones = computed(() => ({
  clase: {
    title: "TIPO DE INSTANCIA",
    icon: "mdi-office-building",
    color: "primary",
    data: agrupar("clase", resolveClase),
  },
  nivel: {
    title: "NIVEL JERÁRQUICO",
    icon: "mdi-layers-triple",
    color: "teal",
    data: agrupar("nivel", resolveNivel),
  },
  tipo: {
    title: "TIPO DE UNIDAD",
    icon: "mdi-tag-multiple",
    color: "orange",
    data: agrupar("tipo", resolveTipo),
  },
  relacion: {
    title: "TIPO DE RELACIÓN",
    icon: "mdi-vector-line",
    color: "deep-purple",
    data: agrupar("relacion", resolveRelacion),
  },
}));

// Generador dinámico de opciones de Highcharts
const getChartOptions = (key, chartInfo) => {
  const type = chartTypes.value[key];
  const data = Object.entries(chartInfo.data).map(([name, items]) => ({
    name: name,
    y: items.length,
    color:
      key === "clase" ? getClaseColor(name, clasesStore.clases) : undefined,
  }));

  const textColor = isDark.value ? "#E2E8F0" : "#333333";
  const labelColor = isDark.value ? "#94A3B8" : "#666666";

  const baseOptions = {
    chart: {
      type: type,
      backgroundColor: "transparent",
      height: 350,
      style: { fontFamily: "inherit", color: textColor },
    },
    title: { text: null },
    credits: { enabled: false },
    legend: {
      itemStyle: { color: textColor },
      itemHoverStyle: { color: isDark.value ? "#FFFFFF" : "#000000" }
    },
    tooltip: {
      headerFormat: '<span style="font-size:10px">{point.key}</span><br>',
      pointFormat:
        '<span style="color:{point.color}">\u25CF</span> <b>{point.y}</b> unidades ({point.percentage:.1f}%)',
    },
  };

  if (type === "column") {
    return {
      ...baseOptions,
      xAxis: {
        categories: data.map((d) => d.name),
        labels: { style: { fontSize: "9px", fontWeight: "bold", color: textColor } },
        lineColor: isDark.value ? "#475569" : "#CCD6EB",
        tickColor: isDark.value ? "#475569" : "#CCD6EB"
      },
      yAxis: {
        title: { text: "Unidades", style: { color: textColor } },
        labels: { style: { color: labelColor } },
        gridLineColor: isDark.value ? "#334155" : "#E6E6E6",
        min: 0
      },
      plotOptions: {
        column: {
          colorByPoint: true,
          borderRadius: 4,
          dataLabels: {
            enabled: true,
            format: "{point.y}",
            style: { fontSize: "10px", color: textColor, textOutline: "none" },
          },
        },
      },
      series: [
        {
          name: chartInfo.title,
          data: data.map((d) => ({ y: d.y, color: d.color })),
          showInLegend: false,
        },
      ],
    };
  } else {
    return {
      ...baseOptions,
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: {
            enabled: true,
            format: "<b>{point.name}</b>: {point.y}",
            style: { fontSize: "9px", color: textColor, textOutline: "none" },
          },
          showInLegend: true,
        },
      },
      series: [
        {
          name: chartInfo.title,
          colorByPoint: true,
          data: data,
        },
      ],
    };
  }
};
</script>

<template>
  <v-container fluid class="pa-0">
    <!-- Header & Breadcrumb -->
    <div class="mb-6">
      <h1 class="text-h4 font-weight-black mb-1 text-slate-800">
        Reporte Ejecutivo
      </h1>
      <div class="text-body-2 d-flex align-center text-slate-500">
        <v-icon size="18" class="mr-2">mdi-chart-bar</v-icon>
        <span>Reportes</span>
        <v-icon size="16" class="mx-1">mdi-chevron-right</v-icon>
        <span class="font-weight-bold text-primary"
          >Consolidado Institucional</span
        >
      </div>
    </div>

    <!-- Filtros de Entrada -->
    <v-card class="mb-6 rounded-xl border-0 shadow-sm" elevation="3">
      <v-card-text class="pa-5">
        <v-row align="center" dense>
          <v-col cols="12" md="2">
            <v-select
              v-model="filtroClase"
              :items="listaClases"
              label="TIPO DE INSTANCIA"
              variant="outlined"
              hide-details
              clearable
              density="compact"
              class="text-caption font-weight-bold"
            ></v-select>
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="filtroNivel"
              :items="listaNiveles"
              label="NIVEL JERARQUICO"
              variant="outlined"
              hide-details
              clearable
              density="compact"
              class="text-caption font-weight-bold"
            ></v-select>
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="filtroTipo"
              :items="listaTipos"
              label="TIPO DE UNIDAD"
              variant="outlined"
              hide-details
              clearable
              density="compact"
              class="text-caption font-weight-bold"
            ></v-select>
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="filtroRelacion"
              :items="listaRelaciones"
              label="RELACIÓN"
              variant="outlined"
              hide-details
              clearable
              density="compact"
              class="text-caption font-weight-bold"
            ></v-select>
          </v-col>
          <v-col cols="12" md="2">
            <v-btn
              color="primary"
              variant="flat"
              block
              @click="resetFiltros"
              prepend-icon="mdi-filter-off"
              class="rounded-lg font-weight-bold"
            >
              LIMPIAR
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-row v-if="loading">
      <v-col cols="12" class="text-center pa-12">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
          width="6"
        ></v-progress-circular>
        <div class="mt-4 text-h6 font-weight-bold text-grey">
          Procesando indicadores...
        </div>
      </v-col>
    </v-row>

    <template v-else>
      <!-- Resumen Global -->
      <v-row class="mb-6">
        <v-col cols="12" md="3">
          <v-card
            theme="dark"
            color="primary"
            elevation="4"
            class="rounded-xl h-100 text-center py-8 d-flex flex-column justify-center shadow-lg"
          >
            <div class="text-overline font-weight-black opacity-80 mb-2">
              UNIVERSO DE UNIDADES
            </div>
            <div class="text-h1 font-weight-black line-height-1">
              {{ unidadesFiltradas.length }}
            </div>
            <div class="text-caption mt-2 font-weight-bold opacity-70 italic">
              Según filtros aplicados
            </div>
          </v-card>
        </v-col>

        <!-- Agrupaciones por Categoría -->
        <v-col cols="12" md="9">
          <v-row dense>
            <v-col
              cols="12"
              md="6"
              v-for="(group, key) in agrupaciones"
              :key="key"
            >
              <v-card
                elevation="2"
                class="rounded-xl h-100 shadow-sm border overflow-hidden"
                style="max-height: 400px; display: flex; flex-direction: column"
              >
                <v-card-title
                  class="pa-4 d-flex align-center bg-indigo-lighten-5 border-b"
                >
                  <v-avatar
                    :color="group.color + '-lighten-4'"
                    size="32"
                    class="mr-3"
                  >
                    <v-icon :color="group.color" size="18">{{
                      group.icon
                    }}</v-icon>
                  </v-avatar>
                  <span
                    class="text-subtitle-2 font-weight-black text-slate-700 uppercase"
                    >{{ group.title }}</span
                  >
                </v-card-title>
                <v-card-text class="pa-0 overflow-y-auto">
                  <v-expansion-panels variant="accordion">
                    <v-expansion-panel
                      v-for="(items, label) in group.data"
                      :key="label"
                      elevation="0"
                      class="border-b-thin"
                    >
                      <v-expansion-panel-title
                        class="py-3 px-4 min-height-unset"
                      >
                        <div
                          class="d-flex justify-space-between align-center w-100 pr-2"
                        >
                          <span
                            class="text-caption font-weight-black text-slate-600"
                            >{{ label }}</span
                          >
                          <v-chip
                            size="x-small"
                            :color="group.color"
                            variant="flat"
                            class="font-weight-black px-2"
                            >{{ items.length }}</v-chip
                          >
                        </div>
                      </v-expansion-panel-title>
                      <v-expansion-panel-text class="pa-0">
                        <v-list density="compact" class="pa-0 bg-slate-50">
                          <v-list-item
                            v-for="u in items"
                            :key="u.id"
                            class="px-6 border-b py-0"
                          >
                            <v-list-item-title
                              class="text-xxs font-weight-bold d-flex align-center"
                            >
                              <div
                                :style="{
                                  backgroundColor:
                                    u.color ||
                                    getClaseColor(
                                      u.clase,
                                      clasesStore.clases,
                                    ) ||
                                    '#1976D2',
                                  width: '6px',
                                  height: '6px',
                                }"
                                class="mr-2 rounded-circle"
                              ></div>
                              {{ u.nombre || u.denominacion }}
                            </v-list-item-title>
                          </v-list-item>
                        </v-list>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-col>
      </v-row>

      <!-- Sección de Gráficos -->
      <v-card
        class="rounded-xl border-0 shadow-sm mb-6 overflow-hidden"
        elevation="3"
      >
        <v-card-title class="pa-5 d-flex align-center bg-indigo-lighten-5 border-b">
          <v-icon color="primary" class="mr-3">mdi-chart-areaspline</v-icon>
          <span class="text-h6 font-weight-black text-slate-800"
            >ANÁLISIS ESTADÍSTICO</span
          >
        </v-card-title>
        <v-card-text class="pa-6">
          <v-row>
            <v-col
              cols="12"
              md="6"
              v-for="(chart, key) in agrupaciones"
              :key="key"
            >
              <v-card
                variant="outlined"
                class="rounded-xl border-slate-200 overflow-hidden shadow-xs"
              >
                <v-card-title
                  class="pa-4 d-flex align-center justify-space-between bg-indigo-lighten-5 border-b"
                >
                  <div class="d-flex align-center">
                    <v-icon :color="chart.color" size="20" class="mr-2">{{
                      chart.icon
                    }}</v-icon>
                    <span class="text-caption font-weight-black uppercase">{{
                      chart.title
                    }}</span>
                  </div>
                  <v-btn-toggle
                    v-model="chartTypes[key]"
                    mandatory
                    density="compact"
                    color="primary"
                    variant="tonal"
                    rounded="pill"
                  >
                    <v-btn value="column">
                      <v-icon size="18">mdi-chart-bar</v-icon>
                      <v-tooltip activator="parent" location="top"
                        >Gráfico de Barras</v-tooltip
                      >
                    </v-btn>
                    <v-btn value="pie">
                      <v-icon size="18">mdi-chart-pie</v-icon>
                      <v-tooltip activator="parent" location="top"
                        >Gráfico Circular</v-tooltip
                      >
                    </v-btn>
                  </v-btn-toggle>
                </v-card-title>
                <v-card-text class="pa-2">
                  <highcharts
                    :options="getChartOptions(key, chart)"
                  ></highcharts>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Tabla de Detalle Estratégico -->
      <v-card
        elevation="3"
        class="rounded-xl border-0 shadow-sm overflow-hidden mb-6"
      >
        <v-card-title class="pa-5 bg-indigo-lighten-5 d-flex align-center border-b">
          <v-icon start color="primary" class="mr-2"
            >mdi-format-list-bulleted</v-icon
          >
          <span class="text-h6 font-weight-black text-slate-800 uppercase"
            >Detalle Analítico de Unidades</span
          >
          <v-spacer></v-spacer>
          <v-chip
            color="primary"
            variant="flat"
            size="small"
            class="font-weight-black px-4"
            >{{ unidadesFiltradas.length }} ITEMS</v-chip
          >
        </v-card-title>
        <v-table density="compact" fixed-header height="500px" hover>
          <thead>
            <tr class="bg-indigo-lighten-5">
              <th class="text-xxs font-weight-black px-4">CÓDIGO</th>
              <th class="text-xxs font-weight-black">UNIDAD ADMINISTRATIVA</th>
              <th class="text-xxs font-weight-black">SIGLA</th>
              <th class="text-xxs font-weight-black">
                TIPO DE INSTANCIA
              </th>
              <th class="text-xxs font-weight-black">NIVEL</th>
              <th class="text-xxs font-weight-black">RELACIÓN</th>
              <th class="text-center text-xxs font-weight-black">ESTADO</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="u in unidadesFiltradas"
              :key="u.id"
              :class="getRowClass(u)"
            >
              <td class="px-4">
                <div class="d-flex align-center">
                  <div
                    :style="{
                      backgroundColor:
                        u.color || getClaseColor(u.clase, clasesStore.clases),
                      width: '4px',
                      height: '20px',
                    }"
                    class="mr-2 rounded-pill"
                  ></div>
                  <span class="text-xxs font-weight-black text-slate-500">{{
                    u.codigo
                  }}</span>
                </div>
              </td>
              <td class="text-caption font-weight-bold text-slate-800">
                {{ u.nombre || u.denominacion }}
              </td>
              <td>
                <v-chip
                  size="x-small"
                  label
                  color="primary"
                  variant="outlined"
                  class="font-weight-bold text-xxs px-1"
                >
                  {{ u.sigla || "-" }}
                </v-chip>
              </td>
              <td>
                <v-chip
                  size="x-small"
                  label
                  class="font-weight-bold"
                  :style="{
                    backgroundColor: getClaseColor(u.clase, clasesStore.clases),
                    color: 'white',
                  }"
                >
                  {{ resolveClase(u.clase) }}
                </v-chip>
              </td>
              <td>
                <v-chip
                  size="x-small"
                  label
                  variant="tonal"
                  color="teal-darken-2"
                  class="font-weight-bold chip-nivel"
                >
                  {{ resolveNivel(u.nivel) }}
                </v-chip>
              </td>
              <td>
                <v-chip
                  size="x-small"
                  label
                  variant="outlined"
                  color="deep-purple"
                  class="font-weight-bold chip-relacion"
                >
                  {{ resolveRelacion(u.relacion) }}
                </v-chip>
              </td>
              <td class="text-center">
                <span
                  :class="
                    isUnidadOficialCheck(u)
                      ? 'text-success font-weight-bold'
                      : 'text-grey'
                  "
                  style="font-size: 10px"
                >
                  {{ isUnidadOficialCheck(u) ? "OFICIAL" : "NO OFICIAL" }}
                </span>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </template>
  </v-container>
</template>

<style scoped>
.line-height-1 {
  line-height: 1;
}
.line-height-1-1 {
  line-height: 1.1;
}
.line-height-1-2 {
  line-height: 1.2;
}
.line-height-1-4 {
  line-height: 1.4;
}
.min-height-unset {
  min-height: unset !important;
}
.text-xxs {
  font-size: 10px !important;
}
.text-overline {
  font-size: 0.65rem !important;
  letter-spacing: 1px !important;
}
.shadow-lg {
  box-shadow: 0 10px 30px rgba(99, 102, 241, 0.2) !important;
}
.uppercase {
  text-transform: uppercase;
}
</style>
