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
</script>

<template>
    <component 
        :is="props.type === 'autocomplete' ? 'v-autocomplete' : 'v-select'"
        v-model="value"
        :label="props.label || 'Unidades'" 
        :items="filteredUnidades" 
        item-title="nombre" 
        item-value="id" 
        variant="underlined" 
        v-bind="autocompleteProps"
        :loading="undadesAllUnidadesStore.loading"
    />
</template>
