<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUsuariosStore } from '@/stores/usuarios'
import { useConfigMofStore } from '@/stores/config_mof'
import { useSnackbar } from '@/composables/useSnackbar'
import { hints } from '@/config/hints'
import { rules } from '@/utils/rules'

const usuariosStore = useUsuariosStore()
const configStore = useConfigMofStore()
const { mostrar: showSnackbar } = useSnackbar()

const formRef = ref(null)
const search = ref('')
const dialog = ref(false)
const deleteDialog = ref(false)
const selectedUser = ref(null)
const saving = ref(false)

function filtrarCaracteresCi(event) {
  // Permite dígitos 0-9, letras (para complemento) y guión '-'
  if (!/[0-9a-zA-Z-]/.test(event.key)) {
    event.preventDefault()
  }
}


const headers = [
  { title: 'USUARIO', key: 'nombre', align: 'start' },
  { title: 'C.I.', key: 'ci' },
  { title: 'CORREO ELECTRÓNICO', key: 'email' },
  { title: 'ROL DE ACCESO', key: 'roles' },
  { title: 'ESTADO', key: 'estado' },
  { title: 'ACCIONES', key: 'actions', sortable: false, align: 'center' }
]

const roles = ['ADMIN', 'OPERADOR', 'USER']

const filtroEstado = ref('activos')

const countActivos = computed(() =>
  (Array.isArray(usuariosStore.usuarios) ? usuariosStore.usuarios : []).filter(
    (u) => u.enabled,
  ).length,
)

const countInactivos = computed(() =>
  (Array.isArray(usuariosStore.usuarios) ? usuariosStore.usuarios : []).filter(
    (u) => !u.enabled,
  ).length,
)

const countTotal = computed(() =>
  (Array.isArray(usuariosStore.usuarios) ? usuariosStore.usuarios : []).length,
)

const tableItems = computed(() => {
  const lista = Array.isArray(usuariosStore.usuarios)
    ? usuariosStore.usuarios
    : []
  return lista
    .filter((u) => {
      if (filtroEstado.value === 'activos') return Boolean(u.enabled)
      if (filtroEstado.value === 'inactivos') return !u.enabled
      return true
    })
    .map((u) => ({
      ...u,
      nombre: u.nombre || u.email || '',
      apellidos: [u.apellidoPaterno, u.apellidoMaterno].filter(Boolean).join(' '),
      estado: u.enabled ? 'Activo' : 'Inactivo',
      rol: Array.isArray(u.roles) && u.roles.length ? u.roles[0] : 'USER',
    }))
})

const emptyForm = () => ({
  ci: '',
  nombres: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  email: '',
  password: '',
  rol: 'USER',
  estado: 'Activo',
})

const form = ref(emptyForm())

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
  configStore.fetchConfig()
})

const openUserDialog = (item = null) => {
  if (item) {
    selectedUser.value = item
    form.value = {
      ci: item.ci || '',
      nombres: item.nombres || '',
      apellidoPaterno: item.apellidoPaterno || '',
      apellidoMaterno: item.apellidoMaterno || '',
      email: item.email || '',
      password: '',
      rol: item.rol || (item.roles?.[0] ?? 'USER'),
      estado: item.enabled ? 'Activo' : 'Inactivo',
    }
  } else {
    selectedUser.value = null
    form.value = emptyForm()
  }
  if (formRef.value) {
    formRef.value.resetValidation()
  }
  dialog.value = true
}

const confirmDelete = (item) => {
  selectedUser.value = item
  deleteDialog.value = true
}

