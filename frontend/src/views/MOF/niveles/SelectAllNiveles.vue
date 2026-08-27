<script setup>
import { onMounted, ref, computed } from 'vue';
import { useAllNivelesMofStore } from '../../../stores/niveles_mof';
import { useAllUnidadesMofStore } from '../../../stores/unidades_mof';
import { useSnackbar } from "@/composables/useSnackbar";

const props = defineProps({
  variant: { type: String, default: 'underlined' },
  label: { type: String, default: 'Nivel Jerárquico' },
  hideCrud: { type: Boolean, default: false }
});

const model = defineModel();
const nivelesStore = useAllNivelesMofStore();
const unidadesStore = useAllUnidadesMofStore();
const { mostrar } = useSnackbar();

const dialog = ref(false);
const editingNivel = ref(null);
const nivelName = ref("");
const nivelActivo = ref(true);
const search = ref("");

const visibleItems = computed(() => {
  if (!props.hideCrud) return nivelesStore.niveles;
  return nivelesStore.niveles.filter(n => n.activo);
});

onMounted(async () => {
    if (nivelesStore.niveles.length === 0) {
        await nivelesStore.getFetchNiveles();
    }
});

function openDialog(item = null) {
  if (props.hideCrud) return;
  if (item) {
    editingNivel.value = item;
    nivelName.value = item.descripcion;
    nivelActivo.value = item.activo;
  } else {
    editingNivel.value = null;
    nivelName.value = search.value || "";
    nivelActivo.value = true;
  }
  dialog.value = true;
}

async function saveNivel() {
  if (props.hideCrud || !nivelName.value.trim()) return;

  // VALIDACIÓN PREVENTIVA: No permitir desactivar si está en uso
  if (editingNivel.value && nivelActivo.value === false) {
    const descLower = nivelName.value.trim().toLowerCase();
    const idStr = String(editingNivel.value.id);
    const vinculados = unidadesStore.unidades.filter(u => 
      String(u.nivel).trim().toLowerCase() === descLower || String(u.nivel) === idStr
    );
    
    if (vinculados.length > 0) {
      mostrar(`Error: No se puede desactivar este nivel porque tiene ${vinculados.length} unidades vinculadas.`, 'error');
      return;
    }
  }

  let success = false;
  if (editingNivel.value) {
    success = await nivelesStore.updateNivel(editingNivel.value.id, nivelName.value.trim(), nivelActivo.value);
  } else {
    success = await nivelesStore.createNivel(nivelName.value.trim(), nivelActivo.value);
  }

  if (success) {
    dialog.value = false;
    nivelName.value = "";
    editingNivel.value = null;
  } else {
    mostrar(nivelesStore.error || "Error al guardar", "error");
  }
}

async function deleteNivel(id) {
  if (props.hideCrud) return;
  if (confirm('¿Está seguro de eliminar este nivel?')) {
    const success = await nivelesStore.deleteNivel(id);
    if (success) {
      dialog.value = false;
    } else {
      mostrar(nivelesStore.error || "No se puede eliminar", "error");
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
            :loading="nivelesStore.loading"
            class="flex-grow-1"
        >
            <template v-slot:no-data v-if="!hideCrud">
              <v-list-item @click="openDialog()">
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-plus</v-icon>
                </template>
                <v-list-item-title>
                  Crear nuevo nivel: "<strong>{{ search }}</strong>"
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
                      <v-tooltip activator="parent" location="top">Editar nivel</v-tooltip>
                    </v-btn>
                    <v-btn
                      variant="text"
                      size="small"
                      color="error"
                      @click.stop="deleteNivel(item.raw.id)"
                    >
                      <v-icon size="18">mdi-delete</v-icon>
                      <v-tooltip activator="parent" location="top">Eliminar nivel</v-tooltip>
                    </v-btn>
                  </div>
                </template>
              </v-list-item>
            </template>

            <template v-slot:append-item v-if="!hideCrud">
                <v-divider />
                <v-list-item @click="openDialog()" color="primary" prepend-icon="mdi-plus-circle">
                    <v-list-item-title class="text-primary font-weight-bold">
                        AÑADIR NUEVO NIVEL AL CATÁLOGO
                    </v-list-item-title>
                </v-list-item>
            </template>
        </v-autocomplete>

        <v-dialog v-model="dialog" max-width="500" persistent v-if="!hideCrud">
            <v-card>
                <v-card-title class="text-h6 font-weight-bold pa-4">
                    {{ editingNivel ? 'Editar' : 'Nuevo' }} Nivel Jerárquico
                </v-card-title>
                <v-divider />
                <v-card-text class="pa-4 pt-6">
                    <v-text-field
                        v-model="nivelName"
                        label="Descripción del Nivel"
                        variant="outlined"
                        autofocus
                        hide-details
                        class="mb-6"
                        @keyup.enter="saveNivel"
                    ></v-text-field>
                    
                    <div class="d-flex align-center justify-space-between pa-3 rounded border">
                        <span class="text-body-2">Estado: <strong>{{ nivelActivo ? 'ACTIVO' : 'INACTIVO' }}</strong></span>
                        <v-switch v-model="nivelActivo" color="success" hide-details inset density="compact" />
                    </div>
                </v-card-text>
                <v-card-actions class="pa-4">
                    <v-spacer></v-spacer>
                    <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
                    <v-btn color="primary" variant="elevated" @click="saveNivel" :loading="nivelesStore.loading" :disabled="!nivelName.trim()">
                        Guardar
                    </v-btn>
                    <v-btn v-if="editingNivel" color="error" variant="tonal" @click="deleteNivel(editingNivel.id)" :loading="nivelesStore.loading">
                        Eliminar
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>
