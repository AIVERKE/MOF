<script setup>
import { ref, watch, computed } from "vue";
import { rules } from "@/utils/rules";
import { swatches, getUsedColors } from "@/utils/mofHelpers";
import { useAllUnidadesMofStore } from "@/stores/unidades_mof";
import { useAllClasesMofStore } from "@/stores/clases_mof";

// Componentes de selección
import SelectAllRelaciones from "../relaciones/SelectAllRelaciones.vue";
import SelectAllTipos from "../tipos/SelectAllTipos.vue";
import SelectAllNiveles from "../niveles/SelectAllNiveles.vue";
import SelectAllUnidades from "./SelectAllUnidades.vue";
import SelectAllCargos from "../cargos/SelectAllCargos.vue";
import SelectAllClases from "../clases/SelectAllClases.vue";

const props = defineProps({
  modelValue: Boolean,
  formData: Object,
  isEditMode: Boolean,
  selectedNode: Object,
  formValid: Boolean,
});

const emit = defineEmits([
  "update:modelValue",
  "update:formValid",
  "confirm",
  "add-funcion",
  "edit-funcion",
  "remove-funcion",
  "mover-arriba",
  "mover-abajo",
]);

const unidadesStore = useAllUnidadesMofStore();
const clasesStore = useAllClasesMofStore();

const colorMenu = ref(false);
const modalFuncionDialog = ref(false);
const editingFuncionIndex = ref(null);
const formFuncion = ref({ funcion: "", baseLegal: "" });

// Colores usados en el sistema
const usedColors = computed(() =>
  getUsedColors(unidadesStore.unidades, clasesStore.clases),
);

// Sincronizar formValid con el padre
const localFormValid = ref(props.formValid);
watch(localFormValid, (val) => emit("update:formValid", val));

/**
 * Watcher para prioridad de color:
 * Cuando cambia la Clase (Instancia), el color de la unidad
 * toma automáticamente el color institucional de esa clase.
 */
watch(
  () => props.formData.clase,
  (newClaseId) => {
    if (newClaseId) {
      const claseObj = clasesStore.clases.find(
        (c) => String(c.id) === String(newClaseId),
      );
      if (claseObj && claseObj.color) {
        props.formData.color = claseObj.color;
      }
    }
  },
);

/**
 * Si se selecciona que es Unidad Troncal, OBLIGATORIAMENTE se fija al CENTRO.
 */
watch(
  () => props.formData.es_troncal,
  (val) => {
    if (val) {
      props.formData.lado = "CENTRO";
    }
  },
  { immediate: true },
);

function close() {
  emit("update:modelValue", false);
}

function confirm() {
  emit("confirm");
}

// --- GESTIÓN DE FUNCIONES (Local UI) ---
function abrirModalFuncion(index = null) {
  if (index !== null) {
    formFuncion.value = { ...props.formData.funciones[index] };
    editingFuncionIndex.value = index;
  } else {
    formFuncion.value = { funcion: "", baseLegal: "" };
    editingFuncionIndex.value = null;
  }
  modalFuncionDialog.value = true;
}

function guardarFuncion() {
  if (editingFuncionIndex.value !== null) {
    emit("edit-funcion", {
      index: editingFuncionIndex.value,
      funcion: formFuncion.value.funcion,
      baseLegal: formFuncion.value.baseLegal,
    });
  } else {
    emit("add-funcion", {
      funcion: formFuncion.value.funcion,
      baseLegal: formFuncion.value.baseLegal,
    });
  }
  modalFuncionDialog.value = false;
}

function eliminarFuncion(index) {
  emit("remove-funcion", index);
}

function moverArriba(index) {
  emit("mover-arriba", index);
}

