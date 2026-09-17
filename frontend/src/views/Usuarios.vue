<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUsuariosStore } from '@/stores/usuarios'
import { useSnackbar } from '@/composables/useSnackbar'
import { hints } from '@/config/hints'

const usuariosStore = useUsuariosStore()
const { showSnackbar } = useSnackbar()

const search = ref('')
const dialog = ref(false)
const deleteDialog = ref(false)
const selectedUser = ref(null)
const saving = ref(false)

const headers = [
  { title: 'USUARIO', key: 'nombre', align: 'start' },
  { title: 'CORREO ELECTRÓNICO', key: 'email' },
  { title: 'ROL DE ACCESO', key: 'roles' },
  { title: 'ESTADO', key: 'estado' },
  { title: 'ACCIONES', key: 'actions', sortable: false, align: 'center' }
]

const roles = ['ADMIN', 'OPERADOR', 'USER']

const tableItems = computed(() =>
  (Array.isArray(usuariosStore.usuarios) ? usuariosStore.usuarios : []).map((u) => ({
    ...u,
    nombre: u.nombre || u.email || '',
    estado: u.enabled ? 'Activo' : 'Inactivo',
    rol: Array.isArray(u.roles) && u.roles.length ? u.roles[0] : 'USER',
  })),
)

const form = ref({
  nombre: '',
  email: '',
  password: '',
  rol: 'USER',
  estado: 'Activo',
})

function initials(nameOrEmail) {
  const text = (nameOrEmail || '').trim()
  if (!text) return '?'
  const parts = text.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return text.slice(0, 2).toUpperCase()
}

function roleColor(rol) {
  if (rol === 'ADMIN') return 'deep-purple'
  if (rol === 'OPERADOR') return 'primary'
  return 'grey'
}

onMounted(() => {
  usuariosStore.fetchUsuarios()
})

const openUserDialog = (item = null) => {
  if (item) {
    selectedUser.value = item
    form.value = {
      nombre: item.nombre || '',
      email: item.email || '',
      password: '',
      rol: item.rol || (item.roles?.[0] ?? 'USER'),
      estado: item.enabled ? 'Activo' : 'Inactivo',
    }
  } else {
    selectedUser.value = null
    form.value = {
      nombre: '',
      email: '',
      password: '',
      rol: 'USER',
      estado: 'Activo',
    }
  }
  dialog.value = true
}

const confirmDelete = (item) => {
  selectedUser.value = item
  deleteDialog.value = true
}

const handleSave = async () => {
  if (!form.value.email?.trim()) {
    showSnackbar('El correo es obligatorio', 'warning')
    return
  }
  if (!selectedUser.value && (!form.value.password || form.value.password.length < 6)) {
    showSnackbar('La contraseña debe tener al menos 6 caracteres', 'warning')
    return
  }
  if (selectedUser.value && form.value.password && form.value.password.length < 6) {
    showSnackbar('La contraseña debe tener al menos 6 caracteres', 'warning')
    return
  }

  saving.value = true
  try {
    const enabled = form.value.estado === 'Activo'
    const rolesPayload = [form.value.rol]

    let ok = false
    if (selectedUser.value) {
      const payload = {
        email: form.value.email.trim(),
        nombre: form.value.nombre?.trim() || undefined,
        roles: rolesPayload,
        enabled,
      }
      if (form.value.password) {
        payload.password = form.value.password
      }
      ok = await usuariosStore.updateUsuario(selectedUser.value.id, payload)
    } else {
      ok = await usuariosStore.createUsuario({
        email: form.value.email.trim(),
        password: form.value.password,
        nombre: form.value.nombre?.trim() || undefined,
        roles: rolesPayload,
        enabled,
      })
    }

    if (ok) {
      dialog.value = false
      showSnackbar(
        selectedUser.value ? 'Usuario actualizado' : 'Usuario creado',
        'success',
      )
    } else if (usuariosStore.error) {
      showSnackbar(usuariosStore.error, 'error')
    }
  } finally {
    saving.value = false
  }
}

