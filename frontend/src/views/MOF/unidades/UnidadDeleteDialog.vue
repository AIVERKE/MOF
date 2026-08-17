<script setup>
const props = defineProps({
  modelValue: Boolean,
  nombreUnidad: String
});

const emit = defineEmits(["update:modelValue", "confirm"]);

function close() {
  emit("update:modelValue", false);
}

function confirm() {
  emit("confirm");
}
</script>

<template>
  <v-dialog :model-value="modelValue" @update:model-value="val => emit('update:modelValue', val)" max-width="450">
    <v-card>
      <v-card-title class="text-error font-weight-bold">¿Confirmar Eliminación?</v-card-title>
      <v-card-text>
        ¿Está seguro que desea eliminar <strong>{{ nombreUnidad }}</strong>?
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="close">Cancelar</v-btn>
        <v-btn color="error" variant="flat" @click="confirm">Eliminar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
