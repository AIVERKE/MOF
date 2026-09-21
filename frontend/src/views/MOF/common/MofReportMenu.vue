<script setup>
defineProps({
  hasPdf: {
    type: Boolean,
    default: true,
  },
  hasCsv: {
    type: Boolean,
    default: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  color: {
    type: String,
    default: "primary",
  },
  variant: {
    type: String,
    default: "tonal",
  },
  density: {
    type: String,
    default: "comfortable",
  },
  label: {
    type: String,
    default: "Reporte",
  },
  tooltip: {
    type: String,
    default: "Exportar reporte de datos filtrados",
  },
});

defineEmits(["export-pdf", "export-csv"]);
</script>

<template>
  <v-menu location="bottom end" transition="scale-transition">
    <template v-slot:activator="{ props: menuProps }">
      <v-btn
        v-bind="menuProps"
        :color="color"
        :variant="variant"
        :density="density"
        :loading="loading"
        :disabled="disabled"
        prepend-icon="mdi-file-download-outline"
        append-icon="mdi-chevron-down"
        class="rounded-lg font-weight-bold"
        :elevation="variant === 'elevated' ? 2 : 0"
      >
        {{ label }}
        <v-tooltip activator="parent" location="top">
          {{ tooltip }}
        </v-tooltip>
      </v-btn>
    </template>

    <v-list density="compact" elevation="4" class="rounded-lg py-1" min-width="190">
      <v-list-item
        v-if="hasPdf"
        prepend-icon="mdi-file-pdf-box"
        title="Descargar PDF"
        subtitle="Reporte estructurado"
        class="cursor-pointer"
        @click="$emit('export-pdf')"
      >
        <template v-slot:prepend>
          <v-icon color="red-darken-1" class="mr-2">mdi-file-pdf-box</v-icon>
        </template>
      </v-list-item>

      <v-divider v-if="hasPdf && hasCsv" class="my-1"></v-divider>

      <v-list-item
        v-if="hasCsv"
        prepend-icon="mdi-file-delimited-outline"
        title="Descargar CSV"
        subtitle="Para Excel / Hojas de cálculo"
        class="cursor-pointer"
        @click="$emit('export-csv')"
      >
        <template v-slot:prepend>
          <v-icon color="green-darken-2" class="mr-2">mdi-file-delimited-outline</v-icon>
        </template>
      </v-list-item>
    </v-list>
  </v-menu>
</template>
