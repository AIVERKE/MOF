<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { ENDPOINTS } from '../config/api';
import { rules } from '../utils/rules';
import { hints } from '../config/hints';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');
const success = ref('');
const formValid = ref(false);

/** 'login' | 'primer-acceso' | 'definir-password' */
const step = ref('login');
const ci = ref('');
const passwordNueva = ref('');
const passwordConfirmacion = ref('');
const tempToken = ref('');

/** Longitud mínima desde mof_config (público). Fallback 6 si el API no responde. */
const passwordMinLength = ref(6);

const passwordRules = computed(() => [
  rules.required,
  rules.minLength(passwordMinLength.value),
]);

const hintPassword = computed(() =>
  hints.login.password(passwordMinLength.value),
);
const hintPasswordNueva = computed(() =>
  hints.login.passwordNueva(passwordMinLength.value),
);

const titulos = {
  login: {
    titulo: 'Iniciar Sesión',
    subtitulo: 'Ingrese sus credenciales para acceder',
  },
  'primer-acceso': {
    titulo: 'Primer Acceso',
    subtitulo: 'Identifíquese con su correo y carnet de identidad',
  },
  'definir-password': {
    titulo: 'Defina su Contraseña',
    subtitulo: 'Será la que use de ahora en adelante para ingresar',
  },
};

const passwordsCoinciden = (value) =>
  value === passwordNueva.value || 'Las contraseñas no coinciden';

function irA(destino) {
  step.value = destino;
  error.value = '';
  success.value = '';
  formValid.value = false;
  password.value = '';
  passwordNueva.value = '';
  passwordConfirmacion.value = '';
  if (destino === 'login') {
    ci.value = '';
    tempToken.value = '';
  }
}

async function loadPasswordPolicy() {
  try {
    const response = await fetch(ENDPOINTS.AUTH.PASSWORD_POLICY);
    if (!response.ok) return;
    const data = await response.json();
    const n = Number(data?.minLength ?? data?.data?.minLength);
    if (Number.isFinite(n) && n >= 6) {
      passwordMinLength.value = n;
    }
  } catch {
    // Degradación: se mantiene el fallback 6
  }
}

onMounted(() => {
  loadPasswordPolicy();
});

const handleLogin = async () => {
  if (!formValid.value) {
    error.value = 'Por favor complete el formulario correctamente';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    await authStore.login(email.value, password.value);
    router.push('/dashboard');
  } catch (err) {
    error.value = err.message || 'Credenciales inválidas';
  } finally {
    loading.value = false;
  }
};

const handlePrimerAcceso = async () => {
  if (!formValid.value) {
    error.value = 'Por favor complete el formulario correctamente';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    tempToken.value = await authStore.primerAcceso(email.value, ci.value.trim());
    step.value = 'definir-password';
    formValid.value = false;
  } catch (err) {
    error.value = err.message || 'No se pudo validar el primer acceso';
  } finally {
    loading.value = false;
  }
};

