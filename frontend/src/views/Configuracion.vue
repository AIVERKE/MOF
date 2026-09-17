<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useTheme } from "vuetify";
import { useAuthStore } from "@/stores/auth";
import { useAccessibilityStore } from "@/stores/accessibility";
import { useConfigMofStore } from "@/stores/config_mof";
import { useSnackbar } from "@/composables/useSnackbar";

const APP_VERSION = "MOF v1.0.0";

const LADO_OPTIONS = ["AUTOMATICO", "IZQUIERDA", "DERECHA", "CENTRO"];

const ROLE_INFO = [
  {
    codigo: "ADMIN",
    titulo: "Administrador",
    descripcion:
      "Gestión de usuarios, configuración MOF, política de contraseñas y consulta de auditoría.",
  },
  {
    codigo: "OPERADOR",
    titulo: "Operador",
    descripcion:
      "Alta y edición de unidades, organigrama, catálogos operativos y reportes del día a día.",
  },
  {
    codigo: "USER",
    titulo: "Usuario",
    descripcion:
      "Consulta de información y preferencias personales (tema, modo daltónico).",
  },
];

const theme = useTheme();
const authStore = useAuthStore();
const accessibilityStore = useAccessibilityStore();
const configStore = useConfigMofStore();
const { mostrar } = useSnackbar();

const tab = ref("preferencias");
const savingSection = ref(null);

const isAdmin = computed(() => authStore.isAdmin());
const isDark = computed(() => accessibilityStore.themeMode === "dark");

const userEmail = computed(() => authStore.user?.email || "—");
const userName = computed(() => authStore.user?.nombre || "—");
const userRoles = computed(() => {
  const roles = authStore.user?.roles;
  if (Array.isArray(roles) && roles.length) return roles.join(", ");
  return authStore.user?.rol || "—";
});

const formDefaults = reactive({
  tipo: 1,
  nivel: 1,
  relacion: 1,
  clase: 1,
  color: "#1976D2",
  lado: "AUTOMATICO",
  oficial: true,
  es_troncal: false,
});

const formReglas = reactive({
  pesoNulo: 99,
  pesoDefault: 10,
  defaultClaseColor: "#757575",
  staffRelacionCodigos: "S",
  ladoTroncalForzado: "CENTRO",
});

const formPaleta = ref([]);
const formPasswordMinLength = ref(6);

function syncFormsFromStore() {
  Object.assign(formDefaults, {
    ...configStore.defaults,
  });
  Object.assign(formReglas, {
    ...configStore.reglas,
    staffRelacionCodigos: Array.isArray(configStore.reglas.staffRelacionCodigos)
      ? configStore.reglas.staffRelacionCodigos.join(", ")
      : String(configStore.reglas.staffRelacionCodigos || ""),
  });
  formPaleta.value = JSON.parse(JSON.stringify(configStore.paleta || []));
  formPasswordMinLength.value = configStore.passwordMinLength;
}

watch(
  () => configStore.isLoaded,
  (loaded) => {
    if (loaded) syncFormsFromStore();
  },
);

function onThemeToggle(enabled) {
  accessibilityStore.setThemeMode(enabled ? "dark" : "light");
  theme.global.name.value = accessibilityStore.themeMode;
}