const handleDelete = async () => {
  if (!selectedUser.value?.id) return
  saving.value = true
  try {
    const ok = await usuariosStore.setUsuarioEnabled(selectedUser.value.id, false)
    if (ok) {
      deleteDialog.value = false
      showSnackbar('Usuario desactivado', 'success')
    } else if (usuariosStore.error) {
      showSnackbar(usuariosStore.error, 'error')
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-container fluid class="pa-0">
    <div class="mb-6">
      <h1 class="text-h4 font-weight-black mb-1 text-slate-800">Gestión de Usuarios</h1>
      <div class="text-body-2 d-flex align-center text-slate-500">
        <v-icon size="18" class="mr-2">mdi-account-group</v-icon>
        <span>Administración</span>
        <v-icon size="16" class="mx-1">mdi-chevron-right</v-icon>
        <span class="font-weight-bold text-primary">Usuarios</span>
      </div>
    </div>

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
        :items="tableItems"
        :search="search"
        :loading="usuariosStore.loading"
        hover
        density="comfortable"
        class="bg-transparent"
      >
        <template v-slot:item.nombre="{ item }">
          <div class="d-flex align-center py-2">
            <v-avatar color="indigo-lighten-4" size="32" class="mr-3">
              <span class="text-indigo-darken-3 text-caption font-weight-bold">
                {{ initials(item.nombre || item.email) }}
              </span>
            </v-avatar>
            <span class="font-weight-bold text-slate-800">{{ item.nombre || item.email }}</span>
          </div>
        </template>

        <template v-slot:item.roles="{ item }">
          <div class="d-flex flex-wrap gap-1">
            <v-chip
              v-for="rol in (item.roles || [])"
              :key="rol"
              size="x-small"
              label
              variant="tonal"
              :color="roleColor(rol)"
              class="font-weight-black"
            >
              {{ rol }}
            </v-chip>
            <span v-if="!(item.roles && item.roles.length)" class="text-grey">—</span>
          </div>
        </template>

        <template v-slot:item.estado="{ item }">
          <v-chip
            size="x-small"
            :color="item.enabled ? 'success' : 'grey-darken-1'"
            variant="flat"
            class="font-weight-bold"
          >
            {{ item.estado.toUpperCase() }}
          </v-chip>
        </template>

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
              :disabled="!item.enabled"
              @click="confirmDelete(item)"
            >
              <v-icon size="20">mdi-delete</v-icon>
              <v-tooltip activator="parent" location="top">Dar de baja al usuario</v-tooltip>
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

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
                :hint="hints.usuarios.nombre"
                :persistent-hint="false"
                class="mb-2"
              ></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="form.email"
                label="Correo Institucional"
                variant="outlined"
                prepend-inner-icon="mdi-email"
                type="email"
                :hint="hints.usuarios.email"
                :persistent-hint="false"
                class="mb-2"
              ></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="form.password"
                :label="selectedUser ? 'Nueva contraseña (opcional)' : 'Contraseña'"
                variant="outlined"
                prepend-inner-icon="mdi-lock"
                type="password"
                autocomplete="new-password"
                class="mb-2"
                :hint="selectedUser ? hints.usuarios.passwordEdit : hints.usuarios.password"
                :persistent-hint="false"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="form.rol"
                :items="roles"
                label="Rol de Sistema"
                variant="outlined"
                :hint="hints.usuarios.rol"
                :persistent-hint="false"
              ></v-select>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="form.estado"
                :items="['Activo', 'Inactivo']"
                label="Estado Actual"
                variant="outlined"
                :hint="hints.usuarios.estado"
                :persistent-hint="false"
              ></v-select>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" class="font-weight-bold" :disabled="saving" @click="dialog = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            class="rounded-lg px-6"
            :loading="saving"
            @click="handleSave"
          >
            {{ selectedUser ? 'Guardar Cambios' : 'Crear Usuario' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400px">
      <v-card class="rounded-xl text-center pa-4">
        <v-card-text>
          <v-icon color="error" size="64" class="mb-4">mdi-alert-circle-outline</v-icon>
          <div class="text-h6 font-weight-black mb-2">¿Confirmar baja?</div>
          <p class="text-body-2 text-grey-darken-1">
            Estás a punto de desactivar al usuario
            <strong>{{ selectedUser?.nombre || selectedUser?.email }}</strong>.
            Esta acción impedirá su acceso al sistema.
          </p>
        </v-card-text>
        <v-card-actions class="justify-center gap-2">
          <v-btn variant="tonal" class="rounded-lg" :disabled="saving" @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn
            color="error"
            variant="elevated"
            class="rounded-lg px-6"
            :loading="saving"
            @click="handleDelete"
          >
            Desactivar
          </v-btn>
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
