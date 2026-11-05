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
    placeholder: {
        type: String,
        default: 'Buscar por nombre, sigla o código de unidad...'
    },
    variant: {
        type: String,
        default: null
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
    },
    allowCustomText: {
        type: Boolean,
        default: false
    },
    customTexts: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['update:modelValue', 'update:customTexts']);

const undadesAllUnidadesStore = useAllUnidadesMofStore();
const clasesStore = useAllClasesMofStore();
const updateKey = ref(0);
const search = ref('');

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

/** Agrupaciones por Tipo funcional (catálogo de tipos), identificadas por su descripción. */
const PRESET_TIPO_GROUPS = {
    ADMINISTRATIVO: { label: 'Todas las Unidades Administrativas', shortLabel: 'Administrativas', icon: 'mdi-briefcase', order: 2.5 },
    'SUSTANTIVO (ACADEMICO)': { label: 'Todas las Unidades Sustantivas (Académicas)', shortLabel: 'Sustantivas', icon: 'mdi-school-outline', order: 100 },
    ASESORAMIENTO: { label: 'Todas las Unidades de Asesoramiento', shortLabel: 'Asesoramiento', icon: 'mdi-account-voice', order: 100 },
};

function getPresetForTipo(descripcion) {
    const key = normalizeText(descripcion).toUpperCase();
    return PRESET_TIPO_GROUPS[key] || null;
}

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
            key: String(tipoId),
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

    const mapByTipoFuncional = new Map();
    for (const u of currentUnits) {
        const nombre = String(u.tipo || '').trim();
        if (!nombre) continue;
        if (!mapByTipoFuncional.has(nombre)) mapByTipoFuncional.set(nombre, []);
        mapByTipoFuncional.get(nombre).push(u);
    }

    for (const [nombre, units] of mapByTipoFuncional.entries()) {
        const preset = getPresetForTipo(nombre);
        const availableUnitIds = units.map(u => Number(u.id));
        const totalCount = availableUnitIds.length;
        const selectedCount = availableUnitIds.filter(id => currentSelectedSet.has(String(id))).length;

        groups.push({
            key: `tipo:${nombre}`,
            tipoId: null,
            rawName: nombre,
            label: preset?.label || `Todas las unidades de tipo ${nombre}`,
            shortLabel: preset?.shortLabel || nombre,
            icon: preset?.icon || 'mdi-shape-outline',
            order: preset?.order || 100,
            color: '#3F51B5',
            keywords: [normalizeText(nombre)],
            availableUnitIds,
            totalCount,
            selectedCount,
            status: selectedCount === totalCount ? 'all' : selectedCount > 0 ? 'partial' : 'none',
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

const selectedCountSummary = computed(() => {
    const units = Array.isArray(props.modelValue) ? props.modelValue.length : 0;
    const texts = props.allowCustomText && Array.isArray(props.customTexts) ? props.customTexts.length : 0;
    if (units > 0 && texts > 0) {
        return `${units} unidad${units > 1 ? 'es' : ''}, ${texts} texto${texts > 1 ? 's' : ''}`;
    }
    if (texts > 0) {
        return `${texts} texto${texts > 1 ? 's' : ''} libre${texts > 1 ? 's' : ''}`;
    }
    if (units > 0) {
        return `${units} unidad${units > 1 ? 'es' : ''} seleccionada${units > 1 ? 's' : ''}`;
    }
    return '';
});

/**
 * Alterna la selección de todo un grupo (tri-state: si todos están seleccionados, los deselecciona; si no, selecciona los faltantes).
 */
function toggleGroup(groupKey) {
    const group = availableGroups.value.find(g => g.key === String(groupKey));
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
    search.value = '';
}

const CONFIRM_CLEAR_THRESHOLD = 10;

function clearAllSelection() {
    const total = selectedCountTotal.value + (props.allowCustomText && Array.isArray(props.customTexts) ? props.customTexts.length : 0);
    if (
        total > CONFIRM_CLEAR_THRESHOLD &&
        !window.confirm(`¿Quitar los ${total} elementos seleccionados?`)
    ) {
        return;
    }
    value.value = [];
    if (props.allowCustomText) {
        emit('update:customTexts', []);
    }
}

const customTextKeys = computed(() => {
    if (!props.allowCustomText || !Array.isArray(props.customTexts)) return [];
    return props.customTexts.map((_, idx) => `__custom_${idx}`);
});

const value = computed({
  get() {
    if (!props.allowCustomText) {
      return props.modelValue;
    }
    const currentUnits = Array.isArray(props.modelValue) ? props.modelValue : [];
    return [...currentUnits, ...customTextKeys.value];
  },
  set(val) {
    if (Array.isArray(val)) {
      const groupItems = val.filter(x => typeof x === 'string' && x.startsWith('__group_'));
      if (groupItems.length > 0) {
        let currentClean = val
          .filter(x => typeof x !== 'string' || (!x.startsWith('__group_') && !x.startsWith('__custom_')))
          .map(x => (typeof x === 'object' && x !== null ? (x.id || x.value) : x));

        for (const gItem of groupItems) {
          const groupKey = gItem.replace('__group_', '');
          const group = availableGroups.value.find(g => g.key === groupKey);
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
        search.value = '';
        return;
      }

      if (props.allowCustomText) {
        const remainingCustomKeys = new Set(
          val.filter(x => typeof x === 'string' && x.startsWith('__custom_'))
        );
        const currentCustomList = props.customTexts || [];
        const nextCustomList = currentCustomList.filter((_, idx) =>
          remainingCustomKeys.has(`__custom_${idx}`)
        );
        if (nextCustomList.length !== currentCustomList.length) {
          emit('update:customTexts', nextCustomList);
        }

        const remainingUnitIds = val
          .filter(x => typeof x !== 'string' || !x.startsWith('__custom_'))
          .map(x => (typeof x === 'object' && x !== null ? (x.id || x.value) : x));
        emit('update:modelValue', remainingUnitIds);
        return;
      }
    }
    emit('update:modelValue', val);
  }
});

const customDropdownItems = computed(() => {
    if (!props.allowCustomText || !Array.isArray(props.customTexts)) return [];
    return props.customTexts.map((ct, idx) => {
        const desc = typeof ct === 'object' && ct !== null ? ct.descripcion : String(ct);
        return {
            id: `__custom_${idx}`,
            isCustomText: true,
            customIndex: idx,
            nombre: desc,
            descripcion: desc,
            sigla: 'TEXTO',
            codigo: '',
        };
    });
});

const dropdownItems = computed(() => {
    const base = filteredUnidades.value || [];
    const custom = customDropdownItems.value;
    if (!props.enableBatchGroups || availableGroups.value.length === 0) {
        return [...custom, ...base];
    }

    const groupItems = availableGroups.value.map(g => ({
        id: `__group_${g.key}`,
        isGroup: true,
        groupKey: g.key,
        nombre: g.label,
        sigla: 'GRUPO',
        codigo: `GRUPO-${g.key}`,
        tipo_unidad: 'AGRUPACIÓN MACRO',
        count: g.totalCount,
        selectedCount: g.selectedCount,
        status: g.status,
        color: g.color,
        icon: g.icon,
        groupData: g
    }));

    return [...custom, ...groupItems, ...base];
});

const autocompleteProps = computed(() => {
    if (props.type !== 'autocomplete') return {};
    return {
        // Con grupos, el borrado total pasa por "Limpiar todas" (con confirmación).
        clearable: !props.enableBatchGroups,
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
    ftec: ['73', 'facultad de tecnologia'],
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

    if (raw.isCustomText) {
        return false;
    }

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

function addCurrentSearchAsCustomText() {
    const text = (search.value || '').trim();
    if (!text) return;

    // Verificar si coincide con una unidad del catálogo
    const exactUnit = (filteredUnidades.value || []).find(
        u => normalizeText(u.nombre) === normalizeText(text) || (u.sigla && normalizeText(u.sigla) === normalizeText(text))
    );
    if (exactUnit) {
        const current = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
        if (!current.some(id => String(id) === String(exactUnit.id))) {
            current.push(Number(exactUnit.id));
            emit('update:modelValue', current);
        }
        search.value = '';
        return;
    }

    // Agregar como texto libre
    const currentList = Array.isArray(props.customTexts) ? props.customTexts : [];
    const yaExiste = currentList.some(ct => {
        const desc = typeof ct === 'object' && ct !== null ? ct.descripcion : String(ct);
        return normalizeText(desc) === normalizeText(text);
    });
    if (!yaExiste) {
        emit('update:customTexts', [...currentList, { descripcion: text }]);
    }
    search.value = '';
}

function removeCustomText(index) {
    const currentList = Array.isArray(props.customTexts) ? [...props.customTexts] : [];
    if (index >= 0 && index < currentList.length) {
        currentList.splice(index, 1);
        emit('update:customTexts', currentList);
    }
}

function updateCustomText(index, newText) {
    const text = (newText || '').trim();
    if (!text) return;
    const currentList = Array.isArray(props.customTexts) ? [...props.customTexts] : [];
    if (index >= 0 && index < currentList.length) {
        const item = currentList[index];
        if (typeof item === 'object' && item !== null) {
            currentList[index] = { ...item, descripcion: text };
        } else {
            currentList[index] = { descripcion: text };
        }
        emit('update:customTexts', currentList);
    }
}

function handleInputKeydown(e) {
    if (!props.allowCustomText) return;
    if (e.key === 'Enter') {
        const text = (search.value || '').trim();
        if (text) {
            addCurrentSearchAsCustomText();
            e.preventDefault();
            e.stopPropagation();
        }
    }
}
</script>

<template>
  <div class="select-all-unidades-wrapper">
    <!-- ETIQUETA EXTERNA (Previene cualquier solapamiento de label con chips en selección múltiple) -->
    <div
      v-if="props.label && props.enableBatchGroups"
      class="select-all-label d-flex align-center justify-space-between mb-1"
    >
      <span class="text-caption font-weight-bold text-grey-darken-3">
        {{ props.label }}
      </span>
      <span v-if="selectedCountTotal > 0 || (props.allowCustomText && props.customTexts?.length > 0)" class="text-caption font-weight-bold text-indigo-darken-2">
        {{ selectedCountSummary }}
      </span>
    </div>

    <!-- BARRA SUPERIOR DE ACCIONES RÁPIDAS (BOTONES DE MACRO-GRUPOS CON ALTO CONTRASTE) -->
    <div
      v-if="props.enableBatchGroups && availableGroups.length > 0"
      class="batch-groups-toolbar mb-2"
    >
      <div class="d-flex align-center justify-space-between mb-1">
        <span class="text-caption font-weight-bold text-indigo-darken-3 d-flex align-center">
          <v-icon size="15" color="indigo" class="mr-1">mdi-lightning-bolt</v-icon>
          Seleccionar grupo:
        </span>
      </div>

      <div class="d-flex flex-wrap align-center gap-1">
        <button
          v-for="grp in mainQuickGroups"
          :key="'tb-' + grp.key"
          type="button"
          :class="['batch-group-btn', `batch-group-btn--${grp.status}`]"
          @click="toggleGroup(grp.key)"
        >
          <v-icon size="15" class="mr-1">
            {{ grp.status === 'all' ? 'mdi-check-circle' : grp.status === 'partial' ? 'mdi-minus-circle' : 'mdi-plus-circle' }}
          </v-icon>
          <span>{{ grp.shortLabel }}</span>
          <span class="batch-group-btn__count">
            ({{ grp.selectedCount }}/{{ grp.totalCount }})
          </span>
        </button>

        <!-- Menú para grupos secundarios si existen -->
        <v-menu v-if="secondaryGroups.length > 0" location="bottom end">
          <template #activator="{ props: menuProps }">
            <button
              v-bind="menuProps"
              type="button"
              class="batch-group-btn batch-group-btn--more"
            >
              <v-icon size="15" class="mr-1">mdi-dots-horizontal</v-icon>
              <span>Más grupos</span>
            </button>
          </template>
          <v-list density="compact" class="py-1">
            <v-list-item
              v-for="grp in secondaryGroups"
              :key="'menu-' + grp.key"
              @click="toggleGroup(grp.key)"
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

        <button
          v-if="selectedCountTotal > 0"
          type="button"
          class="batch-group-clear-btn"
          @click="clearAllSelection"
        >
          <v-icon size="13" class="mr-1">mdi-close-circle-outline</v-icon>
          Limpiar todas
        </button>
      </div>
    </div>

    <!-- AUTOCOMPLETE / SELECT -->
    <component 
        :is="props.type === 'autocomplete' ? 'v-autocomplete' : 'v-select'"
        v-model="value"
        v-model:search="search"
        :label="props.enableBatchGroups ? undefined : (props.label || 'Unidades')" 
        :placeholder="props.enableBatchGroups ? (props.placeholder || 'Buscar por nombre, sigla o código...') : undefined"
        :items="dropdownItems" 
        :item-title="getUnitDisplayTitle" 
        item-value="id" 
        :variant="props.variant || (props.enableBatchGroups ? 'outlined' : 'underlined')" 
        density="comfortable"
        :custom-filter="props.type === 'autocomplete' ? customFilter : undefined"
        v-bind="{ ...autocompleteProps, ...$attrs }"
        :loading="undadesAllUnidadesStore.loading"
        @keydown="handleInputKeydown"
    >
        <!-- Encabezado de Agrupaciones o banner de texto libre dentro del menú desplegable -->
        <template v-if="(props.allowCustomText && search?.trim()) || (props.enableBatchGroups && availableGroups.length > 0)" #prepend-item>
            <!-- Opción para agregar como texto libre cuando el usuario escribe -->
            <div
                v-if="props.allowCustomText && search?.trim()"
                class="batch-dropdown-header px-3 py-2 bg-indigo-lighten-5 border-b d-flex align-center justify-space-between cursor-pointer"
                @mousedown.prevent="addCurrentSearchAsCustomText"
            >
                <span class="text-caption font-weight-bold text-indigo-darken-3 d-flex align-center">
                    <v-icon size="16" color="indigo" class="mr-1.5">mdi-text-box-plus-outline</v-icon>
                    Presiona Enter o clic para agregar texto libre:
                    <strong class="text-primary font-italic ml-1">"{{ search.trim() }}"</strong>
                </span>
                <v-btn size="x-small" color="indigo" variant="flat" class="ml-2 flex-shrink-0">
                    + Agregar
                </v-btn>
            </div>

            <!-- Encabezado de Agrupaciones dentro del menú desplegable -->
            <div
                v-if="props.enableBatchGroups && availableGroups.length > 0"
                class="batch-dropdown-header px-3 py-2 bg-indigo-lighten-5 border-b d-flex align-center justify-space-between"
            >
                <span class="text-caption font-weight-bold text-indigo-darken-3 d-flex align-center">
                    <v-icon size="15" color="indigo" class="mr-1.5">mdi-layers-triple</v-icon>
                    Agrupaciones Rápidas (S-MAU)
                </span>
                <span class="text-caption text-indigo-darken-2">
                    Clic para seleccionar / deseleccionar grupo completo
                </span>
            </div>
        </template>

        <!-- No-data slot cuando allowCustomText está activo -->
        <template v-if="props.allowCustomText && search?.trim()" #no-data>
            <div
                class="pa-3 text-center cursor-pointer hover:bg-slate-50 d-flex flex-column align-center"
                @mousedown.prevent="addCurrentSearchAsCustomText"
            >
                <v-icon size="24" color="indigo" class="mb-1">mdi-text-box-plus-outline</v-icon>
                <div class="text-caption font-weight-bold text-indigo-darken-3">
                    No se encontró en catálogo. Presiona Enter o clic para agregar como texto libre:
                </div>
                <div class="text-caption text-slate-800 font-italic mt-0.5">
                    "{{ search.trim() }}"
                </div>
            </div>
        </template>

        <!-- Botón rápido en append-inner para agregar texto libre -->
        <template v-if="props.allowCustomText && search?.trim()" #append-inner>
            <v-tooltip text="Agregar como texto libre (Enter)" location="top">
                <template #activator="{ props: tipProps }">
                    <v-btn
                        v-bind="tipProps"
                        size="x-small"
                        color="indigo"
                        variant="tonal"
                        class="mr-1 text-caption font-weight-bold"
                        @mousedown.prevent="addCurrentSearchAsCustomText"
                    >
                        <v-icon start size="14">mdi-plus</v-icon>
                        Texto libre
                    </v-btn>
                </template>
            </v-tooltip>
        </template>

        <!-- Item formateado en el menú desplegable -->
        <template #item="{ props: itemProps, item }">
            <!-- Si es un macro-grupo -->
            <template v-if="item.raw?.isGroup">
                <div
                    class="batch-group-menu-row"
                    :class="{
                        'batch-group-menu-row--all': item.raw.status === 'all',
                        'batch-group-menu-row--partial': item.raw.status === 'partial'
                    }"
                    @click.stop="toggleGroup(item.raw.groupKey)"
                >
                    <div class="d-flex align-center flex-grow-1 mr-2">
                        <v-icon
                            size="20"
                            :icon="item.raw.status === 'all' ? 'mdi-checkbox-marked' : item.raw.status === 'partial' ? 'mdi-minus-box' : 'mdi-checkbox-blank-outline'"
                            :color="item.raw.status === 'all' ? 'success' : item.raw.status === 'partial' ? 'warning' : 'indigo'"
                            class="mr-2.5 flex-shrink-0"
                        />
                        <div class="d-flex flex-column">
                            <div class="font-weight-bold text-body-2 text-indigo-darken-4 d-flex align-center">
                                <v-icon size="15" class="mr-1 text-indigo flex-shrink-0">
                                    {{ item.raw.icon || 'mdi-layers-triple' }}
                                </v-icon>
                                <span>{{ item.raw.nombre }}</span>
                            </div>
                            <span class="text-caption text-grey-darken-1">
                                {{ item.raw.status === 'all' ? 'Todas seleccionadas • Clic para quitar' : 'Clic para seleccionar las ' + item.raw.count + ' unidades' }}
                            </span>
                        </div>
                    </div>

                    <v-chip
                        size="small"
                        :color="item.raw.status === 'all' ? 'success' : item.raw.status === 'partial' ? 'warning' : 'indigo-darken-1'"
                        :variant="item.raw.status === 'none' ? 'tonal' : 'flat'"
                        class="font-weight-bold flex-shrink-0"
                    >
                        {{ item.raw.status === 'all' ? `${item.raw.count}/${item.raw.count} ✓` : item.raw.status === 'partial' ? `${item.raw.selectedCount}/${item.raw.count}` : `${item.raw.count} unidades` }}
                    </v-chip>
                </div>
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
            <!-- Si es texto libre -->
            <v-chip
                v-if="item.raw?.isCustomText"
                v-bind="chipProps"
                size="small"
                color="blue-grey-darken-2"
                variant="tonal"
                class="ma-0-5"
                closable
                @click:close.stop="removeCustomText(item.raw.customIndex)"
            >
                <v-icon start size="14" color="blue-grey-darken-2">mdi-text-box-outline</v-icon>
                <span class="text-truncate" style="max-width: 240px;">
                    {{ item.raw.descripcion }}
                </span>
                <v-icon end size="13" class="ml-1 cursor-pointer" color="blue-grey-darken-1">
                    mdi-pencil
                </v-icon>
                <v-tooltip activator="parent" location="top">
                    Texto libre: {{ item.raw.descripcion }} (clic para editar)
                </v-tooltip>

                <!-- Menú popover para edición rápida al hacer clic en el chip -->
                <v-menu activator="parent" location="bottom start" :close-on-content-click="false">
                    <template #default="{ isActive }">
                        <v-card min-width="280" class="pa-3 elevation-4">
                            <div class="text-caption font-weight-bold text-slate-700 mb-2 d-flex align-center">
                                <v-icon size="14" color="primary" class="mr-1">mdi-pencil</v-icon>
                                Editar texto libre
                            </div>
                            <v-text-field
                                :model-value="item.raw.descripcion"
                                density="compact"
                                variant="outlined"
                                autofocus
                                hide-details
                                class="mb-2"
                                @keydown.enter.prevent="(e) => { updateCustomText(item.raw.customIndex, e.target.value); isActive.value = false; }"
                            />
                            <div class="d-flex justify-end gap-1">
                                <v-btn size="x-small" variant="text" color="grey" @click="isActive.value = false">
                                    Cancelar
                                </v-btn>
                                <v-btn
                                    size="x-small"
                                    color="primary"
                                    variant="flat"
                                    @click="(e) => {
                                        const input = e.target.closest('.v-card').querySelector('input');
                                        if (input && input.value.trim()) {
                                            updateCustomText(item.raw.customIndex, input.value);
                                            isActive.value = false;
                                        }
                                    }"
                                >
                                    Guardar
                                </v-btn>
                            </div>
                        </v-card>
                    </template>
                </v-menu>
            </v-chip>

            <!-- Si es una unidad normal -->
            <v-chip
                v-else-if="!item.raw?.isGroup"
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
  max-height: 130px;
  overflow-y: auto;
  padding-top: 6px !important;
  padding-bottom: 6px !important;
}
.cursor-pointer {
  cursor: pointer;
}
.gap-1 {
  gap: 6px;
}

/* BOTONES DE GRUPO SUPERIOR - ALTA VISIBILIDAD Y CONTRASTE */
.batch-group-btn {
  display: inline-flex;
  align-items: center;
  padding: 5px 11px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease-in-out;
  border: 1.5px solid transparent;
  user-select: none;
  line-height: 1.3;
}

/* Estado NONE (0 seleccionadas): Fondo azul suave, borde nítido, texto índigo oscuro */
.batch-group-btn--none {
  background-color: #eef2ff;
  border-color: #c7d2fe;
  color: #3730a3;
}
.batch-group-btn--none:hover {
  background-color: #e0e7ff;
  border-color: #818cf8;
  color: #1e1b4b;
  transform: translateY(-1px);
}

/* Estado ALL (todas seleccionadas): Verde sólido brillante, texto blanco, check */
.batch-group-btn--all {
  background-color: #16a34a;
  border-color: #15803d;
  color: #ffffff;
  box-shadow: 0 1px 3px rgba(22, 163, 74, 0.35);
}
.batch-group-btn--all:hover {
  background-color: #15803d;
  color: #ffffff;
}

/* Estado PARTIAL (algunas seleccionadas): Ámbar/Naranja brillante */
.batch-group-btn--partial {
  background-color: #f59e0b;
  border-color: #d97706;
  color: #ffffff;
  box-shadow: 0 1px 3px rgba(245, 158, 11, 0.35);
}
.batch-group-btn--partial:hover {
  background-color: #d97706;
  color: #ffffff;
}

.batch-group-btn__count {
  margin-left: 4px;
  opacity: 0.92;
  font-size: 11px;
}

/* Botón Más grupos */
.batch-group-btn--more {
  background-color: #f1f5f9;
  border-color: #cbd5e1;
  color: #334155;
}
.batch-group-btn--more:hover {
  background-color: #e2e8f0;
  border-color: #94a3b8;
  color: #0f172a;
}

/* Botón Limpiar todas */
.batch-group-clear-btn {
  display: inline-flex;
  align-items: center;
  background: none;
  border: none;
  color: #dc2626;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 3px 8px;
  border-radius: 4px;
  margin-left: auto;
  transition: background-color 0.15s;
}
.batch-group-clear-btn:hover {
  background-color: #fee2e2;
  color: #b91c1c;
}

/* FILAS DE MACRO-GRUPOS DENTRO DEL MENÚ DESPLEGABLE */
.batch-group-menu-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  margin: 3px 6px;
  border-radius: 8px;
  background-color: #f8faff;
  border: 1px solid #e0e7ff;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}
.batch-group-menu-row:hover {
  background-color: #eef2ff;
  border-color: #c7d2fe;
}
.batch-group-menu-row--all {
  background-color: #f0fdf4;
  border-color: #bbf7d0;
}
.batch-group-menu-row--all:hover {
  background-color: #dcfce7;
  border-color: #86efac;
}
.batch-group-menu-row--partial {
  background-color: #fffbeb;
  border-color: #fde68a;
}
.batch-group-menu-row--partial:hover {
  background-color: #fef3c7;
  border-color: #fcd34d;
}
</style>
