<script setup>
import { computed, onMounted, watch, ref } from 'vue';
import { useAllUnidadesMofStore } from '../../../stores/unidades_mof';

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
    }
});

const emit = defineEmits(['update:modelValue']);

const undadesAllUnidadesStore = useAllUnidadesMofStore();
const updateKey = ref(0);

const value = computed({
  get() {
    return props.modelValue;
  },
  set(val) {
    emit('update:modelValue', val);
  }
});

onMounted(async () => {
    if (undadesAllUnidadesStore.unidades.length === 0) {
        await undadesAllUnidadesStore.getFetchUnidades();
    }
});

// Fuerza re-render cuando props.items cambia
watch(() => props.items, () => {
    updateKey.value++;
});

const filteredUnidades = computed(() => {
    updateKey.value; // Hacer que dependa del watcher
    const list = props.items || undadesAllUnidadesStore.unidades;
    if (props.excludeId) {
        return list.filter(u => String(u.id) !== String(props.excludeId));
    }
    return list;
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
 * Permite buscar por nombre, sigla, código o alias institucional.
 */
function customFilter(value, query, item) {
    if (!query) return true;
    const q = normalizeText(query);
    if (!q) return true;

    const raw = item?.raw || item || {};
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
    <component 
        :is="props.type === 'autocomplete' ? 'v-autocomplete' : 'v-select'"
        v-model="value"
        :label="props.label || 'Unidades'" 
        :items="filteredUnidades" 
        :item-title="getUnitDisplayTitle" 
        item-value="id" 
        variant="underlined" 
        :custom-filter="props.type === 'autocomplete' ? customFilter : undefined"
        v-bind="{ ...autocompleteProps, ...$attrs }"
        :loading="undadesAllUnidadesStore.loading"
    >
        <!-- Item formateado en el menú desplegable -->
        <template #item="{ props: itemProps, item }">
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

        <!-- Chip formateado para selección múltiple -->
        <template v-if="props.type === 'autocomplete'" #chip="{ props: chipProps, item }">
            <v-chip
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
</template>
