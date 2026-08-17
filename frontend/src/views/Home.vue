<script setup>
import { onMounted, computed } from "vue";
import { useAllUnidadesMofStore } from "@/stores/unidades_mof";
import { useAuthStore } from "@/stores/auth";

const unidadesStore = useAllUnidadesMofStore();
const authStore = useAuthStore();

onMounted(async () => {
  if (unidadesStore.unidades.length === 0) {
    await unidadesStore.getFetchUnidades();
  }
});

// Simulamos conteo de usuarios (Ya que el store de auth solo maneja el logueado por ahora)
const totalUsuarios = ref(1); // Mínimo el usuario actual

// Unidades recientes (Las últimas 5 creadas según ID o fecha si estuviera disponible)
const actividadesRecientes = computed(() => {
  return [...unidadesStore.unidades]
    .sort((a, b) => b.id - a.id)
    .slice(0, 6)
    .map(u => ({
      id: u.id,
      nombre: u.nombre || u.denominacion,
      codigo: u.codigo,
      color: u.color || '#1976D2',
      clase: u.clase,
      fecha: 'Reciente'
    }));
});

const stats = computed(() => [
  {
    title: "Usuarios del Sistema",
    value: totalUsuarios.value,
    icon: "mdi-account-multiple",
    gradient: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
    suffix: "Activo"
  },
  {
    title: "Unidades en MOF",
    value: unidadesStore.unidades.length,
    icon: "mdi-sitemap",
    gradient: "linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)",
    suffix: "Registradas"
  }
]);

import { ref } from "vue";
</script>

<template>
  <v-container fluid class="pa-0">
    <!-- Breadcrumb & Welcome -->
    <div class="mb-6">
      <h1 class="text-h4 font-weight-black mb-1 text-slate-800">Panel de Control</h1>
      <div class="text-body-2 d-flex align-center text-slate-500">
        <v-icon size="18" class="mr-2">mdi-home</v-icon>
        <span>Inicio</span>
        <v-icon size="16" class="mx-1">mdi-chevron-right</v-icon>
        <span class="font-weight-bold text-primary">Vista General</span>
      </div>
    </div>
    
    <!-- KPI Cards -->
    <v-row>
      <v-col v-for="stat in stats" :key="stat.title" cols="12" sm="6" md="3">
        <v-card class="rounded-xl border-0 shadow-sm" elevation="2">
          <v-card-text class="pa-5">
            <div class="d-flex align-center justify-space-between mb-4">
              <div 
                class="pa-3 rounded-lg" 
                :style="{ background: stat.gradient }"
              >
                <v-icon color="white" size="24">{{ stat.icon }}</v-icon>
              </div>
              <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
                {{ stat.suffix }}
              </v-chip>
            </div>
            <div class="text-h4 font-weight-black mb-1 text-slate-800">
              {{ stat.value }}
            </div>
            <div class="text-caption font-weight-bold text-uppercase text-slate-500" style="letter-spacing: 1px;">
              {{ stat.title }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Content Grid -->
    <v-row class="mt-4">
      <!-- Actividad Reciente -->
      <v-col cols="12" md="8">
        <v-card class="rounded-xl border-0 shadow-sm" elevation="2">
          <v-card-title class="pa-5 pb-2 d-flex align-center">
            <v-icon start color="primary" class="mr-2">mdi-history</v-icon>
            <span class="text-h6 font-weight-black text-slate-800">
              Últimas Unidades Incorporadas
            </span>
          </v-card-title>
          <v-divider class="mx-5"></v-divider>
          <v-card-text class="pa-0">
            <v-list v-if="actividadesRecientes.length" lines="two" class="bg-transparent">
              <v-list-item
                v-for="u in actividadesRecientes"
                :key="u.id"
                class="px-5 border-b"
              >
                <template v-slot:prepend>
                  <v-avatar :style="{ backgroundColor: u.color }" size="40" class="elevation-2">
                    <v-icon color="white" size="20">mdi-office-building</v-icon>
                  </v-avatar>
                </template>
                
                <v-list-item-title class="font-weight-bold text-body-1">{{ u.nombre }}</v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  Código: <span class="font-weight-black text-primary">{{ u.codigo }}</span> • {{ u.fecha }}
                </v-list-item-subtitle>

                <template v-slot:append>
                  <v-btn
                    icon
                    variant="tonal"
                    size="x-small"
                    color="primary"
                    :to="`/mof/organigrama-unidades`"
                  >
                    <v-icon size="14">mdi-arrow-right</v-icon>
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
          <v-card-actions class="pa-4">
            <v-btn block variant="text" color="primary" to="/mof/listar-unidades" class="font-weight-bold">
              Ver todas las unidades
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- Panel Lateral Info -->
      <v-col cols="12" md="4">
        <v-card class="rounded-xl border-0 shadow-sm bg-indigo-darken-4 text-white" elevation="2">
          <v-card-text class="pa-6">
            <div class="text-h5 font-weight-black mb-2">Bienvenido, {{ authStore.user?.nombre }}</div>
            <p class="text-body-2 opacity-80 mb-6">
              Estás operando en el módulo de gestión organizacional de la UMSA. 
              Recuerda que todos los cambios impactan en el Manual de Organizaciones y Funciones.
            </p>
            <v-btn block color="white" variant="elevated" class="text-indigo-darken-4 font-weight-black rounded-lg" to="/mof/organigrama-unidades">
              Ir al Organigrama
            </v-btn>
          </v-card-text>
        </v-card>

        <v-card class="rounded-xl border-0 shadow-sm mt-4" elevation="2">
          <v-card-title class="pa-5 pb-0 text-subtitle-1 font-weight-black">Acceso Rápido</v-card-title>
          <v-card-text class="pa-3">
            <v-row dense>
              <v-col cols="6">
                <v-btn block variant="tonal" color="indigo" height="80" class="flex-column" to="/mof/listar-unidades">
                  <v-icon size="28" class="mb-1">mdi-format-list-bulleted</v-icon>
                  <span class="text-xxs">Lista</span>
                </v-btn>
              </v-col>
              <v-col cols="6">
                <v-btn block variant="tonal" color="teal" height="80" class="flex-column" to="/configuracion">
                  <v-icon size="28" class="mb-1">mdi-cog-outline</v-icon>
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
.text-xxs { font-size: 10px; font-weight: 700; text-transform: uppercase; }
.hover-scale { transition: transform 0.2s; }
.hover-scale:hover { transform: scale(1.02); }
</style>
