import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import HelpTooltip from "../HelpTooltip.vue";

const stubs = {
  "v-tooltip": {
    props: ["location", "text", "maxWidth"],
    template: `<span class="v-tooltip" :data-text="text"><slot /><slot name="activator" :props="{ 'aria-describedby': 'tip' }" /></span>`,
  },
  "v-icon": {
    props: ["size", "color"],
    template: `<i class="v-icon" v-bind="$attrs"><slot /></i>`,
  },
};

describe("HelpTooltip component", () => {
  it("renderiza el tooltip con el texto correspondiente y el icono mdi-help-circle-outline", () => {
    const text = "Explicación conceptual de prueba";
    const wrapper = mount(HelpTooltip, {
      props: { text },
      global: { stubs },
    });

    const tooltip = wrapper.find(".v-tooltip");
    expect(tooltip.exists()).toBe(true);
    expect(tooltip.attributes("data-text")).toBe(text);

    const icon = wrapper.find(".help-tooltip-icon");
    expect(icon.exists()).toBe(true);
    expect(icon.text()).toContain("mdi-help-circle-outline");
  });
});
