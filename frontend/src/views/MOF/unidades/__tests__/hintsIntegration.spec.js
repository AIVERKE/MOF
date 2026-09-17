import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { hints } from "@/config/hints";

import SelectAllClases from "@/views/MOF/clases/SelectAllClases.vue";
import SelectAllNiveles from "@/views/MOF/niveles/SelectAllNiveles.vue";
import SelectAllTipos from "@/views/MOF/tipos/SelectAllTipos.vue";
import SelectAllRelaciones from "@/views/MOF/relaciones/SelectAllRelaciones.vue";
import SelectAllCargos from "@/views/MOF/cargos/SelectAllCargos.vue";
import UnidadDependencyDialog from "@/views/MOF/unidades/UnidadDependencyDialog.vue";

const stubs = {
  "v-autocomplete": {
    props: ["hint", "persistentHint", "label", "items"],
    template: `
      <div class="v-autocomplete-stub" :data-hint="hint" :data-persistent-hint="persistentHint" :data-label="label">
        <slot name="label" />
      </div>
    `,
  },
  "v-text-field": {
    props: ["hint", "persistentHint", "label", "modelValue"],
    template: `
      <div class="v-text-field-stub" :data-hint="hint" :data-persistent-hint="persistentHint" :data-label="label">
        <slot name="label" />
      </div>
    `,
  },
  "v-textarea": {
    props: ["hint", "persistentHint", "label", "modelValue"],
    template: `
      <div class="v-textarea-stub" :data-hint="hint" :data-persistent-hint="persistentHint" :data-label="label">
        <slot name="label" />
      </div>
    `,
  },
  "v-dialog": { template: `<div class="v-dialog-stub"><slot /></div>` },
  "v-card": { template: `<div class="v-card-stub"><slot /></div>` },
  "v-card-title": { template: `<div class="v-card-title-stub"><slot /></div>` },
  "v-card-text": { template: `<div class="v-card-text-stub"><slot /></div>` },
  "v-card-actions": { template: `<div class="v-card-actions-stub"><slot /></div>` },
  "v-divider": { template: `<hr />` },
  "v-alert": { template: `<div class="v-alert-stub"><slot /></div>` },
  "v-row": { template: `<div class="v-row-stub"><slot /></div>` },
  "v-col": { template: `<div class="v-col-stub"><slot /></div>` },
  "v-btn": { template: `<button><slot /></button>` },
  "v-switch": { template: `<input type="checkbox" />` },
  "v-checkbox": { template: `<input type="checkbox" />` },
  "v-checkbox-btn": { template: `<input type="checkbox" />` },
  "v-spacer": { template: `<div />` },
  "v-avatar": { template: `<div class="v-avatar"><slot /></div>` },
  "v-icon": { template: `<i class="v-icon"><slot /></i>` },
  "v-tooltip": {
    template: `<span class="v-tooltip"><slot /><slot name="activator" :props="{}" /></span>`,
  },
  "v-list-item": {
    template: `<div><slot /><slot name="prepend" /><slot name="title" /></div>`,
  },
  "v-list-item-title": { template: `<div><slot /></div>` },
  "v-menu": { template: `<div><slot /></div>` },
  "v-color-picker": { template: `<div><slot /></div>` },
  SelectAllUnidades: {
    props: ["hint", "persistentHint", "label", "modelValue"],
    template: `
      <div class="select-unidades-stub" :data-hint="hint" :data-persistent-hint="persistentHint" :data-label="label">
        <slot />
      </div>
    `,
  },
};

describe("hintsIntegration - Catálogos y Diálogos", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  it("SelectAllClases provee hint y tooltip conceptual de clase", () => {
    const wrapper = mount(SelectAllClases, {
      global: { stubs },
    });
    const autocomplete = wrapper.find(".v-autocomplete-stub");
    expect(autocomplete.exists()).toBe(true);
    expect(autocomplete.attributes("data-hint")).toBe(hints.clases.select);
    expect(autocomplete.attributes("data-persistent-hint")).toBe("false");
    expect(wrapper.html()).toContain("mdi-help-circle-outline");
  });

  it("SelectAllNiveles provee hint y tooltip conceptual de nivel", () => {
    const wrapper = mount(SelectAllNiveles, {
      global: { stubs },
    });
    const autocomplete = wrapper.find(".v-autocomplete-stub");
    expect(autocomplete.exists()).toBe(true);
    expect(autocomplete.attributes("data-hint")).toBe(hints.niveles.select);
    expect(autocomplete.attributes("data-persistent-hint")).toBe("false");
    expect(wrapper.html()).toContain("mdi-help-circle-outline");
  });

  it("SelectAllTipos provee hint y tooltip conceptual de tipo", () => {
    const wrapper = mount(SelectAllTipos, {
      global: { stubs },
    });
    const autocomplete = wrapper.find(".v-autocomplete-stub");
    expect(autocomplete.exists()).toBe(true);
    expect(autocomplete.attributes("data-hint")).toBe(hints.tipos.select);
    expect(autocomplete.attributes("data-persistent-hint")).toBe("false");
    expect(wrapper.html()).toContain("mdi-help-circle-outline");
  });

  it("SelectAllRelaciones provee hint y tooltip conceptual de relacion", () => {
    const wrapper = mount(SelectAllRelaciones, {
      global: { stubs },
    });
    const autocomplete = wrapper.find(".v-autocomplete-stub");
    expect(autocomplete.exists()).toBe(true);
    expect(autocomplete.attributes("data-hint")).toBe(hints.relaciones.select);
    expect(autocomplete.attributes("data-persistent-hint")).toBe("false");
    expect(wrapper.html()).toContain("mdi-help-circle-outline");
  });

  it("SelectAllCargos provee hint de cargos", () => {
    const wrapper = mount(SelectAllCargos, {
      global: { stubs },
    });
    const autocomplete = wrapper.find(".v-autocomplete-stub");
    expect(autocomplete.exists()).toBe(true);
    expect(autocomplete.attributes("data-hint")).toBe(hints.cargos.select);
    expect(autocomplete.attributes("data-persistent-hint")).toBe("false");
  });

  it("UnidadDependencyDialog provee hints en sus 3 campos", () => {
    const wrapper = mount(UnidadDependencyDialog, {
      props: {
        modelValue: true,
        unidades: [],
      },
      global: { stubs },
    });

    const selects = wrapper.findAll(".select-unidades-stub");
    expect(selects.length).toBe(2);
    expect(selects[0].attributes("data-hint")).toBe(
      hints.unidadDependency.unidadACambiar,
    );
    expect(selects[1].attributes("data-hint")).toBe(
      hints.unidadDependency.unidadDestino,
    );

    const textarea = wrapper.find(".v-textarea-stub");
    expect(textarea.exists()).toBe(true);
    expect(textarea.attributes("data-hint")).toBe(hints.unidadDependency.razon);
    expect(textarea.attributes("data-persistent-hint")).toBe("false");
  });
});
