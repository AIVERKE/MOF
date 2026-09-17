import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import HelpTooltip from "../HelpTooltip.vue";

const stubs = {
  "v-tooltip": {
    props: ["location", "maxWidth", "openOnHover", "openOnClick"],
    template: `<span class="v-tooltip"><slot /></span>`,
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
    expect(tooltip.text()).toContain(text);

    const icon = wrapper.find(".help-tooltip-icon");
    expect(icon.exists()).toBe(true);
    expect(icon.text()).toContain("mdi-help-circle-outline");

    const spanWrapper = wrapper.find(".help-tooltip-wrapper");
    expect(spanWrapper.attributes("title")).toBe(text);
  });
});
