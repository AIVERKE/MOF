<script setup>
import { onMounted, ref, computed } from 'vue';
import { useAllRelacionesMofStore } from '../../../stores/relaciones_mof';
import { useAllUnidadesMofStore } from '../../../stores/unidades_mof';
import { useSnackbar } from "@/composables/useSnackbar";

const props = defineProps({
  variant: { type: String, default: 'underlined' },
  label: { type: String, default: 'Relación' },
  hideCrud: { type: Boolean, default: false }
});

const model = defineModel();
const relacionesStore = useAllRelacionesMofStore();
const unidadesStore = useAllUnidadesMofStore();
const { mostrar } = useSnackbar();

const dialog = ref(false);
const editingRelacion = ref(null);
const relacionName = ref("");
const relacionActivo = ref(true);
const search = ref("");

const visibleItems = computed(() => {
  if (!props.hideCrud) return relacionesStore.relaciones;
  return relacionesStore.relaciones.filter(r => r.activo);
});

onMounted(async () => {
    if (relacionesStore.relaciones.length === 0) {
        await relacionesStore.getFetchRelaciones();
    }
});

function openDialog(item = null) {
  if (props.hideCrud) return;
  if (item) {
    editingRelacion.value = item;
    relacionName.value = item.descripcion;
    relacionActivo.value = item.activo;
  } else {
    editingRelacion.value = null;
    relacionName.value = search.value || "";
    relacionActivo.value = true;
  }
  dialog.value = true;
}

async function saveRelacion() {
  if (props.hideCrud || !relacionName.value.trim()) return;

  // VALIDACIÓN PREVENTIVA: No permitir desactivar si está en uso
  if (editingRelacion.value && relacionActivo.value === false) {
    const idStr = String(editingRelacion.value.id);
    const vinculados = unidadesStore.unidades.filter(u => String(u.relacion) === idStr);
    
    if (vinculados.length > 0) {
      mostrar(`Error: No se puede desactivar esta relación porque tiene ${vinculados.length} unidades vinculadas.`, 'error');
      return;
    }
  }

  let success = false;
  if (editingRelacion.value) {
    success = await relacionesStore.updateRelacion(editingRelacion.value.id, relacionName.value.trim(), relacionActivo.value);
  } else {
    success = await relacionesStore.createRelacion(relacionName.value.trim(), relacionActivo.value);
  }

  if (success) {
    dialog.value = false;
    relacionName.value = "";
    editingRelacion.value = null;
  } else {
    mostrar(relacionesStore.error || "Error al guardar", "error");
  }
}

async function deleteRelacion(id) {
  if (props.hideCrud) return;
  if (confirm('¿Está seguro de eliminar esta relación?')) {
    const success = await relacionesStore.deleteRelacion(id);
    if (success) {
      dialog.value = false;
    } else {
      mostrar(relacionesStore.error || "No se puede eliminar", "error");
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
            :loading="relacionesStore.loading"
            class="flex-grow-1"
        >
            <template v-slot:no-data v-if="!hideCrud">
              <v-list-item @click="openDialog()">
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-plus</v-icon>
                </template>
                <v-list-item-title>
                  Crear nueva relación: "<strong>{{ search }}</strong>"
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
                      <v-tooltip activator="parent" location="top">Editar relación</v-tooltip>
                    </v-btn>
                    <v-btn
                      variant="text"
                      size="small"
                      color="error"
                      @click.stop="deleteRelacion(item.raw.id)"
                    >
                      <v-icon size="18">mdi-delete</v-icon>
                      <v-tooltip activator="parent" location="top">Eliminar relación</v-tooltip>
                    </v-btn>
                  </div>
                </template>
              </v-list-item>
            </template>

            <template v-slot:append-item v-if="!hideCrud">
                <v-divider />
                <v-list-item @click="openDialog()" color="primary" prepend-icon="mdi-plus-circle">
                    <v-list-item-title class="text-primary font-weight-bold">
                        AÑADIR NUEVA RELACIÓN AL CATÁLOGO
                    </v-list-item-title>
                </v-list-item>
            </template>
        </v-autocomplete>

        <v-dialog v-model="dialog" max-width="500" persistent v-if="!hideCrud">
            <v-card>
                <v-card-title class="text-h6 font-weight-bold pa-4">
                    {{ editingRelacion ? 'Editar' : 'Nueva' }} Relación
                </v-card-title>
                <v-divider />
                <v-card-text class="pa-4 pt-6">
                    <v-text-field
                        v-model="relacionName"
                        label="Descripción de la Relación"
                        variant="outlined"
                        autofocus
                        hide-details
                        class="mb-6"
                        @keyup.enter="saveRelacion"
                    ></v-text-field>
                    
                    <div class="d-flex align-center justify-space-between pa-3 rounded border">
                        <span class="text-body-2">Estado: <strong>{{ relacionActivo ? 'ACTIVO' : 'INACTIVO' }}</strong></span>
                        <v-switch v-model="relacionActivo" color="success" hide-details inset density="compact" />
                    </div>
                </v-card-text>
                <v-card-actions class="pa-4">
                    <v-spacer></v-spacer>
                    <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
                    <v-btn color="primary" variant="elevated" @click="saveRelacion" :loading="relacionesStore.loading" :disabled="!relacionName.trim()">
                        Guardar
                    </v-btn>
                    <v-btn v-if="editingRelacion" color="error" variant="tonal" @click="deleteRelacion(editingRelacion.id)" :loading="relacionesStore.loading">
                        Eliminar
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>