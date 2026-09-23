<script setup>
import { ref, onMounted, computed } from "vue";
import { useAllUnidadesMofStore } from "@/stores/unidades_mof";
import { useAllClasesMofStore } from "@/stores/clases_mof";
import { useAuthStore } from "@/stores/auth";
import { useResponsive } from "@/composables/useResponsive";
import { getIntenseNodeColor } from "@/utils/mofHelpers";

const unidadesStore = useAllUnidadesMofStore();
const clasesStore = useAllClasesMofStore();
const authStore = useAuthStore();
const { isMobile, xs } = useResponsive();

const totalUsuarios = ref(1);

onMounted(async () => {
  if (!unidadesStore.dashboardStats) {
    await unidadesStore.getDashboardStats();
  }
  if (clasesStore.clases.length === 0) {
    await clasesStore.getFetchClases();
  }
});

const actividadesRecientes = computed(() => {
  const recientes = unidadesStore.dashboardStats?.recientes;
  if (recientes && Array.isArray(recientes) && recientes.length > 0) {
    return recientes.map((u) => {
      let fechaFormateada = "Reciente";
      if (u.fecCreacion) {
        try {
          fechaFormateada = new Date(u.fecCreacion).toLocaleDateString("es-BO");
        } catch (e) {
          fechaFormateada = "Reciente";
        }
      } else if (u.createdAt) {
        try {
          fechaFormateada = new Date(u.createdAt).toLocaleDateString("es-BO");
        } catch (e) {
          fechaFormateada = "Reciente";
        }
      }
      return {
        id: u.id,
        nombre: u.nombre || u.denominacion,
        codigo: u.codigo,
        color: u.color || getIntenseNodeColor(u.clase, clasesStore.clases),
        clase: u.clase,
        fecha: fechaFormateada,
      };
    });
  }

  // Fallback a unidades si ya estuvieran en memoria
  return [...(unidadesStore.unidades || [])]
    .sort((a, b) => b.id - a.id)
    .slice(0, 6)
    .map((u) => ({
      id: u.id,
      nombre: u.nombre || u.denominacion,
      codigo: u.codigo,
      color: u.color || getIntenseNodeColor(u.clase, clasesStore.clases),
      clase: u.clase,
      fecha: "Reciente",
    }));
});

const stats = computed(() => [
  {
    title: "Usuarios",
    fullTitle: "Usuarios del Sistema",
    value: totalUsuarios.value,
    icon: "mdi-account-multiple",
    gradient: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
    suffix: "Activo",
  },
  {
    title: "Unidades",
    fullTitle: "Unidades en MOF",
    value:
      unidadesStore.dashboardStats?.resumen?.total ??
      unidadesStore.unidades.length,
    icon: "mdi-sitemap",
    gradient: "linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)",
    suffix: "Registradas",
  },
]);
</script>

