<script setup>
import { computed, onMounted, watch, ref } from 'vue';
import { useAllUnidadesMofStore } from '../../../stores/unidades_mof';
import { useAllClasesMofStore } from '../../../stores/clases_mof';

defineOptions({
  inheritAttrs: false
});

const props = defineProps({
    modelValue: [Number, String, Array, null],
    type: {
        type: String,
        default: 'select'
    },
    label: {
        type: String,
        default: 'Unidades'
    },
    excludeId: {
        type: [Number, String, null],
        default: null
    },
    items: {
        type: Array,
        default: null
    },
    enableBatchGroups: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:modelValue']);

const undadesAllUnidadesStore = useAllUnidadesMofStore();
const clasesStore = useAllClasesMofStore();
const updateKey = ref(0);

onMounted(async () => {
    if (undadesAllUnidadesStore.unidades.length === 0) {
        await undadesAllUnidadesStore.getFetchUnidades();
    }
    if (props.enableBatchGroups && clasesStore.clases.length === 0 && clasesStore.getFetchClases) {
        await clasesStore.getFetchClases();
    }
});

// Fuerza re-render cuando props.items cambia
watch(() => props.items, () => {
    updateKey.value++;
});

const filteredUnidades = computed(() => {
    updateKey.value; // Hacer que dependa del watcher
    const list = props.items || undadesAllUnidadesStore.unidades;
    if (props.excludeId != null && props.excludeId !== '') {
        return list.filter(u => String(u.id) !== String(props.excludeId));
    }
    return list;
});

/**
 * Metadatos y etiquetas para agrupaciones institucionales comunes (UMSA).
 */
const PRESET_GROUPS = {
    24: { label: 'Todas las Facultades (Decanatos)', shortLabel: 'Facultades', icon: 'mdi-domain', order: 1, keywords: ['facultad', 'facultades', 'decanato', 'decanatos'] },
    28: { label: 'Todas las Carreras', shortLabel: 'Carreras', icon: 'mdi-school', order: 2, keywords: ['carrera', 'carreras'] },
    29: { label: 'Todos los Institutos de Investigación', shortLabel: 'Institutos', icon: 'mdi-flask', order: 3, keywords: ['instituto', 'institutos', 'investigacion'] },
    30: { label: 'Todos los Posgrados', shortLabel: 'Posgrados', icon: 'mdi-book-education', order: 4, keywords: ['posgrado', 'posgrados', 'postgrado'] },
    25: { label: 'Todos los Departamentos', shortLabel: 'Departamentos', icon: 'mdi-office-building', order: 5, keywords: ['departamento', 'departamentos', 'depto'] },
    23: { label: 'Todas las Divisiones', shortLabel: 'Divisiones', icon: 'mdi-file-tree', order: 6, keywords: ['division', 'divisiones'] },
    20: { label: 'Todas las Secciones', shortLabel: 'Secciones', icon: 'mdi-tag-multiple', order: 7, keywords: ['seccion', 'secciones'] },
    27: { label: 'Todos los Vicedecanatos', shortLabel: 'Vicedecanatos', icon: 'mdi-account-tie', order: 8, keywords: ['vicedecanato', 'vicedecanatos'] },
    31: { label: 'Todas las Estaciones Experimentales', shortLabel: 'Estaciones Exp.', icon: 'mdi-sprout', order: 9, keywords: ['estacion', 'estaciones', 'experimental'] },
};

function getPresetForClase(tipoId, descripcion) {
    if (tipoId && PRESET_GROUPS[tipoId]) {
        return PRESET_GROUPS[tipoId];
    }
    const clean = String(descripcion || '').toUpperCase();
    if (clean.includes('FACULTAD') || clean.includes('DECANATO')) return PRESET_GROUPS[24];
    if (clean.includes('CARRERA')) return PRESET_GROUPS[28];
    if (clean.includes('INSTITUTO')) return PRESET_GROUPS[29];
    if (clean.includes('POSGRADO') || clean.includes('POSTGRADO')) return PRESET_GROUPS[30];
    if (clean.includes('DEPARTAMENTO')) return PRESET_GROUPS[25];
    if (clean.includes('DIVISION')) return PRESET_GROUPS[23];
    if (clean.includes('SECCION')) return PRESET_GROUPS[20];
    if (clean.includes('VICEDECANATO')) return PRESET_GROUPS[27];
    return null;
}

function getUnitTipoId(u) {
    if (u.tipoUnidad !== undefined && u.tipoUnidad !== null) return Number(u.tipoUnidad);
    if (u.tipo_unidad_id !== undefined && u.tipo_unidad_id !== null) return Number(u.tipo_unidad_id);
    if (u.clase || u.tipo_unidad) {
        const name = String(u.clase || u.tipo_unidad).trim().toUpperCase();
        const found = (clasesStore.clases || []).find(c => String(c.descripcion).trim().toUpperCase() === name);
        if (found) return Number(found.id);
    }
    return null;
}

/**
 * Calcula las agrupaciones disponibles según los tipos de unidad presentes.
 */
const availableGroups = computed(() => {
    if (!props.enableBatchGroups) return [];

    const currentUnits = filteredUnidades.value || [];
    const currentSelectedSet = new Set(
        (Array.isArray(props.modelValue) ? props.modelValue : []).map(id =>
            String(typeof id === 'object' && id !== null ? (id.id || id.value) : id)
        )
    );

    const mapByTipo = new Map();
    for (const u of currentUnits) {
        const tipoId = getUnitTipoId(u);
        if (!tipoId) continue;
        if (!mapByTipo.has(tipoId)) {
            mapByTipo.set(tipoId, []);
        }
        mapByTipo.get(tipoId).push(u);
    }

    const groups = [];
    for (const [tipoId, units] of mapByTipo.entries()) {
        if (!units || units.length === 0) continue;

        const claseObj = (clasesStore.clases || []).find(c => Number(c.id) === Number(tipoId));
        const rawDesc = claseObj?.descripcion || units[0]?.clase || units[0]?.tipo_unidad || `Tipo ${tipoId}`;
        const preset = getPresetForClase(tipoId, rawDesc);

        const label = preset?.label || `Todos los ${rawDesc}`;
        const shortLabel = preset?.shortLabel || rawDesc;
        const icon = preset?.icon || 'mdi-layers-triple';
        const order = preset?.order || 99;
        const color = claseObj?.color || units[0]?.color || '#3F51B5';
        const keywords = preset?.keywords || [rawDesc.toLowerCase()];

        const availableUnitIds = units.map(u => Number(u.id));
        const totalCount = availableUnitIds.length;
        const selectedCount = availableUnitIds.filter(id => currentSelectedSet.has(String(id))).length;

        let status = 'none';
        if (selectedCount === totalCount && totalCount > 0) {
            status = 'all';
        } else if (selectedCount > 0) {
            status = 'partial';
        }

        groups.push({
            tipoId: Number(tipoId),
            rawName: rawDesc,
            label,
            shortLabel,
            icon,
            order,
            color,
            keywords,
            availableUnitIds,
            totalCount,
            selectedCount,
            status,
        });
    }

    groups.sort((a, b) => a.order - b.order || b.totalCount - a.totalCount);
    return groups;
});

// Grupos principales para la barra superior (con al menos 2 unidades)
const mainQuickGroups = computed(() => {
    return availableGroups.value.filter(g => g.totalCount > 1).slice(0, 6);
});

// Grupos secundarios (restantes)
const secondaryGroups = computed(() => {
    return availableGroups.value.filter(g => g.totalCount > 1).slice(6);
});

const selectedCountTotal = computed(() => {
    return Array.isArray(props.modelValue) ? props.modelValue.length : 0;
});

/**
 * Alterna la selección de todo un grupo (tri-state: si todos están seleccionados, los deselecciona; si no, selecciona los faltantes).
 */
function toggleGroup(tipoId) {
    const group = availableGroups.value.find(g => String(g.tipoId) === String(tipoId));
    if (!group || group.availableUnitIds.length === 0) return;

    const current = Array.isArray(value.value)
        ? value.value.map(x => (typeof x === 'object' && x !== null ? (x.id || x.value) : x))
        : [];
    const groupIds = group.availableUnitIds;

    let next;
    if (group.status === 'all') {
        const setGroup = new Set(groupIds.map(id => String(id)));
        next = current.filter(id => !setGroup.has(String(id)));
    } else {
        const currentSet = new Set(current.map(id => String(id)));
        const toAdd = groupIds.filter(id => !currentSet.has(String(id)));
        next = [...current, ...toAdd];
    }
    value.value = next;
}

function clearAllSelection() {
    value.value = [];
}

const value = computed({
  get() {
    return props.modelValue;
  },
  set(val) {
    if (Array.isArray(val)) {
      const groupItems = val.filter(x => typeof x === 'string' && x.startsWith('__group_'));
      if (groupItems.length > 0) {
        let currentClean = val
          .filter(x => typeof x !== 'string' || !x.startsWith('__group_'))
          .map(x => (typeof x === 'object' && x !== null ? (x.id || x.value) : x));

        for (const gItem of groupItems) {
          const tipoId = gItem.replace('__group_', '');
          const group = availableGroups.value.find(g => String(g.tipoId) === String(tipoId));
          if (group) {
            const groupIds = group.availableUnitIds;
            const currentSet = new Set(currentClean.map(id => String(id)));
            const allSelected = groupIds.every(id => currentSet.has(String(id)));
            if (allSelected) {
              const removeSet = new Set(groupIds.map(id => String(id)));
              currentClean = currentClean.filter(id => !removeSet.has(String(id)));
            } else {
              const toAdd = groupIds.filter(id => !currentSet.has(String(id)));
              currentClean = [...currentClean, ...toAdd];
            }
          }
        }
        emit('update:modelValue', currentClean);
        return;
      }
    }
    emit('update:modelValue', val);
  }
});

const dropdownItems = computed(() => {
    const base = filteredUnidades.value || [];
    if (!props.enableBatchGroups || availableGroups.value.length === 0) {
        return base;
    }

    const groupItems = availableGroups.value.map(g => ({
        id: `__group_${g.tipoId}`,
        isGroup: true,
        groupTipoId: g.tipoId,
        nombre: g.label,
        sigla: 'GRUPO',
        codigo: `GRUPO-${g.tipoId}`,
        tipo_unidad: 'AGRUPACIÓN MACRO',
        count: g.totalCount,
        selectedCount: g.selectedCount,
        status: g.status,
        color: g.color,
        icon: g.icon,
        groupData: g
    }));

    return [...groupItems, ...base];
});

const autocompleteProps = computed(() => {
    if (props.type !== 'autocomplete') return {};
    return {
        clearable: true,
        chips: true,
        multiple: true,
        'closable-chips': true
    }
});

/**
 * Normaliza cadenas de texto eliminando acentos/diacríticos y espacios sobrantes.
 */
function normalizeText(str) {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

/**
 * Genera el título para visualización de cada unidad, prefijando la sigla si está disponible.
 */
function getUnitDisplayTitle(item) {
    if (!item) return '';
    if (item.isGroup) {
        return `[GRUPO] ${item.nombre} (${item.count} unidades)`;
    }
    const sigla = (item.sigla && item.sigla !== '-') ? String(item.sigla).trim() : '';
    const nombre = (item.nombre || item.denominacion || '').trim();
    if (sigla && sigla !== nombre) {
        return `[${sigla}] ${nombre}`;
    }
    return nombre;
}

/**
 * Mapeo de acrónimos / alias institucionales comunes en UMSA para búsqueda inteligente.
 */
const KNOWN_ALIASES = {
    dtic: ['147', 'tecnologias de informacion y comunicacion', 'dtaincn'],
    cepies: ['217', 'centro psicopedagogico y de investigacion en educacion superior', 'cpginens'],
    cides: ['218', 'posgrado en ciencias del desarrollo', 'pcd'],
    iifb: ['198', 'instituto de investigaciones farmaco bioquimicas', 'fcfb-inst-2'],
    seladis: ['113', 'instituto de servicios de laboratorio de diagnostico e investigacion en salud'],
    ieb: ['298', 'instituto de estudios bolivianos'],
    iideproq: ['263', 'instituto de investigacion y desarrollo de procesos quimicos'],
    ibba: ['227', 'instituto boliviano de biologia de altura'],
    fcpn: ['63', 'ciencias puras y naturales'],
    faadu: ['57', 'arquitectura artes diseno y urbanismo'],
    fcs: ['65', 'ciencias sociales'],
    fcef: ['59', 'ciencias economicas y financieras'],
    fcfb: ['60', 'ciencias farmaceuticas y bioquimicas'],
    fdcp: ['67', 'derecho y ciencias politicas'],
    fhce: ['69', 'humanidades y ciencias de la educacion'],
    fing: ['83', 'facultad de ingenieria'],
    fmed: ['70', 'facultad de medicina'],
    fo: ['72', 'facultad de odontologia'],
    fagro: ['56', 'facultad de agronomia'],
    ftec: ['73', 'facultad de tecnología'],
    fcg: ['61', 'facultad de ciencias geologicas']
};

/**
 * Filtro personalizado multi-campo e insensible a acentos/mayúsculas.
 * Permite buscar por nombre, sigla, código, alias institucional o macro-grupos.
 */
function customFilter(value, query, item) {
    if (!query) return true;
    const q = normalizeText(query);
    if (!q) return true;

    const raw = item?.raw || item || {};

    if (raw.isGroup) {
        const groupData = raw.groupData;
        const nombre = normalizeText(raw.nombre);
        const keywords = (groupData?.keywords || []).map(normalizeText).join(' ');
        const searchable = `${nombre} ${keywords} grupo agrupacion todas todos`;
        const tokens = q.split(/\s+/).filter(Boolean);
        return tokens.every(token => searchable.includes(token));
    }

    const nombre = normalizeText(raw.nombre || raw.denominacion);
    const sigla = normalizeText(raw.sigla);
    const codigo = normalizeText(raw.codigo);
    const idStr = String(raw.id || '');
    const title = normalizeText(value);

    let aliasBonus = '';
    for (const [alias, targets] of Object.entries(KNOWN_ALIASES)) {
        if (q.includes(alias)) {
            if (targets.some(t => idStr === t || nombre.includes(t) || sigla.includes(t))) {
                aliasBonus += ` ${q}`;
            }
        }
    }

    const searchable = `${sigla} ${codigo} ${nombre} ${title} ${aliasBonus}`;
    const tokens = q.split(/\s+/).filter(Boolean);

    return tokens.every(token => searchable.includes(token));
}
</script>

<template>
  <div class="select-all-unidades-wrapper">
    <!-- BARRA SUPERIOR DE ACCIONES RÁPIDAS (MACRO-GRUPOS) -->
    <div
      v-if="props.enableBatchGroups && availableGroups.length > 0"
      class="batch-groups-toolbar mb-2"
    >
      <div class="d-flex align-center justify-space-between mb-1">
        <span class="text-caption font-weight-bold text-indigo-darken-3 d-flex align-center">
          <v-icon size="15" color="indigo" class="mr-1">mdi-lightning-bolt</v-icon>
          Seleccionar grupo:
        </span>
        <span v-if="selectedCountTotal > 0" class="text-caption text-grey-darken-2 font-weight-medium">
          {{ selectedCountTotal }} seleccionada{{ selectedCountTotal > 1 ? 's' : '' }}
        </span>
      </div>

      <div class="d-flex flex-wrap align-center gap-1">
        <v-chip
          v-for="grp in mainQuickGroups"
          :key="'tb-' + grp.tipoId"
          size="small"
          :color="grp.status === 'all' ? 'success' : grp.status === 'partial' ? 'warning' : 'indigo'"
          :variant="grp.status === 'none' ? 'tonal' : 'flat'"
          class="font-weight-medium cursor-pointer"
          @click="toggleGroup(grp.tipoId)"
        >
          <v-icon start size="14">
            {{ grp.status === 'all' ? 'mdi-check-circle' : grp.status === 'partial' ? 'mdi-minus-circle' : 'mdi-plus-circle' }}
          </v-icon>
          {{ grp.shortLabel }} ({{ grp.selectedCount }}/{{ grp.totalCount }})
        </v-chip>

        <!-- Menú para grupos secundarios si existen -->
        <v-menu v-if="secondaryGroups.length > 0" location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-chip
              v-bind="menuProps"
              size="small"
              variant="outlined"
              color="indigo"
              class="font-weight-medium cursor-pointer"
            >
              <v-icon start size="14">mdi-dots-horizontal</v-icon>
              Más grupos
            </v-chip>
          </template>
          <v-list density="compact" class="py-1">
            <v-list-item
              v-for="grp in secondaryGroups"
              :key="'menu-' + grp.tipoId"
              @click="toggleGroup(grp.tipoId)"
            >
              <template #prepend>
                <v-icon
                  size="16"
                  :icon="grp.status === 'all' ? 'mdi-check-circle' : grp.status === 'partial' ? 'mdi-minus-circle' : 'mdi-plus-circle'"
                  :color="grp.status === 'all' ? 'success' : grp.status === 'partial' ? 'warning' : 'indigo'"
                />
              </template>
              <v-list-item-title class="text-caption font-weight-medium">
                {{ grp.label }}
              </v-list-item-title>
              <template #append>
                <span class="text-caption text-grey ml-2">({{ grp.selectedCount }}/{{ grp.totalCount }})</span>
              </template>
            </v-list-item>
          </v-list>
        </v-menu>

        <v-btn
          v-if="selectedCountTotal > 0"
          variant="text"
          density="compact"
          size="x-small"
          color="error"
          class="ml-auto"
          @click="clearAllSelection"
        >
          <v-icon size="14" start>mdi-close</v-icon>
          Limpiar todas
        </v-btn>
      </div>
    </div>

    <!-- AUTOCOMPLETE / SELECT -->
    <component 
        :is="props.type === 'autocomplete' ? 'v-autocomplete' : 'v-select'"
        v-model="value"
        :label="props.label || 'Unidades'" 
        :items="dropdownItems" 
        :item-title="getUnitDisplayTitle" 
        item-value="id" 
        variant="underlined" 
        :custom-filter="props.type === 'autocomplete' ? customFilter : undefined"
        v-bind="{ ...autocompleteProps, ...$attrs }"
        :loading="undadesAllUnidadesStore.loading"
    >
        <!-- Prepend-item en el menú desplegable -->
        <template v-if="props.enableBatchGroups && availableGroups.length > 0" #prepend-item>
            <div class="px-3 py-2 bg-indigo-lighten-5 border-b mb-1">
                <div class="d-flex align-center justify-space-between mb-1">
                    <span class="text-caption font-weight-bold text-indigo-darken-3 d-flex align-center">
                        <v-icon size="14" color="indigo" class="mr-1">mdi-layers-triple</v-icon>
                        Opciones de Agrupación (S-MAU)
                    </span>
                    <v-btn
                        v-if="selectedCountTotal > 0"
                        variant="text"
                        density="compact"
                        size="x-small"
                        color="error"
                        @click.stop="clearAllSelection"
                    >
                        Limpiar selecciones
                    </v-btn>
                </div>
                <div class="d-flex flex-wrap gap-1">
                    <v-chip
                        v-for="grp in mainQuickGroups"
                        :key="'prep-' + grp.tipoId"
                        size="x-small"
                        :color="grp.status === 'all' ? 'success' : grp.status === 'partial' ? 'warning' : 'indigo'"
                        :variant="grp.status === 'none' ? 'outlined' : 'flat'"
                        class="font-weight-medium cursor-pointer"
                        @click.stop="toggleGroup(grp.tipoId)"
                    >
                        <v-icon start size="12">
                            {{ grp.status === 'all' ? 'mdi-check' : grp.status === 'partial' ? 'mdi-minus' : 'mdi-plus' }}
                        </v-icon>
                        {{ grp.shortLabel }} ({{ grp.selectedCount }}/{{ grp.totalCount }})
                    </v-chip>
                </div>
            </div>
        </template>

        <!-- Item formateado en el menú desplegable -->
        <template #item="{ props: itemProps, item }">
            <!-- Si es un macro-grupo -->
            <template v-if="item.raw?.isGroup">
                <v-list-item
                    v-bind="itemProps"
                    :title="undefined"
                    :subtitle="undefined"
                    @click.stop="toggleGroup(item.raw.groupTipoId)"
                    class="batch-group-dropdown-item bg-indigo-lighten-5 my-1 mx-1 rounded-md"
                    density="compact"
                >
                    <template #prepend>
                        <v-icon
                            :icon="item.raw.status === 'all' ? 'mdi-checkbox-marked' : item.raw.status === 'partial' ? 'mdi-minus-box' : 'mdi-checkbox-blank-outline'"
                            :color="item.raw.status === 'all' ? 'success' : item.raw.status === 'partial' ? 'warning' : 'indigo'"
                            class="mr-2"
                        />
                    </template>
                    <template #title>
                        <div class="d-flex align-center justify-space-between font-weight-bold text-indigo-darken-3">
                            <div class="d-flex align-center">
                                <v-icon size="16" class="mr-1.5 text-indigo">
                                    {{ item.raw.icon || 'mdi-layers-triple' }}
                                </v-icon>
                                <span class="text-truncate">{{ item.raw.nombre }}</span>
                            </div>
                            <v-chip
                                size="x-small"
                                :color="item.raw.status === 'all' ? 'success' : item.raw.status === 'partial' ? 'warning' : 'indigo'"
                                variant="flat"
                                class="font-weight-bold ml-2 flex-shrink-0"
                            >
                                {{ item.raw.status === 'all' ? 'Todas seleccionadas' : item.raw.status === 'partial' ? `${item.raw.selectedCount}/${item.raw.count}` : `${item.raw.count} unidades` }}
                            </v-chip>
                        </div>
                    </template>
                    <template #subtitle>
                        <span class="text-caption text-indigo-darken-1">
                            {{ item.raw.status === 'all' ? 'Haz clic para deseleccionar todo el grupo' : 'Haz clic para seleccionar las ' + item.raw.count + ' unidades' }}
                        </span>
                    </template>
                </v-list-item>
            </template>

            <!-- Si es una unidad normal -->
            <template v-else>
                <v-list-item v-bind="itemProps" :title="undefined" :subtitle="undefined">
                    <template #title>
                        <div class="d-flex align-center gap-1 font-weight-medium text-body-2">
                            <v-chip
                                v-if="item.raw?.sigla && item.raw.sigla !== '-'"
                                size="x-small"
                                color="indigo-darken-1"
                                variant="tonal"
                                class="font-weight-bold flex-shrink-0 mr-1"
                            >
                                {{ item.raw.sigla }}
                            </v-chip>
                            <span class="text-truncate">{{ item.raw?.nombre || item.raw?.denominacion }}</span>
                        </div>
                    </template>
                    <template #subtitle v-if="item.raw?.codigo">
                        <span class="text-caption text-grey-darken-1 font-monospace">
                            Código: {{ item.raw.codigo }}
                        </span>
                    </template>
                </v-list-item>
            </template>
        </template>

        <!-- Chip formateado para selección múltiple -->
        <template v-if="props.type === 'autocomplete'" #chip="{ props: chipProps, item }">
            <v-chip
                v-if="!item.raw?.isGroup"
                v-bind="chipProps"
                size="small"
                color="indigo-darken-1"
                variant="tonal"
                class="ma-0-5"
            >
                <strong v-if="item.raw?.sigla && item.raw.sigla !== '-'" class="mr-1">
                    [{{ item.raw.sigla }}]
                </strong>
                <span class="text-truncate" style="max-width: 260px;">
                    {{ item.raw?.nombre || item.raw?.denominacion }}
                </span>
            </v-chip>
        </template>
    </component>
  </div>
</template>

<style scoped>
.select-all-unidades-wrapper :deep(.v-field__input) {
  max-height: 140px;
  overflow-y: auto;
}
.cursor-pointer {
  cursor: pointer;
}
.gap-1 {
  gap: 4px;
}
.batch-group-dropdown-item {
  cursor: pointer;
  transition: background-color 0.15s ease-in-out;
}
.batch-group-dropdown-item:hover {
  background-color: #e8eaf6 !important;
}
</style>
