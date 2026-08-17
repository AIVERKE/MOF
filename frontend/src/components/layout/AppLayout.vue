<!-- 
 Create by: Jesus Reynaldo Perez Benavides 
 phone: +591 73030203
 mail: jperezbenavides@gmail.com
 -->
<script setup>
import { ref, computed, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useTheme } from "vuetify";

const route = useRoute();
const router = useRouter();
const theme = useTheme();
const drawer = ref(true);
const authStore = useAuthStore();

const toggleTheme = () => {
  theme.global.name.value = theme.global.current.value.dark ? "light" : "dark";
};

// --- Lógica de Redimensionamiento ---
const drawerWidth = ref(260);
const isResizing = ref(false);

const startResizing = () => {
  isResizing.value = true;
  document.addEventListener("mousemove", resize);
  document.addEventListener("mouseup", stopResizing);
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
};

const resize = (e) => {
  if (isResizing.value) {
    const newWidth = e.clientX;
    if (newWidth > 200 && newWidth < 600) {
      drawerWidth.value = newWidth;
    }
  }
};

const stopResizing = () => {
  isResizing.value = false;
  document.removeEventListener("mousemove", resize);
  document.removeEventListener("mouseup", stopResizing);
  document.body.style.cursor = "default";
  document.body.style.userSelect = "auto";
};

// --- Soporte Táctil (Móviles / Tablets) ---
const startResizingTouch = () => {
  isResizing.value = true;
  document.addEventListener("touchmove", resizeTouch);
  document.addEventListener("touchend", stopResizingTouch);
  document.body.style.userSelect = "none";
};

const resizeTouch = (e) => {
  if (isResizing.value && e.touches.length > 0) {
    const newWidth = e.touches[0].clientX;
    if (newWidth > 200 && newWidth < 600) {
      drawerWidth.value = newWidth;
    }
  }
};

const stopResizingTouch = () => {
  isResizing.value = false;
  document.removeEventListener("touchmove", resizeTouch);
  document.removeEventListener("touchend", stopResizingTouch);
  document.body.style.userSelect = "auto";
};

const actualDrawerWidth = computed(() => {
  if (typeof window !== "undefined") {
    return Math.min(drawerWidth.value, window.innerWidth);
  }
  return drawerWidth.value;
});

onUnmounted(() => {
  stopResizing();
  stopResizingTouch();
});
// ------------------------------------

const isLoginPage = computed(() => route.path === "/");
const userName = computed(() => authStore.user?.nombre || "Usuario");
const userInitials = computed(() => {
  const name = authStore.user?.nombre || "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
});

