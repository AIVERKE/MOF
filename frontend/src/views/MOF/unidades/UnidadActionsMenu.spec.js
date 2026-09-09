import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import UnidadActionsMenu from "./UnidadActionsMenu.vue";

const stubs = {
  "v-btn": {
    template: `<button class="v-btn" v-bind="$attrs" @click="$emit('click', $event)"><slot /></button>`,
  },
  "v-icon": {
    template: `<i class="v-icon"><slot /></i>`,
  },
  "v-tooltip": { template: `<span class="v-tooltip"><slot /></span>` },
  "v-menu": {
    template: `<div class="v-menu"><slot /><slot name="activator" :props="{}" /></div>`,
  },
  "v-list": { template: `<div class="v-list"><slot /></div>` },
  "v-list-item": {
    props: ["title", "prependIcon"],
    template: `<button class="v-list-item" :data-title="title" @click="$emit('click')"><slot />{{ title }}</button>`,
  },
  "v-divider": { template: `<hr class="v-divider" />` },
};

function mountMenu(props = {}) {
  return mount(UnidadActionsMenu, {
    props: { unidadId: 42, ...props },
    global: { stubs },
  });
}

describe("UnidadActionsMenu", () => {
  it("emits details/pdf/edit/delete with unidadId", async () => {
    const wrapper = mountMenu();
    const items = wrapper.findAll(".v-list-item");
    const byTitle = (t) => items.find((i) => i.attributes("data-title") === t);

    await byTitle("Ver Ficha Técnica").trigger("click");
    await byTitle("Generar Reporte PDF").trigger("click");
    await byTitle("Editar Información").trigger("click");
    await byTitle("Eliminar Unidad").trigger("click");

    expect(wrapper.emitted("details")?.[0]).toEqual([42]);
    expect(wrapper.emitted("pdf")?.[0]).toEqual([42]);
    expect(wrapper.emitted("edit")?.[0]).toEqual([42]);
    expect(wrapper.emitted("delete")?.[0]).toEqual([42]);
  });

  it("hides menu items when show-* flags are false", () => {
    const wrapper = mountMenu({
      showDetails: false,
      showPdf: false,
      showDependencias: false,
      showAddChild: false,
    });
    const titles = wrapper
      .findAll(".v-list-item")
      .map((i) => i.attributes("data-title"));
    expect(titles).toEqual(["Editar Información", "Eliminar Unidad"]);
  });

  it("shows quick 👁/📄 buttons only when showQuickActions is true", () => {
    const without = mountMenu({ showQuickActions: false });
    expect(without.findAll(".v-btn").length).toBe(1); // solo ⋮

    const withQuick = mountMenu({ showQuickActions: true });
    // 👁 + 📄 + ⋮
    expect(withQuick.findAll(".v-btn").length).toBe(3);
  });

  it("emits dependencias and add-child", async () => {
    const wrapper = mountMenu();
    const items = wrapper.findAll(".v-list-item");
    const byTitle = (t) => items.find((i) => i.attributes("data-title") === t);

    await byTitle("Dependencias Funcionales").trigger("click");
    await byTitle("Añadir Unidad Dependiente").trigger("click");

    expect(wrapper.emitted("dependencias")?.[0]).toEqual([42]);
    expect(wrapper.emitted("add-child")?.[0]).toEqual([42]);
  });
});
