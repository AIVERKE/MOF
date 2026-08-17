<script setup>
import { computed } from "vue";
import { rules } from "@/utils/rules";
import SelectAllUnidades from "./SelectAllUnidades.vue";

const props = defineProps({
  modelValue: Boolean,
  unidadACambiar: [Number, String],
  unidadDestino: [Number, String],
  razon: String,
  unidades: Array
});

const emit = defineEmits([
  "update:modelValue", 
  "update:unidadACambiar", 
  "update:unidadDestino", 
  "update:razon",
  "confirm"
]);

const unidadesNoRaiz = computed(() =>
  props.unidades.filter((u) => u.parent !== null)
);

const unidadesDestinoFiltradas = computed(() =>
  props.unidades.filter(
    (u) => String(u.id) !== String(props.unidadACambiar)
  )
);

function close() {
  emit("update:modelValue", false);
}

function confirm() {
  emit("confirm");
}
</script>

<template>
  <v-dialog :model-value="modelValue" @update:model-value="val => emit('update:modelValue', val)" max-width="800">
    <v-card>
      <v-card-title class="font-weight-bold">CAMBIO DE DEPENDENCIA DE UNIDAD</v-card-title>
      <v-divider />
      <v-alert type="warning" title="CUIDADO" text="Afecta automáticamente a los dependientes." />
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <SelectAllUnidades
              :model-value="unidadACambiar"
              @update:model-value="val => emit('update:unidadACambiar', val)"
              label="Unidad a cambiar"
              :items="unidadesNoRaiz"
            />
          </v-col>
          <v-col cols="12" md="6">
            <SelectAllUnidades
              :model-value="unidadDestino"
              @update:model-value="val => emit('update:unidadDestino', val)"
              label="Unidad destino"
              :disabled="!unidadACambiar"
              :items="unidadesDestinoFiltradas"
            />
          </v-col>
        </v-row>
        <v-textarea
          :model-value="razon"
          @update:model-value="val => emit('update:razon', val)"
          label="Razón"
          variant="underlined"
          rows="2"
          class="mt-4"
          :rules="[rules.required, rules.minLength(6)]"
          autocomplete="off"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="close">Cerrar</v-btn>
        <v-btn
          color="primary"
          :disabled="!unidadACambiar || !unidadDestino || !razon"
          @click="confirm"
        >
          Cambiar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
