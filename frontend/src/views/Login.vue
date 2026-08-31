<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { rules } from '../utils/rules';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');
const formValid = ref(false);

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
                <h3 class="text-h5 font-weight-bold text-grey-darken-3">Iniciar Sesión</h3>
                <p class="text-body-2 text-grey-darken-1">
                  Ingrese sus credenciales para acceder
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

                <v-form v-model="formValid" class="w-100" @submit.prevent="handleLogin">
                  <v-text-field
                    v-model="email"
                    label="Email"
                    type="email"
                    prepend-inner-icon="mdi-email-outline"
                    variant="outlined"
                    density="comfortable"
                    class="mb-4"
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
                    :rules="[rules.required, rules.minLength(6)]"
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
