<script setup>
import { computed } from "vue";
import { getHighlightSegments } from "@/utils/mofHelpers";

const props = defineProps({
  text: { type: [String, Number], default: "" },
  query: { type: String, default: "" },
});

const segments = computed(() =>
  getHighlightSegments(props.text, props.query),
);
</script>

<template>
  <span>
    <template v-for="(seg, i) in segments" :key="i">
      <mark v-if="seg.match" class="mof-highlight">{{ seg.text }}</mark>
      <template v-else>{{ seg.text }}</template>
    </template>
  </span>
</template>

<style scoped>
.mof-highlight {
  background-color: #ffeb3b;
  color: #000000 !important;
  font-weight: bold;
  border-radius: 2px;
  padding: 0 2px;
}
</style>
