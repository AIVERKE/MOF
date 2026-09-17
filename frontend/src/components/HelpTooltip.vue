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
  <v-tooltip :location="location" :text="text" :max-width="maxWidth">
    <template #activator="{ props: tipProps }">
      <v-icon
        v-bind="tipProps"
        :size="size"
        :color="color"
        class="ml-1 cursor-pointer help-tooltip-icon"
        tabindex="-1"
        role="button"
        aria-label="Ayuda conceptual"
        @click.stop.prevent
      >
        mdi-help-circle-outline
      </v-icon>
    </template>
  </v-tooltip>
</template>

<style scoped>
.help-tooltip-icon {
  opacity: 0.75;
  transition: opacity 0.2s ease, transform 0.2s ease;
  vertical-align: middle;
}
.help-tooltip-icon:hover {
  opacity: 1;
  transform: scale(1.15);
}
</style>
