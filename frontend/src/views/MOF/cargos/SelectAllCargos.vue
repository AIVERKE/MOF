<script setup>
import { onMounted, computed, ref } from 'vue';
import { useAllCargosMofStore } from '../../../stores/cargos_mof';
import { hints } from "@/config/hints";
import CargoCatalogDialog from './CargoCatalogDialog.vue';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  hint: {
    type: String,
    default: () => hints.cargos.select
  }
});
const emit = defineEmits(['update:modelValue']);

const cargosStore = useAllCargosMofStore();

const dialog = ref(false);
const editingCargo = ref(null);
const dialogInitialName = ref("");
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
      id: String(c.id),
      // Vuetify: deshabilita selección de inactivos (siguen visibles)
      props: { disabled: c.activo === false }
    }));
});

const cargoById = computed(() => {
  const map = new Map();
  uniqueCargos.value.forEach((c) => map.set(String(c.id), c));
  return map;
});

/**
 * Propiedad computada bidireccional para el v-model.
 * Conserva chips ya asignados aunque el cargo esté inactivo;
 * bloquea nuevas selecciones de inactivos.
 */
const value = computed({
  get() {
    const val = Array.isArray(props.modelValue) ? props.modelValue : [];
    return val.map(id => String(id));
  },
  set(val) {
    const next = Array.isArray(val) ? val.map((id) => String(id)) : [];
    const prev = new Set(
      (Array.isArray(props.modelValue) ? props.modelValue : []).map((id) =>
        String(id),
      ),
    );
    const filtered = next.filter((id) => {
      if (prev.has(id)) return true;
      const cargo = cargoById.value.get(id);
      return !cargo || cargo.activo !== false;
    });
    emit('update:modelValue', filtered);
  }
});

function isSelected(id) {
  return value.value.includes(String(id));
}

function toggleSelect(item) {
  const id = String(item.id);
  const selected = isSelected(id);
  if (!selected && item.activo === false) return;
  if (selected) {
    value.value = value.value.filter((v) => v !== id);
  } else {
    value.value = [...value.value, id];
  }
}

function openDialog(item = null) {
  editingCargo.value = item;
  dialogInitialName.value = item ? "" : search.value;
  dialog.value = true;
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
            v-bind="$attrs"
            v-model="value"
            v-model:search="search"
            label="Cargos del Personal" 
            :hint="hint"
            :persistent-hint="false"
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
            <template v-slot:item="{ props: itemProps, item }">
              <v-list-item
                v-bind="itemProps"
                :title="undefined"
                :disabled="item.raw.activo === false"
                :class="{ 'opacity-50 text-grey-darken-1': !item.raw.activo }"
                @click.prevent="toggleSelect(item.raw)"
              >
                <template v-slot:prepend>
                  <v-checkbox-btn
                    :model-value="isSelected(item.raw.id)"
                    :disabled="item.raw.activo === false && !isSelected(item.raw.id)"
                    @click.stop="toggleSelect(item.raw)"
                  ></v-checkbox-btn>
                </template>
                <template v-slot:title>
                  {{ item.raw.nombre }}
                  <span v-if="item.raw.nivelOrden != null" class="text-caption text-medium-emphasis ml-1">
                    · N{{ item.raw.nivelOrden }}
                  </span>
                  <span v-if="!item.raw.activo" class="text-caption font-italic ml-1">(Inactivo)</span>
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

        <CargoCatalogDialog
            v-model="dialog"
            :cargo="editingCargo"
            :initial-name="dialogInitialName"
        />
    </div>
</template>
