<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');

const handleLogin = async () => {
  if (!username.value || !password.value) {
    error.value = 'Por favor ingrese sus credenciales';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    await authStore.login(username.value, password.value);
    router.push('/dashboard');
  } catch (err) {
    error.value = 'Usuario o contraseña incorrectos';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <v-container fluid class="fill-height bg-grey-lighten-3 login-bg">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4" lg="3">
        <v-card elevation="12" class="rounded-xl pa-4">
          <v-card-item class="text-center py-8">
            <v-avatar color="primary" size="80" class="mb-4">
              <v-icon size="48" color="white">mdi-view-dashboard</v-icon>
            </v-avatar>
            <v-card-title class="text-h4 font-weight-black text-primary">S-MAU</v-card-title>
            <v-card-subtitle class="mt-2 font-weight-medium">Sistema de Gestión Institucional</v-card-subtitle>
          </v-card-item>

          <v-card-text>
            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              density="compact"
              class="mb-4 rounded-lg"
            >
              {{ error }}
            </v-alert>

            <v-form @submit.prevent="handleLogin">
              <v-text-field
                v-model="username"
                label="Usuario"
                prepend-inner-icon="mdi-account"
                variant="outlined"
                density="comfortable"
                class="mb-2"
                hide-details
              ></v-text-field>

              <v-text-field
                v-model="password"
                label="Contraseña"
                prepend-inner-icon="mdi-lock"
                :type="showPassword ? 'text' : 'password'"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPassword = !showPassword"
                variant="outlined"
                density="comfortable"
                class="mb-4"
                hide-details
              ></v-text-field>

              <v-btn
                type="submit"
                color="primary"
                size="large"
                block
                :loading="loading"
                elevation="4"
                class="rounded-lg text-button font-weight-bold py-6"
              >
                INGRESAR
              </v-btn>
            </v-form>
          </v-card-text>

          <v-card-actions class="justify-center pb-6">
            <v-btn variant="text" size="small" color="grey-darken-1" class="text-caption">
              ¿Olvidó su contraseña?
            </v-btn>
          </v-card-actions>
        </v-card>
        
        <div class="text-center mt-6 text-grey-darken-1 text-caption">
          © 2026 Universidad Mayor de San Andrés - UMSA
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.login-bg {
  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%) !important;
}
.v-card {
  border-top: 8px solid #3730A3;
}
</style>