const handleDefinirPassword = async () => {
  if (!formValid.value) {
    error.value = 'Por favor complete el formulario correctamente';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    await authStore.cambiarPassword(tempToken.value, passwordNueva.value);
    irA('login');
    success.value = 'Contraseña definida. Ya puede ingresar con su correo y contraseña.';
  } catch (err) {
    error.value = err.message || 'No se pudo definir la contraseña';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <v-container fluid class="fill-height pa-0 login-wrapper">
    <v-row no-gutters class="fill-height align-center justify-center">
      <v-col cols="12" sm="10" md="10" lg="8" xl="6" class="pa-4 pa-sm-6">
        <v-card elevation="16" class="rounded-xl overflow-hidden login-card">
          <v-row no-gutters>
            <!-- Columna izquierda: branding (desktop) -->
            <v-col
              cols="12"
              md="6"
              class="login-banner d-none d-md-flex flex-column justify-space-between pa-10 text-white"
            >
              <div>
                <div class="d-flex align-center gap-3 mb-6">
                  <v-avatar color="white" size="56" class="elevation-4">
                    <v-icon size="36" color="indigo-darken-3">mdi-view-dashboard</v-icon>
                  </v-avatar>
                  <div>
                    <h1 class="text-h3 font-weight-black tracking-tight text-white mb-0">
                      S-MAU
                    </h1>
                    <span class="text-caption font-weight-medium text-indigo-lighten-4">
                      Plataforma Institucional
                    </span>
                  </div>
                </div>

                <h2 class="text-h5 font-weight-bold mb-3 leading-snug">
                  Manual de Organización y Funciones
                </h2>
                <p class="text-body-2 text-indigo-lighten-4 mb-8">
                  Sistema centralizado para la gestión de la estructura organizacional,
                  cargos y funciones de la Universidad Mayor de San Andrés.
                </p>
              </div>

              <div class="pt-6 border-indigo-lighten-3">
                <div class="text-caption text-indigo-lighten-3">
                  © 2026 Universidad Mayor de San Andrés - UMSA
                </div>
              </div>
            </v-col>

            <!-- Columna derecha: formulario -->
            <v-col
              cols="12"
              md="6"
              class="pa-6 pa-sm-10 d-flex flex-column justify-space-between bg-surface"
            >
              <div class="d-md-none text-center mb-6">
                <v-avatar color="primary" size="64" class="mb-3 elevation-3">
                  <v-icon size="36" color="white">mdi-view-dashboard</v-icon>
                </v-avatar>
                <h1 class="text-h3 font-weight-black text-primary mb-0">S-MAU</h1>
                <div class="text-subtitle-1 font-weight-bold text-grey-darken-2 mt-1">
                  Manual de Organización y Funciones
                </div>
                <div class="text-caption text-grey">Universidad Mayor de San Andrés</div>
              </div>

              <div class="d-none d-md-block mb-6">
                <h3 class="text-h5 font-weight-bold text-grey-darken-3">
                  {{ titulos[step].titulo }}
                </h3>
                <p class="text-body-2 text-grey-darken-1">
                  {{ titulos[step].subtitulo }}
                </p>
              </div>

              <div class="my-auto py-2">
                <v-fade-transition>
                  <v-alert
                    v-if="error"
                    type="error"
                    variant="tonal"
                    density="comfortable"
                    closable
                    class="mb-5 rounded-lg text-body-2 font-weight-medium"
                    prepend-icon="mdi-alert-circle"
                    @click:close="error = ''"
                  >
                    {{ error }}
                  </v-alert>
                </v-fade-transition>

                <v-fade-transition>
                  <v-alert
                    v-if="success"
                    type="success"
                    variant="tonal"
                    density="comfortable"
                    closable
                    class="mb-5 rounded-lg text-body-2 font-weight-medium"
                    prepend-icon="mdi-check-circle"
                    @click:close="success = ''"
                  >
                    {{ success }}
                  </v-alert>
                </v-fade-transition>

                <v-form
                  v-if="step === 'login'"
                  v-model="formValid"
                  class="w-100"
                  @submit.prevent="handleLogin"
                >
                  <v-text-field
                    v-model="email"
                    label="Email"
                    type="email"
                    prepend-inner-icon="mdi-email-outline"
                    variant="outlined"
                    density="comfortable"
                    class="mb-4"
                    :hint="hints.login.email"
                    :persistent-hint="false"
                    :rules="[rules.email]"
                    :disabled="loading"
                    autocomplete="username"
                  />

                  <v-text-field
                    v-model="password"
                    label="Contraseña"
                    prepend-inner-icon="mdi-lock-outline"
                    :type="showPassword ? 'text' : 'password'"
                    :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                    variant="outlined"
                    density="comfortable"
                    class="mb-6"
                    :hint="hintPassword"
                    :persistent-hint="true"
                    :rules="passwordRules"
                    :disabled="loading"
                    autocomplete="current-password"
                    @click:append-inner="showPassword = !showPassword"
                  />

                  <v-btn
                    type="submit"
                    color="primary"
                    size="large"
                    block
                    :loading="loading"
                    :disabled="loading || !formValid"
                    elevation="3"
                    class="rounded-lg text-button font-weight-bold py-6 text-none"
                  >
                    <template #loader>
                      <v-progress-circular
                        indeterminate
                        color="white"
                        size="24"
                      />
                      <span class="ml-3">Verificando...</span>
                    </template>
                    INGRESAR AL SISTEMA
                  </v-btn>

                  <v-btn
                    variant="text"
                    color="primary"
                    block
                    class="mt-3 text-none"
                    :disabled="loading"
                    @click="irA('primer-acceso')"
                  >
                    Primer acceso al sistema
                  </v-btn>
                </v-form>

                <v-form
                  v-else-if="step === 'primer-acceso'"
                  v-model="formValid"
                  class="w-100"
                  @submit.prevent="handlePrimerAcceso"
                >
                  <p class="text-body-2 text-grey-darken-1 mb-4">
                    Si es su primera vez, ingrese el correo y el carnet de identidad con
                    los que el administrador registró su cuenta para definir su contraseña.
                  </p>

                  <v-text-field
                    v-model="email"
                    label="Email"
                    type="email"
                    prepend-inner-icon="mdi-email-outline"
                    variant="outlined"
                    density="comfortable"
                    class="mb-4"
                    :hint="hints.login.email"
                    :persistent-hint="false"
                    :rules="[rules.email]"
                    :disabled="loading"
                    autocomplete="username"
                  />

                  <v-text-field
                    v-model="ci"
                    label="Carnet de Identidad"
                    prepend-inner-icon="mdi-card-account-details-outline"
                    variant="outlined"
                    density="comfortable"
                    class="mb-6"
                    :hint="hints.login.ci"
                    :persistent-hint="false"
                    :rules="[rules.required]"
                    :disabled="loading"
                  />

                  <v-btn
                    type="submit"
                    color="primary"
                    size="large"
                    block
                    :loading="loading"
                    :disabled="loading || !formValid"
                    elevation="3"
                    class="rounded-lg text-button font-weight-bold py-6 text-none"
                  >
                    CONTINUAR
                  </v-btn>

                  <v-btn
                    variant="text"
                    color="primary"
                    block
                    class="mt-3 text-none"
                    :disabled="loading"
                    @click="irA('login')"
                  >
                    Volver al inicio de sesión
                  </v-btn>
                </v-form>

                <v-form
                  v-else
                  v-model="formValid"
                  class="w-100"
                  @submit.prevent="handleDefinirPassword"
                >
                  <v-text-field
                    v-model="passwordNueva"
                    label="Nueva contraseña"
                    prepend-inner-icon="mdi-lock-outline"
                    :type="showPassword ? 'text' : 'password'"
                    :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                    variant="outlined"
                    density="comfortable"
                    class="mb-4"
                    :hint="hintPasswordNueva"
                    :persistent-hint="true"
                    :rules="passwordRules"
                    :disabled="loading"
                    autocomplete="new-password"
                    @click:append-inner="showPassword = !showPassword"
                  />

                  <v-text-field
                    v-model="passwordConfirmacion"
                    label="Confirmar contraseña"
                    prepend-inner-icon="mdi-lock-check-outline"
                    :type="showPassword ? 'text' : 'password'"
                    variant="outlined"
                    density="comfortable"
                    class="mb-6"
                    :hint="hints.login.passwordConfirmacion"
                    :persistent-hint="false"
                    :rules="[rules.required, passwordsCoinciden]"
                    :disabled="loading"
                    autocomplete="new-password"
                  />

                  <v-btn
                    type="submit"
                    color="primary"
                    size="large"
                    block
                    :loading="loading"
                    :disabled="loading || !formValid"
                    elevation="3"
                    class="rounded-lg text-button font-weight-bold py-6 text-none"
                  >
                    GUARDAR CONTRASEÑA
                  </v-btn>

                  <v-btn
                    variant="text"
                    color="primary"
                    block
                    class="mt-3 text-none"
                    :disabled="loading"
                    @click="irA('login')"
                  >
                    Cancelar
                  </v-btn>
                </v-form>
              </div>

              <div class="mt-8 text-center border-t pt-4">
                <div class="text-caption font-weight-medium text-grey-darken-1">
                  MOF v1.0.0
                </div>
                <div class="d-md-none text-caption text-grey mt-1">
                  © 2026 Universidad Mayor de San Andrés
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%);
}

.login-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35) !important;
}

.login-banner {
  background: linear-gradient(135deg, #3730a3 0%, #4f46e5 50%, #6366f1 100%);
  position: relative;
  overflow: hidden;
}

.login-banner::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 60%);
  pointer-events: none;
}

.border-indigo-lighten-3 {
  border-top: 1px solid rgba(255, 255, 255, 0.2) !important;
}

.gap-3 {
  gap: 12px;
}
</style>
