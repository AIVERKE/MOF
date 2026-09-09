<script setup>
defineProps({
  unidadId: { type: [String, Number], required: true },
  showQuickActions: { type: Boolean, default: false },
  showDetails: { type: Boolean, default: true },
  showPdf: { type: Boolean, default: true },
  showDependencias: { type: Boolean, default: true },
  showAddChild: { type: Boolean, default: true },
  showEdit: { type: Boolean, default: true },
  showDelete: { type: Boolean, default: true },
  /** 'node' = size 32 / icon 24; 'compact' = small / icon 20 */
  density: { type: String, default: "compact" },
  activatorColor: { type: String, default: "grey-darken-3" },
});

const emit = defineEmits([
  "details",
  "pdf",
  "dependencias",
  "add-child",
  "edit",
  "delete",
]);
</script>

<template>
  <div class="d-flex align-center justify-center unidad-actions-menu">
    <template v-if="showQuickActions">
      <v-btn
        v-if="showDetails"
        icon
        variant="text"
        :size="density === 'node' ? '32' : 'small'"
        color="blue-darken-2"
        @click.stop="emit('details', unidadId)"
      >
        <v-icon :size="density === 'node' ? 24 : 20">mdi-eye</v-icon>
        <v-tooltip activator="parent" location="top">Ver ficha</v-tooltip>
      </v-btn>
      <v-btn
        v-if="showPdf"
        icon
        variant="text"
        :size="density === 'node' ? '32' : 'small'"
        color="red-darken-2"
        @click.stop="emit('pdf', unidadId)"
      >
        <v-icon :size="density === 'node' ? 24 : 20">mdi-file-pdf-box</v-icon>
        <v-tooltip activator="parent" location="top">Generar PDF</v-tooltip>
      </v-btn>
    </template>

    <v-menu location="bottom end" transition="scale-transition">
      <template v-slot:activator="{ props: menuProps }">
        <v-btn
          v-bind="menuProps"
          icon
          variant="text"
          :color="activatorColor"
          :size="density === 'node' ? '32' : 'small'"
          @click.stop
        >
          <v-icon :size="density === 'node' ? 24 : 20">mdi-dots-vertical</v-icon>
          <v-tooltip activator="parent" location="top"
            >Opciones de la unidad</v-tooltip
          >
        </v-btn>
      </template>
      <v-list
        density="comfortable"
        min-width="220"
        class="rounded-lg shadow-2xl bg-grey-darken-4 border-sm border-white"
      >
        <v-list-item
          v-if="showDetails"
          prepend-icon="mdi-eye"
          title="Ver Ficha Técnica"
          class="text-blue-lighten-2 font-weight-black"
          @click="emit('details', unidadId)"
        />
        <v-list-item
          v-if="showPdf"
          prepend-icon="mdi-file-pdf-box"
          title="Generar Reporte PDF"
          class="text-red-lighten-2 font-weight-black"
          @click="emit('pdf', unidadId)"
        />
        <v-list-item
          v-if="showDependencias"
          prepend-icon="mdi-file-tree"
          title="Dependencias Funcionales"
          class="text-green-lighten-2 font-weight-black"
          @click="emit('dependencias', unidadId)"
        />
        <v-divider
          v-if="
            (showDetails || showPdf || showDependencias) &&
            (showAddChild || showEdit || showDelete)
          "
          class="my-1"
          color="white"
        />
        <v-list-item
          v-if="showAddChild"
          prepend-icon="mdi-plus"
          title="Añadir Unidad Dependiente"
          class="text-blue-lighten-2 font-weight-black"
          @click="emit('add-child', unidadId)"
        />
        <v-list-item
          v-if="showEdit"
          prepend-icon="mdi-pencil"
          title="Editar Información"
          class="text-orange-lighten-2 font-weight-black"
          @click="emit('edit', unidadId)"
        />
        <v-list-item
          v-if="showDelete"
          prepend-icon="mdi-delete"
          title="Eliminar Unidad"
          class="text-red-accent-1 font-weight-black"
          @click="emit('delete', unidadId)"
        />
      </v-list>
    </v-menu>
  </div>
</template>