function moverAbajo(index) {
  emit("mover-abajo", index);
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="(val) => emit('update:modelValue', val)"
    max-width="900px"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>
          {{ isEditMode ? "Editar" : "Agregar a" }}:
          <strong class="text-primary">
            {{
              isEditMode
                ? formData.nombre || formData.denominacion
                : selectedNode?.nombre || selectedNode?.denominacion || "RAÍZ"
            }}
          </strong>
        </span>
        <v-btn icon="mdi-close" variant="text" @click="close">
          <v-icon>mdi-close</v-icon>
          <v-tooltip activator="parent" location="top"
            >Cerrar formulario</v-tooltip
          >
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <v-form v-model="localFormValid" autocomplete="off">
          <v-row>
            <v-col cols="12" md="8">
              <v-text-field
                v-model="formData.nombre"
                label="Nombre de la Unidad"
                :rules="[rules.required, rules.minLength(4)]"
                variant="underlined"
                autocomplete="off"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.sigla"
                label="Sigla (ej: FCPN)"
                variant="underlined"
                autocomplete="off"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.codigo"
                label="Código"
                :rules="[rules.codigo, rules.minLength(2)]"
                variant="underlined"
                autocomplete="off"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.resCreacion"
                label="Nro de Resolución"
                variant="underlined"
                autocomplete="off"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-date-input
                v-model="formData.fecCreacion"
                label="Fecha de Creación"
                variant="underlined"
                autocomplete="off"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="formData.objetivo"
                label="Objetivo Institucional"
                variant="underlined"
                rows="2"
                auto-grow
                autocomplete="off"
              />
            </v-col>
          </v-row>

          <v-divider class="my-6" />
          <div class="d-flex justify-space-between align-center mb-4">
            <h3 class="text-h6">Funciones de la Unidad</h3>
            <v-btn
              size="small"
              prepend-icon="mdi-plus"
              color="primary"
              @click="abrirModalFuncion()"
            >
              Agregar Función
              <v-tooltip activator="parent" location="top"
                >Agregar nueva función institucional</v-tooltip
              >
            </v-btn>
          </div>

          <v-card
            v-if="formData.funciones?.length"
            variant="outlined"
            class="rounded-md border-slate-200 overflow-hidden mb-4"
          >
            <v-table density="compact">
              <thead>
                <tr class="bg-slate-100 border-b-slate">
                  <th class="text-caption font-weight-bold px-3 border-r-slate" style="width: 40%">Función</th>
                  <th class="text-caption font-weight-bold px-3 border-r-slate" style="width: 40%">Base Legal</th>
                  <th class="text-caption font-weight-bold px-3 text-right" style="width: 20%">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(f, i) in formData.funciones" :key="f.id || f.tempId || i" class="border-b-slate">
                  <td class="px-3 py-2 border-r-slate" style="width: 40%">{{ f.funcion }}</td>
                  <td class="px-3 py-2 border-r-slate" style="width: 40%">{{ f.baseLegal }}</td>
                  <td class="text-right px-3 py-1 text-no-wrap" style="width: 20%">
                    <v-btn
                      icon="mdi-arrow-up"
                      size="x-small"
                      variant="text"
                      color="primary"
                      :disabled="i === 0"
                      @click="moverArriba(i)"
                    >
                      <v-icon size="16">mdi-arrow-up</v-icon>
                      <v-tooltip activator="parent" location="top"
                        >Subir posición</v-tooltip
                      >
                    </v-btn>
                    <v-btn
                      icon="mdi-arrow-down"
                      size="x-small"
                      variant="text"
                      color="primary"
                      :disabled="i === formData.funciones.length - 1"
                      @click="moverAbajo(i)"
                    >
                      <v-icon size="16">mdi-arrow-down</v-icon>
                      <v-tooltip activator="parent" location="top"
                        >Bajar posición</v-tooltip
                      >
                    </v-btn>
                    <v-btn
                      icon="mdi-pencil"
                      size="x-small"
                      variant="text"
                      color="warning"
                      @click="abrirModalFuncion(i)"
                    >
                      <v-icon size="16">mdi-pencil</v-icon>
                      <v-tooltip activator="parent" location="top"
                        >Editar función</v-tooltip
                      >
                    </v-btn>
                    <v-btn
                      icon="mdi-delete"
                      size="x-small"
                      variant="text"
                      color="error"
                      @click="eliminarFuncion(i)"
                    >
                      <v-icon size="16">mdi-delete</v-icon>
                      <v-tooltip activator="parent" location="top"
                        >Eliminar función</v-tooltip
                      >
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card>
          <v-alert v-else type="info" variant="tonal" class="mb-4"
            >Sin funciones registradas.</v-alert
          >

          <v-row>
            <v-col cols="12">
              <SelectAllUnidades
                v-model="formData.dependenciasFuncionales"
                type="autocomplete"
                label="Dependencia"
                multiple
                :exclude-id="formData.id"
              />
            </v-col>
            <v-col cols="12" md="4">
              <SelectAllTipos
                v-model="formData.tipo"
                label="Tipo de Unidad"
                :rules="[rules.required]"
              />
            </v-col>
            <v-col cols="12" md="4">
              <SelectAllNiveles
                v-model="formData.nivel"
                label="Nivel Jerárquico"
                :rules="[rules.required]"
              />
            </v-col>
            <v-col cols="12" md="4">
              <SelectAllRelaciones
                v-model="formData.relacion"
                :rules="[rules.required]"
              />
            </v-col>
            <v-col cols="12" md="6"
              ><SelectAllCargos v-model="formData.cargos"
            /></v-col>
            <v-col cols="12" md="6">
              <SelectAllClases
                v-model="formData.clase"
                label="Instancia"
                :rules="[rules.required]"
              />
            </v-col>
          </v-row>

          <!-- ESTRUCTURA Y DISPOSICIÓN EN EL ORGANIGRAMA -->
          <v-card variant="outlined" class="pa-4 my-4 rounded-lg border-primary">
            <div class="text-subtitle-2 font-weight-bold text-primary mb-2 d-flex align-center">
              <v-icon start size="18">mdi-sitemap</v-icon>
              Disposición en el Organigrama
            </div>
            <v-row dense align="center">
              <v-col cols="12" sm="5">
                <v-switch
                  v-model="formData.es_troncal"
                  color="primary"
                  hide-details
                  density="compact"
                  label="¿Es Unidad Troncal?"
                />
                <span class="text-caption text-grey">Si está activo, desciende por la línea central de gobierno</span>
              </v-col>
              <v-col cols="12" sm="7">
                <div class="text-caption font-weight-bold mb-1 text-grey-darken-1">
                  {{ formData.es_troncal ? 'Lado: Fijado al CENTRO (por ser Troncal)' : 'Lado en el Organigrama:' }}
                </div>
                <v-btn-toggle
                  v-model="formData.lado"
                  :disabled="formData.es_troncal"
                  mandatory
                  color="primary"
                  density="comfortable"
                  variant="outlined"
                  rounded="lg"
                  class="d-flex flex-wrap"
                >
                  <v-btn value="IZQUIERDA" class="px-2 text-caption">
                    <v-icon start size="16">mdi-arrow-left-bold</v-icon> Izquierda
                  </v-btn>
                  <v-btn value="CENTRO" class="px-2 text-caption">
                    <v-icon start size="16">mdi-format-align-center</v-icon> Centro
                  </v-btn>
                  <v-btn value="DERECHA" class="px-2 text-caption">
                    <v-icon start size="16">mdi-arrow-right-bold</v-icon> Derecha
                  </v-btn>
                  <v-btn value="AUTOMATICO" class="px-2 text-caption">
                    <v-icon start size="16">mdi-auto-fix</v-icon> Auto
                  </v-btn>
                </v-btn-toggle>
              </v-col>
            </v-row>
          </v-card>

          <v-row justify="end" class="mt-4 px-4 align-center">
            <v-menu v-model="colorMenu" :close-on-content-click="false">
              <template v-slot:activator="{ props }">
                <div
                  v-bind="props"
                  class="d-flex align-center mr-4"
                  style="cursor: pointer"
                >
                  <v-icon :color="formData.color" size="large" class="mr-2"
                    >mdi-palette</v-icon
                  >
                  <span class="text-caption font-weight-bold"
                    >PERSONALIZAR COLOR</span
                  >
                  <v-tooltip activator="parent" location="top"
                    >Personalizar el color de este nodo</v-tooltip
                  >
                </div>
              </template>
              <v-card min-width="300" class="pa-3">
                <div v-if="usedColors.length > 0" class="mb-4">
                  <div
                    class="text-caption font-weight-bold mb-2 text-uppercase grey--text"
                  >
                    Colores en uso
                  </div>
                  <div class="d-flex flex-wrap gap-2">
                    <v-avatar
                      v-for="c in usedColors"
                      :key="c"
                      :color="c"
                      size="24"
                      class="cursor-pointer border-sm shadow-sm hover-scale"
                      @click="formData.color = c"
                    >
                      <v-icon
                        v-if="formData.color?.toUpperCase() === c.toUpperCase()"
                        size="14"
                        color="white"
                        >mdi-check</v-icon
                      >
                    </v-avatar>
                  </div>
                </div>
                <v-divider
                  v-if="usedColors.length > 0"
                  class="mb-3"
                ></v-divider>
                <div
                  class="text-caption font-weight-bold mb-2 text-uppercase grey--text"
                >
                  Paleta Institucional
                </div>
                <v-color-picker
                  v-model="formData.color"
                  mode="hex"
                  :swatches="swatches"
                  show-swatches
                  hide-inputs
                  flat
                />
              </v-card>
            </v-menu>

            <span :class="formData.oficial ? '' : 'text-red'">{{
              formData.oficial ? "OFICIAL" : "NO OFICIAL"
            }}</span>
            <v-switch
              v-model="formData.oficial"
              color="primary"
              hide-details
              inset
              class="ml-2"
            >
              <v-tooltip activator="parent" location="top"
                >Alternar estado oficial de la unidad</v-tooltip
              >
            </v-switch>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="close">Cancelar</v-btn>
        <v-btn color="primary" :disabled="!localFormValid" @click="confirm">
          Guardar Unidad
          <v-tooltip activator="parent" location="top"
            >Persistir cambios en el manual</v-tooltip
          >
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- MODAL INTERNO: AGREGAR/EDITAR FUNCIÓN -->
    <v-dialog v-model="modalFuncionDialog" max-width="600">
      <v-card>
        <v-card-title class="font-weight-bold">
          {{
            editingFuncionIndex !== null ? "Editar Función" : "Agregar Función"
          }}
        </v-card-title>
        <v-card-text class="pt-4">
          <v-text-field
            v-model="formFuncion.funcion"
            label="Función"
            variant="underlined"
            autocomplete="off"
          />
          <v-text-field
            v-model="formFuncion.baseLegal"
            label="Base Legal"
            variant="underlined"
            class="mt-4"
            autocomplete="off"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="modalFuncionDialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="guardarFuncion">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>
