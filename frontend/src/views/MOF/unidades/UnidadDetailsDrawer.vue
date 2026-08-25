<script setup>
import { formatDateForDisplay } from "@/utils/mofHelpers";

const props = defineProps({
  modelValue: Boolean,
  detailData: Object,
  loading: Boolean,
  getNivelNombre: Function,
  getTipoNombre: Function,
  getRelacionNombre: Function,
  getClaseNombre: Function
});

const emit = defineEmits(["update:modelValue", "edit", "reporte"]);

function close() {
  emit("update:modelValue", false);
}
</script>

<template>
  <v-navigation-drawer
    :model-value="modelValue"
    @update:model-value="val => emit('update:modelValue', val)"
    location="right"
    temporary
    :width="$vuetify.display.xs ? '100%' : 400"
    elevation="10"
  >
    <v-toolbar :color="detailData?.color || 'primary'" dark density="compact">
      <v-toolbar-title class="text-caption font-weight-bold">Detalles de la Unidad</v-toolbar-title>
      <v-spacer />
      <v-btn icon size="small" @click="close">
        <v-icon size="20">mdi-close</v-icon>
        <v-tooltip activator="parent" location="bottom">Cerrar detalles</v-tooltip>
      </v-btn>
    </v-toolbar>

    <v-progress-linear v-if="loading" indeterminate color="primary" height="2" />

    <v-list v-if="detailData" class="pa-3 bg-slate-50">
      <div class="mb-3">
        <div class="text-subtitle-2 font-weight-black mb-1 line-height-1-1">
          {{ detailData.nombre_display }}
        </div>
        <div class="d-flex align-center gap-1">
          <v-chip size="x-small" label color="grey-darken-4" class="font-weight-black" style="font-size: 9px !important;">
            CÓDIGO: {{ detailData.codigo }}
          </v-chip>
          <v-chip v-if="detailData.sigla" size="x-small" label color="primary" class="font-weight-black" style="font-size: 9px !important;">
            SIGLA: {{ detailData.sigla }}
          </v-chip>
        </div>
      </div>

      <v-divider class="mb-3" />

      <div class="text-xxs font-weight-black text-primary mb-1 uppercase" style="letter-spacing: 0.5px;">
        Configuración Estructural
      </div>

      <v-row dense class="mb-2">
        <v-col cols="6">
          <div class="text-xxs text-grey-darken-1 font-weight-bold">Nivel</div>
          <div class="text-caption font-weight-bold text-slate-800">{{ getNivelNombre(detailData.nivel) }}</div>
        </v-col>
        <v-col cols="6">
          <div class="text-xxs text-grey-darken-1 font-weight-bold">Tipo</div>
          <div class="text-caption font-weight-bold text-slate-800">{{ getTipoNombre(detailData.tipo) }}</div>
        </v-col>
        <v-col cols="6" class="mt-1">
          <div class="text-xxs text-grey-darken-1 font-weight-bold">Relación</div>
          <div class="text-caption font-weight-bold text-slate-800">{{ getRelacionNombre(detailData.relacion) }}</div>
        </v-col>
        <v-col cols="6" class="mt-1">
          <div class="text-xxs text-grey-darken-1 font-weight-bold">Clase</div>
          <div class="text-caption font-weight-bold text-slate-800">{{ getClaseNombre(detailData.clase) }}</div>
        </v-col>
        <v-col cols="6" class="mt-1">
          <div class="text-xxs text-grey-darken-1 font-weight-bold">Resolución Creación</div>
          <div class="text-caption font-weight-bold text-slate-800">{{ detailData.resCreacion || detailData.res_creacion || "---" }}</div>
        </v-col>
        <v-col cols="6" class="mt-1">
          <div class="text-xxs text-grey-darken-1 font-weight-bold">Base Legal</div>
          <div class="text-caption font-weight-bold text-slate-800">{{ detailData.baseLegal || detailData.base_legal || "---" }}</div>
        </v-col>
      </v-row>

      <v-divider class="my-3" />

      <div v-if="detailData.cargos_detalle?.length">
        <div class="text-xxs font-weight-black text-primary mb-1 uppercase">Talento Humano</div>
        <div v-for="c in detailData.cargos_detalle" :key="c.id" class="text-caption font-weight-medium mb-1 line-height-1-2">• {{ c.descripcion }}</div>
        <v-divider class="my-3" />
      </div>

      <div v-if="detailData.dependencias_nombres?.length">
        <div class="text-xxs font-weight-black text-primary mb-1 uppercase">Dependencias</div>
        <div v-for="name in detailData.dependencias_nombres" :key="name" class="text-caption font-weight-medium mb-1 text-indigo-darken-3 line-height-1-2">• {{ name }}</div>
        <v-divider class="my-3" />
      </div>

      <div class="mb-3">
        <div class="text-xxs font-weight-black text-primary mb-1 uppercase">Objetivo</div>
        <div class="text-caption text-justify font-weight-medium line-height-1-3">{{ detailData.objetivo_display || "Sin objetivo registrado." }}</div>
      </div>

      <div class="mb-3">
        <div class="text-xxs font-weight-black text-primary mb-1 uppercase">Funciones</div>
        <v-card variant="outlined" class="rounded-md border-slate-200 overflow-hidden" v-if="detailData.funciones?.length">
          <v-table density="compact">
            <thead>
              <tr class="bg-slate-100 border-b-slate">
                <th class="text-xxs font-weight-black px-2 border-r-slate">FUNCIÓN</th>
                <th class="text-xxs font-weight-black px-2">BASE LEGAL</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in detailData.funciones" :key="f.id" class="border-b-slate">
                <td class="text-xxs font-weight-bold py-1 px-2 border-r-slate">{{ f.funcion }}</td>
                <td class="text-xxs font-weight-black py-1 px-2">{{ f.baseLegal }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
        <v-alert v-else type="warning" variant="tonal" density="compact" class="text-xxs">Sin funciones asignadas.</v-alert>
      </div>

      <div class="d-flex flex-column gap-1 mt-4">
        <v-btn color="primary" block prepend-icon="mdi-pencil" size="small" @click="emit('edit', detailData.id)">
          Editar Información
          <v-tooltip activator="parent" location="top">Abrir formulario</v-tooltip>
        </v-btn>
        <v-btn variant="flat" block prepend-icon="mdi-file-pdf-box" color="error" size="small" @click="emit('reporte', detailData.id)">
          Exportar PDF
          <v-tooltip activator="parent" location="top">Generar reporte oficial</v-tooltip>
        </v-btn>
      </div>
    </v-list>
  </v-navigation-drawer>
</template>
