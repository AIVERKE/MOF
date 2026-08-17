<script setup>
import { onMounted, ref, computed } from 'vue';
import { useAllClasesMofStore } from '../../../stores/clases_mof';
import { useAllUnidadesMofStore } from '../../../stores/unidades_mof';
import { swatches, getUsedColors } from "@/utils/mofHelpers";

const props = defineProps({
  variant: { type: String, default: 'underlined' },
  label: { type: String, default: 'Clase' },
  hideCrud: { type: Boolean, default: false }
});

const model = defineModel();
const clasesStore = useAllClasesMofStore();
const unidadesStore = useAllUnidadesMofStore();

const dialog = ref(false);
const editingClase = ref(null);
const claseName = ref("");
const claseColor = ref("#1976D2");
const claseActivo = ref(true);
const claseOficial = ref(true);
const search = ref("");
const colorMenu = ref(false);

const snackbar = ref(false);
const snackbarText = ref("");

// Colores usados en el sistema
const usedColors = computed(() => getUsedColors(unidadesStore.unidades, clasesStore.clases));

// --- LÓGICA DE FILTRADO DE ESTADOS ---
const visibleItems = computed(() => {
  // Si estamos en modo CRUD (dentro del formulario), mostramos todos
  if (!props.hideCrud) return clasesStore.clases;
  // En filtros generales, solo activos
  return clasesStore.clases.filter(c => c.activo);
});

onMounted(async () => {
    if (clasesStore.clases.length === 0) {
        await clasesStore.getFetchClases();
    }
});

function openDialog(item = null) {
  if (props.hideCrud) return;
  if (item) {
    editingClase.value = item;
    claseName.value = item.descripcion;
    claseColor.value = item.color || "#1976D2";
    claseActivo.value = item.activo === true || item.activo === 1;
    claseOficial.value = item.oficial === true || item.oficial === 1;
  } else {
    editingClase.value = null;
    claseName.value = search.value || "";
    claseColor.value = "#1976D2";
    claseActivo.value = true;
    claseOficial.value = true;
  }
  colorMenu.value = false;
  dialog.value = true;
}

async function saveClase() {
  if (props.hideCrud || !claseName.value.trim()) return;

  // VALIDACIÓN PREVENTIVA: No permitir desactivar si está en uso
  if (editingClase.value && claseActivo.value === false) {
    const vinculados = unidadesStore.unidades.filter(u => {
      const uClase = u.clase && typeof u.clase === 'object' ? u.clase.id : u.clase;
      return String(uClase) === String(editingClase.value.id) || 
             String(u.clase).trim().toUpperCase() === String(editingClase.value.descripcion).trim().toUpperCase();
    });
    
    if (vinculados.length > 0) {
      snackbarText.value = `Error de Usabilidad: No se puede desactivar esta clase porque tiene ${vinculados.length} unidades vinculadas. Reasigne las unidades antes de desactivar.`;
      snackbar.value = true;
      return;
    }
  }

  let success = false;
  if (editingClase.value) {
    success = await clasesStore.updateClase(editingClase.value.id, claseName.value.trim(), claseColor.value, claseActivo.value, claseOficial.value);
  } else {
    success = await clasesStore.createClase(claseName.value.trim(), claseColor.value, claseActivo.value, claseOficial.value);
  }

  if (success) {
    dialog.value = false;
    claseName.value = "";
    editingClase.value = null;
  } else {
    snackbarText.value = clasesStore.error || "Error al guardar";
    snackbar.value = true;
  }
}

