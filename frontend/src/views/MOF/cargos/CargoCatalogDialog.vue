<script setup>
import { computed, ref, watch } from "vue";
import { useAllCargosMofStore } from "../../../stores/cargos_mof";
import { hints } from "@/config/hints";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  cargo: { type: Object, default: null },
  initialName: { type: String, default: "" },
});
const emit = defineEmits(["update:modelValue", "saved"]);

const cargosStore = useAllCargosMofStore();

const cargoName = ref("");
const cargoDescripcion = ref("");
const cargoActivo = ref(true);
const cargoNivel = ref(null);

const nivelRules = [
  (v) =>
    v == null ||
    v === "" ||
    (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 99) ||
    "El nivel debe ser un entero entre 1 y 99",
];
const nivelValido = computed(() => nivelRules.every((r) => r(cargoNivel.value) === true));

const dialog = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    const item = props.cargo;
    cargoName.value = item ? item.nombre || item.descripcion || "" : props.initialName || "";
    cargoDescripcion.value = item?.descripcion || "";
    cargoActivo.value = item?.activo ?? true;
    cargoNivel.value = item?.nivelOrden ?? null;
  },
  { immediate: true },
);

async function saveCargo() {
  if (!cargoName.value.trim() || !nivelValido.value) return;

  const nombre = cargoName.value.trim().slice(0, 255);
  const descripcion = cargoDescripcion.value.trim().slice(0, 512) || null;
  const nivelOrden = cargoNivel.value === "" ? null : cargoNivel.value;

  const success = props.cargo
    ? await cargosStore.updateCargo(props.cargo.id, nombre, descripcion, cargoActivo.value, nivelOrden)
    : await cargosStore.createCargo(nombre, descripcion, cargoActivo.value, null, nivelOrden);

  if (success) {
    dialog.value = false;
    emit("saved", { nombre });
  }
}
</script>

<template>
  <v-dialog v-model="dialog" max-width="480">
    <v-card>
      <v-card-title class="text-h6">
        {{ cargo ? 'Editar Cargo' : 'Nuevo Cargo' }}
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <v-text-field
          v-model="cargoName"
          label="Nombre"
          variant="outlined"
          autofocus


          :hint="hints.cargos.nombre"
          :persistent-hint="false"
          :rules="[v => !!String(v || '').trim() || 'El nombre es obligatorio']"
          class="mb-4"
        ></v-text-field>
        <v-textarea
          v-model="cargoDescripcion"
          label="Descripción"
          variant="outlined"
          rows="2"


          :hint="hints.cargos.descripcion"
          :persistent-hint="false"
          hide-details="auto"
          class="mb-4"
        ></v-textarea>
        <v-text-field
          v-model.number="cargoNivel"
          label="Nivel jerárquico sugerido"
          type="number"
          variant="outlined"
          min="1"
          max="99"
          clearable
          :hint="hints.cargos.nivel"
          :persistent-hint="false"
          :rules="nivelRules"
          class="mb-4"
        ></v-text-field>

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
              {{ cargoActivo ? 'Visible y seleccionable para asignar a unidades' : 'Visible (atenuado) pero no seleccionable ni asignable' }}
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
      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn variant="text" class="rounded-lg font-weight-medium px-4" @click="dialog = false">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          class="rounded-lg font-weight-bold px-4"
          :loading="cargosStore.loading"
          :disabled="!cargoName.trim() || !nivelValido"
          @click="saveCargo"
        >
          Guardar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
