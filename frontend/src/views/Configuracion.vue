<script setup>
import { computed, onMounted, ref } from "vue";
import { useTheme } from "vuetify";
import { useAuthStore } from "@/stores/auth";
import { useAccessibilityStore } from "@/stores/accessibility";
import { useConfigMofStore } from "@/stores/config_mof";

const APP_VERSION = "MOF v1.0.0";

const theme = useTheme();
const authStore = useAuthStore();
const accessibilityStore = useAccessibilityStore();
const configStore = useConfigMofStore();

const tab = ref("preferencias");

const isAdmin = computed(() => authStore.isAdmin());
const isDark = computed(() => accessibilityStore.themeMode === "dark");

const userEmail = computed(() => authStore.user?.email || "—");
const userName = computed(() => authStore.user?.nombre || "—");
const userRoles = computed(() => {
  const roles = authStore.user?.roles;
  if (Array.isArray(roles) && roles.length) return roles.join(", ");
  return authStore.user?.rol || "—";
});

const defaultsEntries = computed(() => {
  const d = configStore.defaults || {};
  return [
    { key: "tipo", label: "Tipo (id)", value: d.tipo },
    { key: "nivel", label: "Nivel (id)", value: d.nivel },
    { key: "relacion", label: "Relación (id)", value: d.relacion },
    { key: "clase", label: "Clase (id)", value: d.clase },
    { key: "color", label: "Color", value: d.color },
    { key: "lado", label: "Lado", value: d.lado },
    { key: "oficial", label: "Oficial", value: d.oficial ? "Sí" : "No" },
    { key: "es_troncal", label: "Es troncal", value: d.es_troncal ? "Sí" : "No" },
  ];
});

const reglasEntries = computed(() => {
  const r = configStore.reglas || {};
  return [
    { key: "pesoNulo", label: "Peso nulo", value: r.pesoNulo },
    { key: "pesoDefault", label: "Peso por defecto", value: r.pesoDefault },
    { key: "defaultClaseColor", label: "Color clase por defecto", value: r.defaultClaseColor },
    {
      key: "staffRelacionCodigos",
      label: "Códigos relación staff",
      value: Array.isArray(r.staffRelacionCodigos)
        ? r.staffRelacionCodigos.join(", ")
        : r.staffRelacionCodigos,
    },
    { key: "ladoTroncalForzado", label: "Lado troncal forzado", value: r.ladoTroncalForzado },
  ];
});

function onThemeToggle(enabled) {
  accessibilityStore.setThemeMode(enabled ? "dark" : "light");
  theme.global.name.value = accessibilityStore.themeMode;
}

onMounted(async () => {
  theme.global.name.value = accessibilityStore.themeMode;
  await configStore.fetchConfig();
});
</script>