const handleLogout = async () => {
  authStore.logout();
  await router.push("/");
};
</script>
<template>
  <v-app>
    <!-- Barra superior -->
    <v-app-bar v-if="!isLoginPage" height="70">
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-app-bar-title>
        <v-icon color="primary" size="32" class="mr-2"
          >mdi-view-dashboard</v-icon
        >
        S-MAU
      </v-app-bar-title>
      <v-spacer></v-spacer>

      <!-- Icono de Tema (Dark/Light) -->
      <v-btn icon variant="text" class="mr-2" @click="toggleTheme">
        <v-icon>{{
          theme.global.current.value.dark
            ? "mdi-weather-sunny"
            : "mdi-weather-night"
        }}</v-icon>
        <v-tooltip activator="parent" location="bottom">
          Cambiar a modo
          {{ theme.global.current.value.dark ? "claro" : "oscuro" }}
        </v-tooltip>
      </v-btn>

      <!-- Notificaciones (Sin contador hardcodeado) -->
      <v-btn icon variant="text" class="mr-2">
        <v-icon>mdi-bell-outline</v-icon>
        <v-tooltip activator="parent" location="bottom"
          >Notificaciones</v-tooltip
        >
      </v-btn>

      <!-- Menú de usuario con iniciales -->
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props" class="ml-2">
            <v-avatar color="primary" size="32">
              <span class="text-white text-caption">{{ userInitials }}</span>
            </v-avatar>
            <v-tooltip activator="parent" location="bottom"
              >Perfil de {{ userName }}</v-tooltip
            >
          </v-btn>
        </template>
        <v-list density="compact" min-width="150">
          <v-list-item
            prepend-icon="mdi-account"
            title="Mi Perfil"
            value="profile"
          ></v-list-item>
          <v-list-item
            prepend-icon="mdi-cog"
            title="Configuración"
            value="settings"
          ></v-list-item>
          <v-divider></v-divider>
          <v-list-item
            prepend-icon="mdi-logout"
            title="Cerrar Sesión"
            class="text-error"
            @click="handleLogout"
          ></v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- Sidebar de navegación -->
    <v-navigation-drawer
      v-if="!isLoginPage"
      v-model="drawer"
      app
      :width="actualDrawerWidth"
      class="resizable-drawer"
    >
      <div class="pa-2">
        <div class="sidebar-section-title">Menú</div>
        <v-list density="compact" nav>
          <v-list-item
            prepend-icon="mdi-view-dashboard"
            title="Dashboard"
            to="/dashboard"
          ></v-list-item>
          <v-list-item
            prepend-icon="mdi-account-multiple"
            title="Usuarios"
            to="/usuarios"
          ></v-list-item>
          <v-list-group
            class="no-indent"
            prepend-icon="mdi-package-variant"
            value="MOF"
          >
            <template #activator="{ props }">
              <v-list-item v-bind="props" title="MOF"></v-list-item>
            </template>
            <v-list-item
              prepend-icon="mdi-sitemap"
              title="ESTRUCTURA ORGANIZACIONAL"
              to="/mof/organigrama-unidades"
            ></v-list-item>
            <v-list-item
              prepend-icon="mdi-list-box"
              title="LISTAR UNIDADES"
              to="/mof/listar-unidades"
            >
            </v-list-item>

            <v-list-item
              prepend-icon="mdi-tree"
              title="ARBOL DE UNIDADES"
              to="/mof/arbol-unidades"
            ></v-list-item>
          </v-list-group>
          <v-list-group prepend-icon="mdi-chart-bar" value="Reportes">
            <template #activator="{ props }">
              <v-list-item v-bind="props" title="Reportes"></v-list-item>
            </template>

            <v-list-item
              prepend-icon="mdi-view-dashboard-outline"
              title="DASHBOARD EJECUTIVO"
              to="/reportes/ejecutivo"
            >
            </v-list-item>

            <v-list-item
              prepend-icon="mdi-domain"
              title="DASHBOARD FACULTATIVO"
              to="/reportes/facultativo"
            >
            </v-list-item>
          </v-list-group>
          <v-list-item
            prepend-icon="mdi-cog"
            title="Configuración"
            to="/configuracion"
          ></v-list-item>
        </v-list>
        <div class="sidebar-section-title">Sección</div>
      </div>

      <template v-slot:append>
        <v-divider></v-divider>
        <div class="pa-4" style="border-top: 1px solid var(--color-border)">
          <v-list-item
            class="px-2"
            @click="handleLogout"
            style="cursor: pointer"
          >
            <template v-slot:prepend>
              <v-avatar color="primary" size="40">
                <span class="text-white">{{ userInitials }}</span>
              </v-avatar>
            </template>
            <v-list-item-title class="font-weight-medium">{{
              userName
            }}</v-list-item-title>
            <v-list-item-subtitle class="text-caption">{{
              authStore.user?.rol || "Usuario"
            }}</v-list-item-subtitle>
            <template v-slot:append>
              <v-icon color="error">mdi-power</v-icon>
            </template>
          </v-list-item>
        </div>
      </template>

      <!-- Manejador para redimensionar -->
      <div class="resize-handle" @mousedown="startResizing" @touchstart="startResizingTouch"></div>
    </v-navigation-drawer>

    <!-- Contenido principal -->
    <v-main>
      <v-container
        fluid
        :class="isLoginPage ? 'pa-0' : 'pa-6'"
        class="fill-height"
      >
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>
<style scoped>
.resizable-drawer {
  position: relative;
  transition: none !important;
}

.resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  z-index: 100;
  background: transparent;
  transition: background 0.2s;
}

.resize-handle:hover,
.resize-handle:active {
  background: rgba(var(--v-theme-primary), 0.3);
  width: 6px;
}
</style>
