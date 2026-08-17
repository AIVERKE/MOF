<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const search = ref('')
const dialog = ref(false)
const deleteDialog = ref(false)
const selectedUser = ref(null)

const headers = [
  { title: 'USUARIO', key: 'nombre', align: 'start' },
  { title: 'CORREO ELECTRÓNICO', key: 'email' },
  { title: 'ROL DE ACCESO', key: 'rol' },
  { title: 'ESTADO', key: 'estado' },
  { title: 'ACCIONES', key: 'actions', sortable: false, align: 'center' }
]

const usuarios = ref([])

onMounted(() => {
  // Inicializamos solo con el usuario actual logueado (como única realidad confirmada)
  if (authStore.user) {
    usuarios.value = [{
      id: 1,
      nombre: authStore.user.nombre || 'Admin',
      email: authStore.user.username + '@umsa.bo',
      rol: authStore.user.rol || 'Administrador',
      estado: 'Activo'
    }]
  }
})

const form = ref({
  nombre: '',
  email: '',
  rol: 'Consulta',
  estado: 'Activo'
})

const roles = ['Super Admin', 'Administrador', 'Operador MOF', 'Consulta']

const openUserDialog = (item = null) => {
  if (item) {
    selectedUser.value = item
    form.value = { ...item }
  } else {
    selectedUser.value = null
    form.value = { nombre: '', email: '', rol: 'Consulta', estado: 'Activo' }
  }
  dialog.value = true
}

const confirmDelete = (item) => {
  selectedUser.value = item
  deleteDialog.value = true
}

const handleSave = () => {
  // Lógica futura de API
  dialog.value = false
}

const handleDelete = () => {
  // Lógica futura de API
  deleteDialog.value = false
}
</script>

<template>
  <v-container fluid class="pa-0">
    <!-- Header & Breadcrumb -->
    <div class="mb-6">
      <h1 class="text-h4 font-weight-black mb-1 text-slate-800">Gestión de Usuarios</h1>
      <div class="text-body-2 d-flex align-center text-slate-500">
        <v-icon size="18" class="mr-2">mdi-account-group</v-icon>
        <span>Administración</span>
        <v-icon size="16" class="mx-1">mdi-chevron-right</v-icon>
        <span class="font-weight-bold text-primary">Usuarios</span>
      </div>
    </div>

    <!-- Main Card -->
    <v-card class="rounded-xl border-0 shadow-sm" elevation="3">
      <v-card-title class="pa-5 d-flex align-center flex-wrap gap-4">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Buscar por nombre, correo o rol..."
          variant="outlined"
          density="compact"
          hide-details
          class="max-width-400"
          clearable
        ></v-text-field>
        
        <v-spacer></v-spacer>
        
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          class="rounded-lg font-weight-bold"
          @click="openUserDialog()"
        >
          Nuevo Usuario
          <v-tooltip activator="parent" location="top">Registrar un nuevo usuario en el sistema</v-tooltip>
        </v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <v-data-table
        :headers="headers"
        :items="usuarios"
        :search="search"
        hover
        density="comfortable"
        class="bg-transparent"
      >
        <!-- Custom Slot: Usuario (Nombre + Avatar) -->
        <template v-slot:item.nombre="{ item }">
          <div class="d-flex align-center py-2">
            <v-avatar color="indigo-lighten-4" size="32" class="mr-3">
              <span class="text-indigo-darken-3 text-caption font-weight-bold">
                {{ item.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) }}
              </span>
            </v-avatar>
            <span class="font-weight-bold text-slate-800">{{ item.nombre }}</span>
          </div>
        </template>

        <!-- Custom Slot: Rol -->
        <template v-slot:item.rol="{ item }">
          <v-chip
            size="x-small"
            label
            variant="tonal"
            :color="item.rol === 'Super Admin' ? 'deep-purple' : 'primary'"
            class="font-weight-black"
          >
            {{ item.rol }}
          </v-chip>
        </template>

        <!-- Custom Slot: Estado -->
        <template v-slot:item.estado="{ item }">
          <v-chip
            size="x-small"
            :color="item.estado === 'Activo' ? 'success' : 'grey-darken-1'"
            variant="flat"
            class="font-weight-bold"
          >
            {{ item.estado.toUpperCase() }}
          </v-chip>
        </template>

        <!-- Custom Slot: Acciones -->
        <template v-slot:item.actions="{ item }">
          <div class="d-flex justify-center gap-1">
            <v-btn
              icon="mdi-pencil"
              variant="text"
              size="small"
              color="orange-darken-2"
              @click="openUserDialog(item)"
            >
              <v-icon size="20">mdi-pencil</v-icon>
              <v-tooltip activator="parent" location="top">Editar perfil de usuario</v-tooltip>
            </v-btn>
            <v-btn
              icon="mdi-delete"
              variant="text"
              size="small"
              color="error"
              @click="confirmDelete(item)"
            >
              <v-icon size="20">mdi-delete</v-icon>
              <v-tooltip activator="parent" location="top">Dar de baja al usuario</v-tooltip>
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Modal: Crear/Editar Usuario -->
    <v-dialog v-model="dialog" max-width="500px" persistent>
      <v-card class="rounded-xl pa-2">
        <v-card-title class="text-h6 font-weight-black pa-4">
          {{ selectedUser ? 'Actualizar' : 'Registrar' }} Usuario
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-4 pt-6">
          <v-row dense>
            <v-col cols="12">
              <v-text-field
                v-model="form.nombre"
                label="Nombre Completo"
                variant="outlined"
                prepend-inner-icon="mdi-account"
                class="mb-2"
              ></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="form.email"
                label="Correo Institucional"
                variant="outlined"
                prepend-inner-icon="mdi-email"
                class="mb-2"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="form.rol"
                :items="roles"
                label="Rol de Sistema"
                variant="outlined"
              ></v-select>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="form.estado"
                :items="['Activo', 'Inactivo']"
                label="Estado Actual"
                variant="outlined"
              ></v-select>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" class="font-weight-bold" @click="dialog = false">Cancelar</v-btn>
          <v-btn color="primary" variant="elevated" class="rounded-lg px-6" @click="handleSave">
            {{ selectedUser ? 'Guardar Cambios' : 'Crear Usuario' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal: Confirmar Eliminación -->
    <v-dialog v-model="deleteDialog" max-width="400px">
      <v-card class="rounded-xl text-center pa-4">
        <v-card-text>
          <v-icon color="error" size="64" class="mb-4">mdi-alert-circle-outline</v-icon>
          <div class="text-h6 font-weight-black mb-2">¿Confirmar baja?</div>
          <p class="text-body-2 text-grey-darken-1">
            Estás a punto de desactivar al usuario <strong>{{ selectedUser?.nombre }}</strong>. 
            Esta acción impedirá su acceso al sistema.
          </p>
        </v-card-text>
        <v-card-actions class="justify-center gap-2">
          <v-btn variant="tonal" class="rounded-lg" @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" variant="elevated" class="rounded-lg px-6" @click="handleDelete">Desactivar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.max-width-400 { max-width: 400px; }
.shadow-sm { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05) !important; }
.text-xxs { font-size: 10px; }
</style>