function parseStaffCodigos(raw) {
  return String(raw || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function saveSection(section, payload) {
  if (!isAdmin.value) return;
  savingSection.value = section;
  try {
    await configStore.saveConfig(payload);
    syncFormsFromStore();
    mostrar("Configuración guardada", "success");
  } catch (err) {
    mostrar(err?.message || configStore.error || "Error al guardar", "error");
  } finally {
    savingSection.value = null;
  }
}

function saveDefaults() {
  return saveSection("defaults", {
    defaults: {
      tipo: Number(formDefaults.tipo),
      nivel: Number(formDefaults.nivel),
      relacion: Number(formDefaults.relacion),
      clase: Number(formDefaults.clase),
      color: formDefaults.color,
      lado: formDefaults.lado,
      oficial: !!formDefaults.oficial,
      es_troncal: !!formDefaults.es_troncal,
    },
  });
}

function saveReglas() {
  return saveSection("reglas", {
    reglas: {
      pesoNulo: Number(formReglas.pesoNulo),
      pesoDefault: Number(formReglas.pesoDefault),
      defaultClaseColor: formReglas.defaultClaseColor,
      staffRelacionCodigos: parseStaffCodigos(formReglas.staffRelacionCodigos),
      ladoTroncalForzado: formReglas.ladoTroncalForzado,
    },
  });
}

function savePaleta() {
  return saveSection("paleta", {
    paleta: formPaleta.value.map((row) =>
      row.map((c) => String(c || "").trim()),
    ),
  });
}

function savePasswordPolicy() {
  const minLength = Number(formPasswordMinLength.value);
  if (!Number.isFinite(minLength) || minLength < 6 || minLength > 128) {
    mostrar("La longitud mínima debe estar entre 6 y 128", "warning");
    return;
  }
  return saveSection("password", {
    passwordPolicy: { minLength },
  });
}

function updatePaletteColor(rowIdx, colIdx, value) {
  const next = formPaleta.value.map((row) => [...row]);
  next[rowIdx][colIdx] = value;
  formPaleta.value = next;
}

onMounted(async () => {
  theme.global.name.value = accessibilityStore.themeMode;
  await configStore.fetchConfig();
  syncFormsFromStore();
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

      <!-- Config MOF -->
      <v-tabs-window-item value="mof">
        <v-alert
          v-if="!isAdmin"
          type="info"
          variant="tonal"
          density="comfortable"
          class="mb-4 rounded-lg"
          prepend-icon="mdi-information-outline"
        >
          Valores actuales del sistema (solo lectura). Solo un administrador
          puede editarlos.
        </v-alert>

        <v-progress-linear
          v-if="configStore.loading"
          indeterminate
          color="primary"
          class="mb-4"
        />

        <v-row>
          <v-col cols="12" md="6">
            <v-card class="rounded-xl border-0 shadow-sm h-100" elevation="3">
              <v-card-title class="text-subtitle-1 font-weight-black pa-4">
                Defaults de nuevas unidades
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-4">
                <v-row dense>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="formDefaults.tipo"
                      label="Tipo (id)"
                      type="number"
                      density="compact"
                      variant="outlined"
                      :readonly="!isAdmin"
                      hide-details="auto"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="formDefaults.nivel"
                      label="Nivel (id)"
                      type="number"
                      density="compact"
                      variant="outlined"
                      :readonly="!isAdmin"
                      hide-details="auto"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="formDefaults.relacion"
                      label="Relación (id)"
                      type="number"
                      density="compact"
                      variant="outlined"
                      :readonly="!isAdmin"
                      hide-details="auto"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="formDefaults.clase"
                      label="Clase (id)"
                      type="number"
                      density="compact"
                      variant="outlined"
                      :readonly="!isAdmin"
                      hide-details="auto"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model="formDefaults.color"
                      label="Color"
                      density="compact"
                      variant="outlined"
                      :readonly="!isAdmin"
                      hide-details="auto"
                      type="color"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-select
                      v-model="formDefaults.lado"
                      :items="LADO_OPTIONS"
                      label="Lado"
                      density="compact"
                      variant="outlined"
                      :readonly="!isAdmin"
                      hide-details="auto"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-switch
                      v-model="formDefaults.oficial"
                      label="Oficial"
                      color="primary"
                      density="compact"
                      :disabled="!isAdmin"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-switch
                      v-model="formDefaults.es_troncal"
                      label="Es troncal"
                      color="primary"
                      density="compact"
                      :disabled="!isAdmin"
                      hide-details
                    />
                  </v-col>
                </v-row>
              </v-card-text>
              <v-card-actions v-if="isAdmin" class="px-4 pb-4">
                <v-spacer />
                <v-btn
                  color="primary"
                  variant="tonal"
                  :loading="savingSection === 'defaults'"
                  @click="saveDefaults"
                >
                  Guardar defaults
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card class="rounded-xl border-0 shadow-sm h-100" elevation="3">
              <v-card-title class="text-subtitle-1 font-weight-black pa-4">
                Reglas de organigrama
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-4">
                <v-row dense>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="formReglas.pesoNulo"
                      label="Peso nulo"
                      type="number"
                      density="compact"
                      variant="outlined"
                      :readonly="!isAdmin"
                      hide-details="auto"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="formReglas.pesoDefault"
                      label="Peso por defecto"
                      type="number"
                      density="compact"
                      variant="outlined"
                      :readonly="!isAdmin"
                      hide-details="auto"
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      v-model="formReglas.defaultClaseColor"
                      label="Color clase por defecto"
                      density="compact"
                      variant="outlined"
                      :readonly="!isAdmin"
                      hide-details="auto"
                      type="color"
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      v-model="formReglas.staffRelacionCodigos"
                      label="Códigos relación staff"
                      density="compact"
                      variant="outlined"
                      :readonly="!isAdmin"
                      hint="Separados por coma (ej. S, A)"
                      persistent-hint
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-select
                      v-model="formReglas.ladoTroncalForzado"
                      :items="LADO_OPTIONS"
                      label="Lado troncal forzado"
                      density="compact"
                      variant="outlined"
                      :readonly="!isAdmin"
                      hide-details="auto"
                    />
                  </v-col>
                </v-row>
              </v-card-text>
              <v-card-actions v-if="isAdmin" class="px-4 pb-4">
                <v-spacer />
                <v-btn
                  color="primary"
                  variant="tonal"
                  :loading="savingSection === 'reglas'"
                  @click="saveReglas"
                >
                  Guardar reglas
                </v-btn>
              </v-card-actions>
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
                  v-for="(row, rowIdx) in formPaleta"
                  :key="rowIdx"
                  class="d-flex flex-wrap ga-2 mb-3"
                >
                  <input
                    v-for="(color, colIdx) in row"
                    :key="`${rowIdx}-${colIdx}`"
                    class="palette-input"
                    type="color"
                    :value="color"
                    :disabled="!isAdmin"
                    :title="color"
                    @input="updatePaletteColor(rowIdx, colIdx, $event.target.value)"
                  />
                </div>
                <p
                  v-if="!formPaleta?.length"
                  class="text-body-2 text-medium-emphasis mb-0"
                >
                  No hay paleta cargada.
                </p>
              </v-card-text>
              <v-card-actions v-if="isAdmin" class="px-4 pb-4">
                <v-spacer />
                <v-btn
                  color="primary"
                  variant="tonal"
                  :loading="savingSection === 'paleta'"
                  @click="savePaleta"
                >
                  Guardar paleta
                </v-btn>
              </v-card-actions>
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
          {{ configStore.error }}
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
              to="/auditoria"
            >
              <v-card-text class="pa-5">
                <v-avatar color="blue-grey-lighten-4" size="48" class="mb-3">
                  <v-icon color="blue-grey-darken-2">mdi-history</v-icon>
                </v-avatar>
                <div class="text-h6 font-weight-black mb-1">Auditoría</div>
                <p class="text-body-2 text-medium-emphasis mb-0">
                  Historial de cambios registrados (altas de usuarios, organigrama
                  y demás tablas auditadas).
                </p>
              </v-card-text>
              <v-card-actions class="px-5 pb-4">
                <v-btn
                  color="primary"
                  variant="tonal"
                  append-icon="mdi-arrow-right"
                  to="/auditoria"
                >
                  Ver historial
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>

          <v-col cols="12" md="6" lg="4">
            <v-card class="rounded-xl border-0 shadow-sm h-100" elevation="3">
              <v-card-text class="pa-5">
                <v-avatar color="amber-lighten-4" size="48" class="mb-3">
                  <v-icon color="amber-darken-3">mdi-form-textbox-password</v-icon>
                </v-avatar>
                <div class="text-h6 font-weight-black mb-1">
                  Política de contraseñas
                </div>
                <p class="text-body-2 text-medium-emphasis mb-4">
                  Aplica al primer acceso, cambio de contraseña y reset desde
                  usuarios.
                </p>
                <v-text-field
                  v-model.number="formPasswordMinLength"
                  label="Longitud mínima"
                  type="number"
                  min="6"
                  max="128"
                  density="compact"
                  variant="outlined"
                  hide-details="auto"
                />
              </v-card-text>
              <v-card-actions class="px-5 pb-4">
                <v-btn
                  color="primary"
                  variant="tonal"
                  :loading="savingSection === 'password'"
                  @click="savePasswordPolicy"
                >
                  Guardar política
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>

          <v-col cols="12">
            <v-card class="rounded-xl border-0 shadow-sm" elevation="3">
              <v-card-title class="text-subtitle-1 font-weight-black pa-4">
                Roles del sistema
              </v-card-title>
              <v-card-subtitle class="px-4 pb-2">
                Referencia informativa. Los permisos se aplican en el backend
                (decoradores); no se editan desde aquí.
              </v-card-subtitle>
              <v-divider></v-divider>
              <v-card-text class="pa-0">
                <v-list lines="two" class="bg-transparent">
                  <v-list-item
                    v-for="rol in ROLE_INFO"
                    :key="rol.codigo"
                  >
                    <template #prepend>
                      <v-chip
                        size="small"
                        class="mr-3"
                        :color="
                          rol.codigo === 'ADMIN'
                            ? 'deep-purple'
                            : rol.codigo === 'OPERADOR'
                              ? 'primary'
                              : 'grey'
                        "
                        variant="tonal"
                      >
                        {{ rol.codigo }}
                      </v-chip>
                    </template>
                    <v-list-item-title class="font-weight-bold">
                      {{ rol.titulo }}
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      {{ rol.descripcion }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card-text>
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
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-medium-emphasis">
                  Longitud mín. contraseña
                </div>
                <div class="text-body-1 font-weight-bold">
                  {{ configStore.passwordMinLength }}
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
.palette-input {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  padding: 0;
  background: transparent;
  cursor: pointer;
}
.palette-input:disabled {
  cursor: default;
  opacity: 0.85;
}
</style>