<template>
  <v-container fluid class="pa-0">
    <div class="mb-6">
      <h1 class="text-h4 font-weight-black mb-1 text-slate-800">Configuración</h1>
      <div class="text-body-2 d-flex align-center text-slate-500">
        <v-icon size="18" class="mr-2">mdi-cog</v-icon>
        <span>Ajustes</span>
        <v-icon size="16" class="mx-1">mdi-chevron-right</v-icon>
        <span class="font-weight-bold text-primary">Sistema</span>
      </div>
    </div>

    <v-tabs v-model="tab" color="primary" class="mb-4">
      <v-tab value="preferencias">Preferencias</v-tab>
      <v-tab value="mof">MOF</v-tab>
      <v-tab v-if="isAdmin" value="seguridad">Seguridad</v-tab>
      <v-tab value="sistema">Sistema</v-tab>
    </v-tabs>

    <v-tabs-window v-model="tab">
      <!-- Preferencias personales -->
      <v-tabs-window-item value="preferencias">
        <v-card class="rounded-xl border-0 shadow-sm" elevation="3">
          <v-card-title class="text-h6 font-weight-black pa-5 pb-2">
            Apariencia y accesibilidad
          </v-card-title>
          <v-card-subtitle class="px-5 pb-2">
            Preferencias de esta sesión en este navegador
          </v-card-subtitle>
          <v-divider></v-divider>
          <v-card-text class="pa-5">
            <v-list lines="two" class="bg-transparent">
              <v-list-item>
                <template #prepend>
                  <v-icon
                    :icon="isDark ? 'mdi-weather-night' : 'mdi-weather-sunny'"
                    class="mr-3"
                  />
                </template>
                <v-list-item-title class="font-weight-bold">Tema oscuro</v-list-item-title>
                <v-list-item-subtitle>
                  Alterna entre modo claro y oscuro. Se guarda en este navegador.
                </v-list-item-subtitle>
                <template #append>
                  <v-switch
                    :model-value="isDark"
                    color="primary"
                    hide-details
                    inset
                    @update:model-value="onThemeToggle"
                  />
                </template>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-icon
                    :icon="
                      accessibilityStore.colorblindMode
                        ? 'mdi-eye-check'
                        : 'mdi-eye-outline'
                    "
                    class="mr-3"
                  />
                </template>
                <v-list-item-title class="font-weight-bold">
                  Modo daltónico
                </v-list-item-title>
                <v-list-item-subtitle>
                  Usa una paleta accesible en organigramas y árboles de unidades.
                </v-list-item-subtitle>
                <template #append>
                  <v-switch
                    :model-value="accessibilityStore.colorblindMode"
                    color="primary"
                    hide-details
                    inset
                    @update:model-value="accessibilityStore.setColorblindMode"
                  />
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-tabs-window-item>

      <!-- Config MOF (solo lectura) -->
      <v-tabs-window-item value="mof">
        <v-alert
          type="info"
          variant="tonal"
          density="comfortable"
          class="mb-4 rounded-lg"
          prepend-icon="mdi-information-outline"
        >
          Valores actuales del sistema (solo lectura). La edición persistente
          formará parte de una siguiente entrega.
        </v-alert>

        <v-row>
          <v-col cols="12" md="6">
            <v-card class="rounded-xl border-0 shadow-sm h-100" elevation="3">
              <v-card-title class="text-subtitle-1 font-weight-black pa-4">
                Defaults de nuevas unidades
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-0">
                <v-progress-linear
                  v-if="configStore.loading"
                  indeterminate
                  color="primary"
                />
                <v-list density="compact" class="bg-transparent">
                  <v-list-item
                    v-for="item in defaultsEntries"
                    :key="item.key"
                  >
                    <v-list-item-title class="text-body-2">
                      {{ item.label }}
                    </v-list-item-title>
                    <template #append>
                      <div class="d-flex align-center ga-2">
                        <span
                          v-if="item.key === 'color'"
                          class="color-swatch"
                          :style="{ backgroundColor: String(item.value) }"
                        />
                        <span class="text-body-2 font-weight-medium">
                          {{ item.value ?? "—" }}
                        </span>
                      </div>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card class="rounded-xl border-0 shadow-sm h-100" elevation="3">
              <v-card-title class="text-subtitle-1 font-weight-black pa-4">
                Reglas de organigrama
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-0">
                <v-list density="compact" class="bg-transparent">
                  <v-list-item
                    v-for="item in reglasEntries"
                    :key="item.key"
                  >
                    <v-list-item-title class="text-body-2">
                      {{ item.label }}
                    </v-list-item-title>
                    <template #append>
                      <div class="d-flex align-center ga-2">
                        <span
                          v-if="item.key === 'defaultClaseColor'"
                          class="color-swatch"
                          :style="{ backgroundColor: String(item.value) }"
                        />
                        <span class="text-body-2 font-weight-medium">
                          {{ item.value ?? "—" }}
                        </span>
                      </div>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12">
            <v-card class="rounded-xl border-0 shadow-sm" elevation="3">
              <v-card-title class="text-subtitle-1 font-weight-black pa-4">
                Paleta de colores
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-4">
                <div
                  v-for="(row, rowIdx) in configStore.paleta"
                  :key="rowIdx"
                  class="d-flex flex-wrap ga-1 mb-2"
                >
                  <span
                    v-for="(color, colIdx) in row"
                    :key="`${rowIdx}-${colIdx}`"
                    class="palette-swatch"
                    :style="{ backgroundColor: color }"
                    :title="color"
                  />
                </div>
                <p
                  v-if="!configStore.paleta?.length"
                  class="text-body-2 text-medium-emphasis mb-0"
                >
                  No hay paleta cargada.
                </p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-alert
          v-if="configStore.error"
          type="warning"
          variant="tonal"
          class="mt-4 rounded-lg"
          density="comfortable"
        >
          {{ configStore.error }} (se muestran los valores por defecto locales)
        </v-alert>
      </v-tabs-window-item>

      <!-- Hub seguridad (solo ADMIN) -->
      <v-tabs-window-item v-if="isAdmin" value="seguridad">
        <v-row>
          <v-col cols="12" md="6" lg="4">
            <v-card
              class="rounded-xl border-0 shadow-sm h-100"
              elevation="3"
              to="/usuarios"
            >
              <v-card-text class="pa-5">
                <v-avatar color="deep-purple-lighten-4" size="48" class="mb-3">
                  <v-icon color="deep-purple-darken-2">mdi-account-multiple</v-icon>
                </v-avatar>
                <div class="text-h6 font-weight-black mb-1">Gestión de usuarios</div>
                <p class="text-body-2 text-medium-emphasis mb-0">
                  Alta con C.I. y nombres. El usuario define su contraseña en el
                  primer acceso (correo + C.I.).
                </p>
              </v-card-text>
              <v-card-actions class="px-5 pb-4">
                <v-btn
                  color="primary"
                  variant="tonal"
                  append-icon="mdi-arrow-right"
                  to="/usuarios"
                >
                  Abrir usuarios
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>

          <v-col cols="12" md="6" lg="4">
            <v-card
              class="rounded-xl border-0 shadow-sm h-100"
              elevation="3"
              to="/mof/organigrama-unidades"
            >
              <v-card-text class="pa-5">
                <v-avatar color="indigo-lighten-4" size="48" class="mb-3">
                  <v-icon color="indigo-darken-2">mdi-sitemap</v-icon>
                </v-avatar>
                <div class="text-h6 font-weight-black mb-1">Organigrama</div>
                <p class="text-body-2 text-medium-emphasis mb-0">
                  Estructura organizacional, clases y dependencias.
                </p>
              </v-card-text>
              <v-card-actions class="px-5 pb-4">
                <v-btn
                  color="primary"
                  variant="tonal"
                  append-icon="mdi-arrow-right"
                  to="/mof/organigrama-unidades"
                >
                  Abrir organigrama
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>

          <v-col cols="12" md="6" lg="4">
            <v-card
              class="rounded-xl border-0 shadow-sm h-100"
              elevation="3"
              to="/mof/arbol-unidades"
            >
              <v-card-text class="pa-5">
                <v-avatar color="teal-lighten-4" size="48" class="mb-3">
                  <v-icon color="teal-darken-2">mdi-file-tree</v-icon>
                </v-avatar>
                <div class="text-h6 font-weight-black mb-1">Árbol de unidades</div>
                <p class="text-body-2 text-medium-emphasis mb-0">
                  Jerarquía expandible con acciones por unidad.
                </p>
              </v-card-text>
              <v-card-actions class="px-5 pb-4">
                <v-btn
                  color="primary"
                  variant="tonal"
                  append-icon="mdi-arrow-right"
                  to="/mof/arbol-unidades"
                >
                  Abrir árbol
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-tabs-window-item>

      <!-- Información del sistema -->
      <v-tabs-window-item value="sistema">
        <v-card class="rounded-xl border-0 shadow-sm" elevation="3">
          <v-card-title class="text-h6 font-weight-black pa-5 pb-2">
            Información del sistema
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-5">
            <v-row dense>
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-medium-emphasis">Versión</div>
                <div class="text-body-1 font-weight-bold">{{ APP_VERSION }}</div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-medium-emphasis">Usuario</div>
                <div class="text-body-1 font-weight-bold">{{ userName }}</div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-medium-emphasis">Correo</div>
                <div class="text-body-1 font-weight-bold">{{ userEmail }}</div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-medium-emphasis">Roles</div>
                <div class="text-body-1 font-weight-bold">{{ userRoles }}</div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-medium-emphasis">Tema activo</div>
                <div class="text-body-1 font-weight-bold">
                  {{ isDark ? "Oscuro" : "Claro" }}
                </div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-medium-emphasis">Modo daltónico</div>
                <div class="text-body-1 font-weight-bold">
                  {{ accessibilityStore.colorblindMode ? "Activo" : "Inactivo" }}
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-tabs-window-item>
    </v-tabs-window>
  </v-container>
</template>

<style scoped>
.shadow-sm {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05) !important;
}
.color-swatch {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  display: inline-block;
}
.palette-swatch {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  display: inline-block;
}
</style>