const handleSave = async () => {
  if (formRef.value) {
    const { valid } = await formRef.value.validate()
    if (!valid) return
  }

  if (!form.value.email?.trim()) {
    showSnackbar('El correo es obligatorio', 'warning')
    return
  }
  if (!form.value.ci?.trim()) {
    showSnackbar('El C.I. es obligatorio', 'warning')
    return
  }
  const ciCheck = rules.ci(form.value.ci.trim())
  if (ciCheck !== true) {
    showSnackbar(ciCheck, 'warning')
    return
  }
  if (!form.value.nombres?.trim()) {
    showSnackbar('Los nombres son obligatorios', 'warning')
    return
  }
  const nombresCheck = rules.soloNombre(form.value.nombres.trim())
  if (nombresCheck !== true) {
    showSnackbar(nombresCheck, 'warning')
    return
  }
  if (form.value.apellidoPaterno?.trim()) {
    const patCheck = rules.soloNombre(form.value.apellidoPaterno.trim())
    if (patCheck !== true) {
      showSnackbar(patCheck, 'warning')
      return
    }
  }
  if (form.value.apellidoMaterno?.trim()) {
    const matCheck = rules.soloNombre(form.value.apellidoMaterno.trim())
    if (matCheck !== true) {
      showSnackbar(matCheck, 'warning')
      return
    }
  }
  if (
    selectedUser.value &&
    form.value.password &&
    form.value.password.length < configStore.passwordMinLength
  ) {
    showSnackbar(
      `La contraseña debe tener al menos ${configStore.passwordMinLength} caracteres`,
      'warning',
    )
    return
  }


  saving.value = true
  try {
    const enabled = form.value.estado === 'Activo'
    const rolesPayload = [form.value.rol]
    const datosPersona = {
      ci: form.value.ci.trim(),
      nombres: form.value.nombres.trim(),
      apellidoPaterno: form.value.apellidoPaterno?.trim() || undefined,
      apellidoMaterno: form.value.apellidoMaterno?.trim() || undefined,
    }

    let ok = false
    if (selectedUser.value) {
      const payload = {
        email: form.value.email.trim(),
        ...datosPersona,
        roles: rolesPayload,
        enabled,
      }
      if (form.value.password) {
        payload.password = form.value.password
      }
      ok = await usuariosStore.updateUsuario(selectedUser.value.id, payload)
    } else {
      // Sin contraseña: el usuario la define en su primer acceso con el C.I.
      ok = await usuariosStore.createUsuario({
        email: form.value.email.trim(),
        ...datosPersona,
        roles: rolesPayload,
        enabled,
      })
    }

    if (ok) {
      dialog.value = false
      showSnackbar(
        selectedUser.value
          ? 'Usuario actualizado'
          : 'Usuario creado. Debe ingresar por primer acceso con su correo y C.I. para definir su contraseña.',
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
      showSnackbar('Usuario inhabilitado correctamente', 'success')
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

        <v-btn-toggle
          v-model="filtroEstado"
          mandatory
          density="compact"
          color="primary"
          variant="outlined"
          divided
          class="rounded-lg ml-md-2"
        >
          <v-btn value="activos" size="small">
            <v-icon start size="16" color="success">mdi-check-circle</v-icon>
            Activos
            <v-chip size="x-small" class="ml-1 font-weight-bold" color="success" variant="flat">
              {{ countActivos }}
            </v-chip>
          </v-btn>
          <v-btn value="inactivos" size="small">
            <v-icon start size="16" color="grey-darken-1">mdi-close-circle</v-icon>
            Inactivos
            <v-chip size="x-small" class="ml-1 font-weight-bold" color="grey" variant="flat">
              {{ countInactivos }}
            </v-chip>
          </v-btn>
          <v-btn value="todos" size="small">
            <v-icon start size="16">mdi-account-multiple</v-icon>
            Todos
            <v-chip size="x-small" class="ml-1 font-weight-bold" variant="tonal">
              {{ countTotal }}
            </v-chip>
          </v-btn>
        </v-btn-toggle>

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
            <div class="d-flex flex-column">
              <span class="font-weight-bold text-slate-800">
                {{ item.nombres || item.nombre || item.email }}
              </span>
              <span v-if="item.apellidos" class="text-caption text-slate-500">
                {{ item.apellidos }}
              </span>
            </div>
          </div>
        </template>

        <template v-slot:item.ci="{ item }">
          <span v-if="item.ci" class="text-body-2">{{ item.ci }}</span>
          <span v-else class="text-grey">—</span>
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
              icon="mdi-account-off"
              variant="text"
              size="small"
              color="error"
              :disabled="!item.enabled"
              @click="confirmDelete(item)"
            >
              <v-icon size="20">mdi-account-off</v-icon>
              <v-tooltip activator="parent" location="top">
                {{ item.enabled ? 'Inhabilitar usuario' : 'Usuario ya inhabilitado' }}
              </v-tooltip>
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
        <v-form ref="formRef" @submit.prevent="handleSave">
          <v-card-text class="pa-4 pt-6">
            <v-row dense>
              <v-col cols="12">
                <v-text-field
                  v-model="form.ci"
                  label="C.I."
                  variant="outlined"
                  prepend-inner-icon="mdi-card-account-details"
                  :hint="hints.usuarios.ci"
                  :persistent-hint="false"
                  :rules="[rules.required, rules.ci]"
                  class="mb-2"
                  @keypress="filtrarCaracteresCi"
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="form.nombres"
                  label="Nombres"
                  variant="outlined"
                  prepend-inner-icon="mdi-account"
                  :hint="hints.usuarios.nombres"
                  :persistent-hint="false"
                  :rules="[rules.required, rules.soloNombre]"
                  class="mb-2"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.apellidoPaterno"
                  label="Apellido Paterno"
                  variant="outlined"
                  :hint="hints.usuarios.apellidoPaterno"
                  :persistent-hint="false"
                  :rules="[rules.soloNombre]"
                  class="mb-2"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.apellidoMaterno"
                  label="Apellido Materno"
                  variant="outlined"
                  :hint="hints.usuarios.apellidoMaterno"
                  :persistent-hint="false"
                  :rules="[rules.soloNombre]"
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
                  :rules="[rules.required, rules.email]"
                  class="mb-2"
                ></v-text-field>
              </v-col>
              <v-col v-if="selectedUser" cols="12">
                <v-text-field
                  v-model="form.password"
                  label="Nueva contraseña (opcional)"
                  variant="outlined"
                  prepend-inner-icon="mdi-lock"
                  type="password"
                  autocomplete="new-password"
                  class="mb-2"
                  :hint="`Opcional. Mínimo ${configStore.passwordMinLength} caracteres.`"
                  :persistent-hint="false"
                ></v-text-field>
              </v-col>
              <v-col v-else cols="12">
                <v-alert
                  type="info"
                  variant="tonal"
                  density="comfortable"
                  class="mb-2 rounded-lg text-body-2"
                  prepend-icon="mdi-information-outline"
                >
                  No se define contraseña aquí: el usuario ingresará por
                  <strong>primer acceso</strong> con su correo y C.I. para crearla.
                </v-alert>
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
              type="submit"
            >
              {{ selectedUser ? 'Guardar Cambios' : 'Crear Usuario' }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="440px">
      <v-card class="rounded-xl text-center pa-4">
        <v-card-text>
          <v-icon color="warning" size="64" class="mb-4">mdi-account-off-outline</v-icon>
          <div class="text-h6 font-weight-black mb-2">¿Inhabilitar usuario?</div>
          <p class="text-body-2 text-grey-darken-1">
            Estás a punto de inhabilitar la cuenta de
            <strong>{{ selectedUser?.nombre || selectedUser?.email }}</strong>.
            Esta acción impedirá su acceso al sistema, pero se mantendrá en la base de datos y podrás reactivarla desde el filtro de Inactivos editando su perfil.
          </p>
        </v-card-text>
        <v-card-actions class="justify-center gap-2">
          <v-btn variant="tonal" class="rounded-lg" :disabled="saving" @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn
            color="warning-darken-1"
            variant="elevated"
            class="rounded-lg px-6 font-weight-bold"
            :loading="saving"
            @click="handleDelete"
          >
            Inhabilitar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