<template>
  <v-container fluid class="pa-0">
    <!-- Breadcrumb & Welcome -->
    <div class="mb-4 mb-sm-6">
      <h1 class="text-h5 text-sm-h4 font-weight-black mb-1 text-slate-800">Panel de Control</h1>
      <div class="text-body-2 d-flex align-center text-slate-500 flex-wrap">
        <v-icon size="18" class="mr-2">mdi-home</v-icon>
        <span>Inicio</span>
        <v-icon size="16" class="mx-1">mdi-chevron-right</v-icon>
        <span class="font-weight-bold text-primary">Vista General</span>
      </div>
    </div>
    
    <!-- KPI Cards (2 por fila en móvil, 4 en desktop) -->
    <v-row dense>
      <v-col v-for="stat in stats" :key="stat.title" cols="6" sm="6" md="3">
        <v-card class="rounded-xl border-0 shadow-sm" elevation="2">
          <v-card-text :class="isMobile ? 'pa-3' : 'pa-5'">
            <div class="d-flex align-center justify-space-between mb-2 mb-sm-4">
              <div 
                :class="isMobile ? 'pa-2 rounded-md' : 'pa-3 rounded-lg'" 
                :style="{ background: stat.gradient }"
              >
                <v-icon color="white" :size="isMobile ? 18 : 24">{{ stat.icon }}</v-icon>
              </div>
              <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
                {{ stat.suffix }}
              </v-chip>
            </div>
            <div class="text-h5 text-sm-h4 font-weight-black mb-1 text-slate-800">
              {{ stat.value }}
            </div>
            <div class="text-caption font-weight-bold text-uppercase text-slate-500 text-truncate" style="letter-spacing: 0.5px;">
              {{ isMobile ? stat.title : stat.fullTitle }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Content Grid -->
    <v-row class="mt-2 mt-sm-4">
      <!-- Actividad Reciente -->
      <v-col cols="12" md="8">
        <v-card class="rounded-xl border-0 shadow-sm" elevation="2">
          <v-card-title class="pa-4 pa-sm-5 pb-2 d-flex align-center flex-wrap">
            <v-icon start color="primary" class="mr-2">mdi-history</v-icon>
            <span class="text-subtitle-1 text-sm-h6 font-weight-black text-slate-800">
              Últimas Unidades Incorporadas
            </span>
          </v-card-title>
          <v-divider class="mx-4 mx-sm-5"></v-divider>
          <v-card-text class="pa-0">
            <v-list v-if="actividadesRecientes.length" lines="two" class="bg-transparent">
              <v-list-item
                v-for="u in actividadesRecientes"
                :key="u.id"
                :class="isMobile ? 'px-3 py-2 border-b' : 'px-5 border-b'"
              >
                <template v-slot:prepend>
                  <v-avatar :style="{ backgroundColor: u.color }" :size="isMobile ? 36 : 40" class="elevation-2">
                    <v-icon color="white" :size="isMobile ? 18 : 20">mdi-office-building</v-icon>
                  </v-avatar>
                </template>
                
                <v-list-item-title class="font-weight-bold text-body-2 text-sm-body-1 text-truncate">
                  {{ u.nombre }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption text-truncate">
                  Código: <span class="font-weight-black text-primary">{{ u.codigo }}</span> • {{ u.fecha }}
                </v-list-item-subtitle>

                <template v-slot:append>
                  <v-btn
                    icon
                    variant="tonal"
                    size="small"
                    color="primary"
                    aria-label="Ver unidad en organigrama"
                    :to="`/mof/organigrama-unidades`"
                  >
                    <v-icon size="16">mdi-arrow-right</v-icon>
                    <v-tooltip activator="parent" location="left">Ver en organigrama</v-tooltip>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
            <div v-else class="text-center py-12" style="color: #94A3B8;">
              <v-icon size="64" color="#CBD5E1">mdi-database-off</v-icon>
              <p class="mt-4 font-weight-bold">No hay actividad registrada aún</p>
            </div>
          </v-card-text>
          <v-card-actions class="pa-3 pa-sm-4">
            <v-btn block variant="text" color="primary" to="/mof/listar-unidades" class="font-weight-bold">
              Ver todas las unidades
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- Panel Lateral Info -->
      <v-col cols="12" md="4">
        <v-card class="rounded-xl border-0 shadow-sm bg-indigo-darken-4 text-white" elevation="2">
          <v-card-text :class="isMobile ? 'pa-4' : 'pa-6'">
            <div class="text-subtitle-1 text-sm-h5 font-weight-black mb-2">Bienvenido, {{ authStore.user?.nombre }}</div>
            <p class="text-body-2 opacity-80 mb-4 mb-sm-6">
              Estás operando en el módulo de gestión organizacional de la UMSA. 
              Recuerda que todos los cambios impactan en el Manual de Organizaciones y Funciones.
            </p>
            <v-btn block color="white" variant="elevated" class="text-indigo-darken-4 font-weight-black rounded-lg" to="/mof/organigrama-unidades">
              Ir al Organigrama
            </v-btn>
          </v-card-text>
        </v-card>

        <v-card class="rounded-xl border-0 shadow-sm mt-3 mt-sm-4" elevation="2">
          <v-card-title class="pa-4 pa-sm-5 pb-0 text-subtitle-1 font-weight-black">Acceso Rápido</v-card-title>
          <v-card-text class="pa-3">
            <v-row dense>
              <v-col cols="6">
                <v-btn block variant="tonal" color="primary" :height="isMobile ? 68 : 80" class="flex-column" to="/mof/organigrama-unidades">
                  <v-icon :size="isMobile ? 22 : 26" class="mb-1">mdi-sitemap</v-icon>
                  <span class="text-xxs">Organigrama</span>
                </v-btn>
              </v-col>
              <v-col cols="6">
                <v-btn block variant="tonal" color="indigo" :height="isMobile ? 68 : 80" class="flex-column" to="/mof/listar-unidades">
                  <v-icon :size="isMobile ? 22 : 26" class="mb-1">mdi-format-list-bulleted</v-icon>
                  <span class="text-xxs">Lista</span>
                </v-btn>
              </v-col>
              <v-col cols="6">
                <v-btn block variant="tonal" color="deep-purple" :height="isMobile ? 68 : 80" class="flex-column" to="/mof/arbol-unidades">
                  <v-icon :size="isMobile ? 22 : 26" class="mb-1">mdi-file-tree</v-icon>
                  <span class="text-xxs">Árbol</span>
                </v-btn>
              </v-col>
              <v-col cols="6">
                <v-btn block variant="tonal" color="teal" :height="isMobile ? 68 : 80" class="flex-column" to="/configuracion">
                  <v-icon :size="isMobile ? 22 : 26" class="mb-1">mdi-cog-outline</v-icon>
                  <span class="text-xxs">Ajustes</span>
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.line-height-1-1 { line-height: 1.1; }
.hover-scale { transition: transform 0.2s; }
.hover-scale:hover { transform: scale(1.02); }
</style>