async function deleteClase(id) {
  if (props.hideCrud) return;
  if (confirm('¿Está seguro de que desea eliminar esta clase?')) {
    const success = await clasesStore.deleteClase(id);
    if (success) {
      dialog.value = false;
    } else {
      snackbarText.value = clasesStore.error || "No se puede eliminar";
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
            :loading="clasesStore.loading"
            class="flex-grow-1"
        >
            <template v-slot:no-data v-if="!hideCrud">
              <v-list-item @click="openDialog()">
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-plus</v-icon>
                </template>
                <v-list-item-title>
                  Crear nueva clase: "<strong>{{ search }}</strong>"
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
                <template v-slot:prepend>
                  <div 
                    class="me-2" 
                    style="width: 12px; height: 12px; border-radius: 2px; background-color: var(--color)"
                    :style="{ '--color': item.raw.color }"
                  ></div>
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
                      <v-tooltip activator="parent" location="top">Editar clase</v-tooltip>
                    </v-btn>
                    <v-btn
                      variant="text"
                      size="small"
                      color="error"
                      @click.stop="deleteClase(item.raw.id)"
                    >
                      <v-icon size="18">mdi-delete</v-icon>
                      <v-tooltip activator="parent" location="top">Eliminar clase</v-tooltip>
                    </v-btn>
                  </div>
                </template>
              </v-list-item>
            </template>

            <template v-slot:append-item v-if="!hideCrud">
                <v-divider />
                <v-list-item @click="openDialog()" color="primary" prepend-icon="mdi-plus-circle">
                    <v-list-item-title class="text-primary font-weight-bold">
                        AÑADIR NUEVA CLASE AL CATÁLOGO
                    </v-list-item-title>
                </v-list-item>
            </template>
        </v-autocomplete>

        <!-- Dialog para crear/editar (Solo visible si no es hideCrud) -->
        <v-dialog v-model="dialog" max-width="500" persistent v-if="!hideCrud">
            <v-card>
                <v-card-title class="text-h6 font-weight-bold pa-4">
                    {{ editingClase ? 'Editar' : 'Nueva' }} Instancia
                </v-card-title>
                <v-divider />
                <v-card-text class="pa-4 pt-6">
                    <v-text-field
                        v-model="claseName"
                        label="Nombre de la Clase (Ej: Facultad)"
                        variant="outlined"
                        autofocus
                        hide-details
                        class="mb-6"
                        @keyup.enter="saveClase"
                    ></v-text-field>
                    
                    <div class="d-flex align-center justify-space-between pa-3 rounded border mb-4">
                        <span class="text-body-2">Estado: <strong>{{ claseActivo ? 'ACTIVO' : 'INACTIVO' }}</strong></span>
                        <v-switch v-model="claseActivo" color="success" hide-details inset density="compact" />
                    </div>

                    <div class="d-flex align-center justify-space-between pa-3 rounded border mb-4">
                        <div class="d-flex align-center">
                            <span class="text-body-2 mr-2">Relevancia: <strong>{{ claseOficial ? 'OFICIAL' : 'NO OFICIAL' }}</strong></span>
                            <v-icon v-if="claseOficial" size="16" color="success">mdi-check-decagram</v-icon>
                        </div>
                        <v-switch v-model="claseOficial" color="primary" hide-details inset density="compact" />
                    </div>
                    
                    <v-divider class="my-4"></v-divider>
                    <div class="d-flex align-center">
                        <v-menu v-model="colorMenu" :close-on-content-click="false">
                            <template v-slot:activator="{ props }">
                                <div v-bind="props" class="d-flex align-center pa-2 rounded border w-100" style="cursor: pointer">
                                    <v-avatar :color="claseColor" size="24" class="mr-3 border" />
                                    <span class="text-caption font-weight-bold">COLOR INSTITUCIONAL</span>
                                    <v-spacer />
                                    <v-icon>mdi-palette</v-icon>
                                </div>
                            </template>
                            <v-card min-width="300" class="pa-3">
                                <div v-if="usedColors.length > 0" class="mb-4">
                                    <div class="text-caption font-weight-bold mb-2 text-uppercase grey--text">Colores en uso</div>
                                    <div class="d-flex flex-wrap gap-2">
                                        <v-avatar 
                                            v-for="c in usedColors" 
                                            :key="c" 
                                            :color="c" 
                                            size="24" 
                                            class="cursor-pointer border-sm shadow-sm"
                                            @click="claseColor = c"
                                        >
                                            <v-icon v-if="claseColor?.toUpperCase() === c.toUpperCase()" size="14" color="white">mdi-check</v-icon>
                                        </v-avatar>
                                    </div>
                                </div>
                                <v-divider v-if="usedColors.length > 0" class="mb-3"></v-divider>
                                <div class="text-caption font-weight-bold mb-2 text-uppercase grey--text">Paleta Predefinida</div>
                                <v-color-picker v-model="claseColor" mode="hex" :swatches="swatches" show-swatches hide-inputs flat />
                            </v-card>
                        </v-menu>
                    </div>
                </v-card-text>
                <v-card-actions class="pa-4">
                    <v-spacer></v-spacer>
                    <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
                    <v-btn color="primary" variant="elevated" @click="saveClase" :loading="clasesStore.loading" :disabled="!claseName.trim()">
                        Guardar
                    </v-btn>
                    <v-btn v-if="editingClase" color="error" variant="tonal" @click="deleteClase(editingClase.id)" :loading="clasesStore.loading">
                        Eliminar
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-snackbar v-model="snackbar" color="error" timeout="4000">{{ snackbarText }}</v-snackbar>
    </div>
</template>
