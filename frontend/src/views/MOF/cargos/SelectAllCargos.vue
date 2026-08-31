<script setup>
import { onMounted, computed, ref } from 'vue';
import { useAllCargosMofStore } from '../../../stores/cargos_mof';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  }
});
const emit = defineEmits(['update:modelValue']);

const cargosStore = useAllCargosMofStore();

// Estados para gestión de catálogo
const dialog = ref(false);
const editingCargo = ref(null);
const cargoName = ref("");
const cargoDescripcion = ref("");
const cargoActivo = ref(true);
const search = ref("");

/**
 * Normaliza la lista de cargos garantizando que no haya duplicados visuales
 * y que todos los IDs sean Strings para un emparejamiento estricto con v-model.
 */
const uniqueCargos = computed(() => {
  const seen = new Set();
  return cargosStore.cargos
    .filter(c => {
      const isDup = seen.has(c.id);
      seen.add(c.id);
      return !isDup;
    })
    .map(c => ({
      ...c,
      id: String(c.id) 
    }));
});

/**
 * Propiedad computada bidireccional para el v-model.
 */
const value = computed({
  get() {
    const val = Array.isArray(props.modelValue) ? props.modelValue : [];
    return val.map(id => String(id));
  },
  set(val) {
    emit('update:modelValue', val);
  }
});

// Funciones de gestión
function openDialog(item = null) {
  if (item) {
    editingCargo.value = item;
    cargoName.value = item.nombre || item.descripcion || "";
    cargoDescripcion.value = item.descripcion || "";
    cargoActivo.value = item.activo ?? true;
  } else {
    editingCargo.value = null;
    cargoName.value = search.value; // Pre-cargar lo que el usuario escribió en la búsqueda
    cargoDescripcion.value = "";
    cargoActivo.value = true;
  }
  dialog.value = true;
}

async function saveCargo() {
  if (!cargoName.value.trim()) return;

  const nombre = cargoName.value.trim().slice(0, 255);
  const descripcion = cargoDescripcion.value.trim().slice(0, 512) || null;

  let success = false;
  if (editingCargo.value) {
    success = await cargosStore.updateCargo(editingCargo.value.id, nombre, descripcion, cargoActivo.value);
  } else {
    success = await cargosStore.createCargo(nombre, descripcion, cargoActivo.value);
  }

  if (success) {
    dialog.value = false;
    cargoName.value = "";
    cargoDescripcion.value = "";
    cargoActivo.value = true;
    editingCargo.value = null;
  }
}

onMounted(async () => {
    if (cargosStore.cargos.length === 0) {
        await cargosStore.getFetchCargos();
    }
});
</script>

<template>
    <div class="d-flex align-center">
        <v-autocomplete 
            v-model="value"
            v-model:search="search"
            label="Cargos del Personal" 
            :items="uniqueCargos" 
            item-title="nombre" 
            item-value="id" 
            variant="underlined"
            multiple
            chips
            closable-chips
            clearable
            :loading="cargosStore.loading"
            class="flex-grow-1"
        >
            <template v-slot:no-data>
              <v-list-item @click="openDialog()">
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-plus</v-icon>
                </template>
                <v-list-item-title>
                  Crear nuevo cargo: "<strong>{{ search }}</strong>"
                </v-list-item-title>
              </v-list-item>
            </template>

            <!-- Slot para cada item en la lista -->
            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props" :title="item.title" :class="{ 'opacity-50 text-grey-darken-1': !item.raw.activo }">
                <template v-slot:prepend>
                  <v-checkbox-btn :model-value="value.includes(String(item.value))"></v-checkbox-btn>
                </template>
                <template v-slot:append>
                  <div class="d-flex align-center">
                    <v-btn
                      variant="text"
                      size="small"
                      color="warning"
                      class="mr-1"
                      @click.stop="openDialog(item.raw)"
                    >
                      <v-icon size="18">mdi-pencil</v-icon>
                      <v-tooltip activator="parent" location="top">Editar cargo</v-tooltip>
                    </v-btn>
                    <v-btn
                      variant="text"
                      size="small"
                      color="error"
                      @click.stop="cargosStore.deleteCargo(item.raw.id)"
                    >
                      <v-icon size="18">mdi-delete</v-icon>
                      <v-tooltip activator="parent" location="top">Eliminar cargo</v-tooltip>
                    </v-btn>
                  </div>
                </template>
              </v-list-item>
            </template>

            <!-- Botón extra al final de la lista -->
            <template v-slot:append-item>
                <v-divider />
                <v-list-item @click="openDialog()" color="primary">
                    <template v-slot:prepend>
                        <v-icon color="primary">mdi-plus-circle</v-icon>
                    </template>
                    <v-list-item-title class="text-primary font-weight-bold">
                        AÑADIR NUEVO CARGO AL CATÁLOGO
                    </v-list-item-title>
                </v-list-item>
            </template>
        </v-autocomplete>

        <!-- Diálogo para crear/editar -->
         <v-dialog v-model="dialog" max-width="480">
            <v-card>
                <v-card-title class="text-h6">
                    {{ editingCargo ? 'Editar Cargo' : 'Nuevo Cargo' }}
                </v-card-title>
                <v-divider />
                <v-card-text class="pt-4">
                    <v-text-field
                        v-model="cargoName"
                        label="Nombre"
                        variant="outlined"
                        autofocus
                        maxlength="255"
                        counter="255"
                        :rules="[v => !!String(v || '').trim() || 'El nombre es obligatorio']"
                        class="mb-4"
                    ></v-text-field>
                    <v-textarea
                        v-model="cargoDescripcion"
                        label="Descripción"
                        variant="outlined"
                        rows="2"
                        maxlength="512"
                        counter="512"
                        hide-details="auto"
                        class="mb-6"
                    ></v-textarea>
                    
                    <div 
                        class="d-flex align-center justify-space-between pa-3 rounded cursor-pointer transition-colors" 
                        :class="{ 'bg-green-lighten-5 border-s-4 border-green': cargoActivo, 'bg-grey-lighten-4 border-s-4 border-grey-darken-1': !cargoActivo }"
                        @click="cargoActivo = !cargoActivo"
                    >
                        <div class="flex-grow-1">
                            <div class="text-caption font-weight-bold" :class="{ 'text-green-darken-2': cargoActivo, 'text-grey-darken-1': !cargoActivo }">
                                Estado: <span class="font-weight-bold">{{ cargoActivo ? 'ACTIVO' : 'INACTIVO' }}</span>
                            </div>
                            <div class="text-xs text-grey-darken-1">
                                {{ cargoActivo ? 'Este cargo será visible y disponible' : 'Este cargo estará oculto' }}
                            </div>
                        </div>
                        <v-checkbox
                            :model-value="cargoActivo"
                            hide-details
                            density="compact"
                            class="ml-2"
                            @click.stop="cargoActivo = !cargoActivo"
                        ></v-checkbox>
                    </div>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn text @click="dialog = false">Cancelar</v-btn>
                    <v-btn 
                        color="primary" 
                        @click="saveCargo" 
                        :loading="cargosStore.loading"
                        :disabled="!cargoName.trim()"
                    >
                        Guardar
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>