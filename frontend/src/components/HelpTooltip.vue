<script setup>
defineProps({
  text: {
    type: String,
    required: true,
  },
  size: {
    type: [Number, String],
    default: 15,
  },
  color: {
    type: String,
    default: "primary",
  },
  location: {
    type: String,
    default: "top",
  },
  maxWidth: {
    type: [Number, String],
    default: 320,
  },
});
</script>

<template>
  <span
    class="help-tooltip-wrapper ml-1"
    :title="text"
    @click.stop.prevent
  >
    <v-icon
      :size="size"
      :color="color"
      class="help-tooltip-icon"
      tabindex="0"
      role="button"
      aria-label="Ayuda conceptual"
    >
      mdi-help-circle-outline
      <v-tooltip
        activator="parent"
        :location="location"
        :max-width="maxWidth"
        open-on-hover
        open-on-click
      >
        {{ text }}
      </v-tooltip>
    </v-icon>
  </span>
</template>

<style scoped>
.help-tooltip-wrapper {
  display: inline-flex;
  align-items: center;
  pointer-events: auto !important;
  cursor: pointer !important;
  user-select: none;
}
.help-tooltip-icon {
  opacity: 0.85;
  transition: opacity 0.2s ease, transform 0.2s ease;
  vertical-align: middle;
  pointer-events: auto !important;
  cursor: pointer !important;
}
.help-tooltip-icon:hover {
  opacity: 1;
  transform: scale(1.18);
}
</style>
