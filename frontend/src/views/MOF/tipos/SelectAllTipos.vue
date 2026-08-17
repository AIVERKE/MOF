<script setup>
import { onMounted, ref, computed } from 'vue';
import { useAllTiposMofStore } from '../../../stores/tipos_mof';

const props = defineProps({
  variant: { type: String, default: 'underlined' },
  label: { type: String, default: 'Tipo de Unidad' },
  hideCrud: { type: Boolean, default: false }
});

const model = defineModel();
const tiposStore = useAllTiposMofStore();

const dialog = ref(false);
const editingTipo = ref(null);
const tipoName = ref("");
const tipoActivo = ref(true);
const search = ref("");

const snackbar = ref(false);
const snackbarText = ref("");

const visibleItems = computed(() => {
  if (!props.hideCrud) return tiposStore.tipos;
  return tiposStore.tipos.filter(t => t.activo);
});

onMounted(async () => {
    if (tiposStore.tipos.length === 0) {
        await tiposStore.getFetchTipos();
    }
});

function openDialog(item = null) {
  if (props.hideCrud) return;
  if (item) {
    editingTipo.value = item;
    tipoName.value = item.descripcion;
    tipoActivo.value = item.activo;
  } else {
    editingTipo.value = null;
    tipoName.value = search.value || "";
    tipoActivo.value = true;
  }
  dialog.value = true;
}

async function saveTipo() {
  if (props.hideCrud || !tipoName.value.trim()) return;

  // VALIDACIÓN PREVENTIVA: No permitir desactivar si está en uso
  if (editingTipo.value && tipoActivo.value === false) {
    const descLower = tipoName.value.trim().toLowerCase();
    const idStr = String(editingTipo.value.id);
    const vinculados = unidadesStore.unidades.filter(u => 
      String(u.tipo).trim().toLowerCase() === descLower || String(u.tipo) === idStr
    );
    
    if (vinculados.length > 0) {
      snackbarText.value = `Error: No se puede desactivar este tipo porque tiene ${vinculados.length} unidades vinculadas.`;
      snackbar.value = true;
      return;
    }
  }

  let success = false;
  if (editingTipo.value) {
    success = await tiposStore.updateTipo(editingTipo.value.id, tipoName.value.trim(), tipoActivo.value);
  } else {
    success = await tiposStore.createTipo(tipoName.value.trim(), tipoActivo.value);
  }

  if (success) {
    dialog.value = false;
    tipoName.value = "";
    editingTipo.value = null;
  } else {
    snackbarText.value = tiposStore.error || "Error al guardar";
    snackbar.value = true;
  }
}

async function deleteTipo(id) {
  if (props.hideCrud) return;
  if (confirm('¿Está seguro de eliminar este tipo?')) {
    const success = await tiposStore.deleteTipo(id);
    if (success) {
      dialog.value = false;
    } else {
      snackbarText.value = tiposStore.error || "No se puede eliminar";
      snackbar.value = true;
    }
  }
}
</script>

<template>
    <div class="d-flex align-center w-100">
        <v-autocomplete 
            v-bind="$attrs"
            v-model="model"
            v-model:search="search"
            :label="label"
            :items="visibleItems" 
            item-title="descripcion" 
            item-value="id" 
            :variant="variant"
            clearable
            :loading="tiposStore.loading"
            class="flex-grow-1"
        >
            <template v-slot:no-data v-if="!hideCrud">
              <v-list-item @click="openDialog()">
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-plus</v-icon>
                </template>
                <v-list-item-title>
                  Crear nuevo tipo: "<strong>{{ search }}</strong>"
                </v-list-item-title>
              </v-list-item>
            </template>

            <template v-slot:item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps" :class="{ 'opacity-50 text-grey-darken-1': !item.raw.activo }">
                <template v-slot:title>
                  {{ item.title }}
                  <span v-if="item.raw.oficial" class="text-success font-weight-black ml-1" style="font-size: 8px;">OFICIAL</span>
                  <span v-if="!item.raw.activo" class="text-caption font-italic ml-1">(Inactivo)</span>
                </template>
                <template v-slot:append v-if="!hideCrud">
                  <div class="d-flex align-center">
                    <v-btn
                      variant="text"
                      size="small"
                      color="warning"
                      class="mr-1"
                      @click.stop="openDialog(item.raw)"
                    >
                      <v-icon size="18">mdi-pencil</v-icon>
                      <v-tooltip activator="parent" location="top">Editar tipo</v-tooltip>
                    </v-btn>
                    <v-btn
                      variant="text"
                      size="small"
                      color="error"
                      @click.stop="deleteTipo(item.raw.id)"
                    >
                      <v-icon size="18">mdi-delete</v-icon>
                      <v-tooltip activator="parent" location="top">Eliminar tipo</v-tooltip>
                    </v-btn>
                  </div>
                </template>
              </v-list-item>
            </template>

            <template v-slot:append-item v-if="!hideCrud">
                <v-divider />
                <v-list-item @click="openDialog()" color="primary" prepend-icon="mdi-plus-circle">
                    <v-list-item-title class="text-primary font-weight-bold">
                        AÑADIR NUEVO TIPO AL CATÁLOGO
                    </v-list-item-title>
                </v-list-item>
            </template>
        </v-autocomplete>

        <v-dialog v-model="dialog" max-width="500" persistent v-if="!hideCrud">
            <v-card>
                <v-card-title class="text-h6 font-weight-bold pa-4">
                    {{ editingTipo ? 'Editar' : 'Nuevo' }} Tipo de Unidad
                </v-card-title>
                <v-divider />
                <v-card-text class="pa-4 pt-6">
                    <v-text-field
                        v-model="tipoName"
                        label="Descripción del Tipo"
                        variant="outlined"
                        autofocus
                        hide-details
                        class="mb-6"
                        @keyup.enter="saveTipo"
                    ></v-text-field>
                    
                    <div class="d-flex align-center justify-space-between pa-3 rounded border">
                        <span class="text-body-2">Estado: <strong>{{ tipoActivo ? 'ACTIVO' : 'INACTIVO' }}</strong></span>
                        <v-switch v-model="tipoActivo" color="success" hide-details inset density="compact" />
                    </div>
                </v-card-text>
                <v-card-actions class="pa-4">
                    <v-spacer></v-spacer>
                    <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
                    <v-btn color="primary" variant="elevated" @click="saveTipo" :loading="tiposStore.loading" :disabled="!tipoName.trim()">
                        Guardar
                    </v-btn>
                    <v-btn v-if="editingTipo" color="error" variant="tonal" @click="deleteTipo(editingTipo.id)" :loading="tiposStore.loading">
                        Eliminar
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-snackbar v-model="snackbar" color="error" timeout="4000">{{ snackbarText }}</v-snackbar>
    </div>
</template>
