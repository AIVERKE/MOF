<script setup>
import { computed } from "vue";
import { useTheme } from "vuetify";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    default: "Cargando...",
  },
  submessage: {
    type: String,
    default: "",
  },
  contained: {
    type: Boolean,
    default: true,
  },
  scrim: {
    type: [String, Boolean],
    default: true,
  },
});

const theme = useTheme();
const isDark = computed(() => theme.global.current.value.dark);
</script>

<template>
  <v-overlay
    :model-value="modelValue"
    :contained="contained"
    :scrim="scrim"
    class="align-center justify-center mof-loading-overlay"
    persistent
    no-click-animation
  >
    <div
      class="d-flex flex-column align-center justify-center pa-6 rounded-xl elevation-6 mof-loading-card"
      :class="isDark ? 'bg-grey-darken-4 text-white' : 'bg-white text-slate-800'"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <v-progress-circular
        indeterminate
        color="primary"
        size="52"
        width="5"
        class="mb-3"
      />
      <span class="text-subtitle-1 font-weight-bold text-center px-2">
        {{ message }}
      </span>
      <span
        v-if="submessage"
        class="text-caption text-medium-emphasis mt-1 text-center px-2"
      >
        {{ submessage }}
      </span>
    </div>
  </v-overlay>
</template>

<style scoped>
.mof-loading-overlay {
  z-index: 100 !important;
}

.mof-loading-card {
  min-width: 220px;
  max-width: 380px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  animation: fadeInOverlay 0.18s ease-in-out;
}

@keyframes fadeInOverlay {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
