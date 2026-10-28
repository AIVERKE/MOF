import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import UnidadProyectoTable from "../UnidadProyectoTable.vue";

const stubs = {
  "v-card": { template: `<div class="v-card"><slot /></div>` },
  "v-row": { template: `<div class="v-row"><slot /></div>` },
  "v-col": { template: `<div class="v-col"><slot /></div>` },
  "v-combobox": {
    props: ["modelValue", "error", "errorMessages", "items"],
    emits: ["update:modelValue"],
    template: `
      <div class="v-combobox-stub" :data-error="error">
        <input
          class="combobox-input"
          :value="modelValue"
          @input="$emit('update:modelValue', $event.target.value)"
        />
      </div>
    `,
  },
  "v-textarea": {
    props: ["modelValue", "error", "errorMessages"],
    emits: ["update:modelValue"],
    template: `
      <div class="v-textarea-stub" :data-error="error">
        <textarea
          class="textarea-input"
          :value="modelValue"
          @input="$emit('update:modelValue', $event.target.value)"
        />
      </div>
    `,
  },
  "v-autocomplete": {
    props: ["modelValue", "items"],
    emits: ["update:modelValue"],
    template: `<div class="v-autocomplete-stub"><slot /></div>`,
  },
  "v-btn": {
    template: `<button @click="$emit('click')"><slot /></button>`,
  },
  "v-icon": { template: `<i><slot /></i>` },
  "v-chip": { template: `<span><slot /></span>` },
  "v-divider": { template: `<hr />` },
};

describe("UnidadProyectoTable.vue", () => {
  it("renderiza lista vacía cuando no hay proyectos", () => {
    const wrapper = mount(UnidadProyectoTable, {
      props: { modelValue: [] },
      global: { stubs },
    });

    expect(wrapper.text()).toContain("No hay proyectos registrados");
  });

  it("permite añadir un nuevo proyecto con tipo libre y detalle", async () => {
    const wrapper = mount(UnidadProyectoTable, {
      props: { modelValue: [] },
      global: { stubs },
    });

    const addBtn = wrapper.findAll("button").find((b) => b.text().includes("Añadir proyecto"));
    expect(addBtn).toBeDefined();
    await addBtn.trigger("click");

    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toEqual([
      { id: null, tipo: "", detalle: "", unidadIds: [] },
    ]);
  });

  it("permite actualizar tipo libre y detalle de un proyecto", async () => {
    const wrapper = mount(UnidadProyectoTable, {
      props: {
        modelValue: [
          { id: 1, tipo: "Investigación", detalle: "Proyecto inicial", unidadIds: [] },
        ],
      },
      global: { stubs },
    });

    const tipoInput = wrapper.find(".combobox-input");
    await tipoInput.setValue("Interacción comunitaria abierta");

    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    expect(wrapper.emitted("update:modelValue")[0][0][0].tipo).toBe(
      "Interacción comunitaria abierta",
    );
  });

  it("permite eliminar una fila de proyecto", async () => {
    const wrapper = mount(UnidadProyectoTable, {
      props: {
        modelValue: [
          { id: 1, tipo: "Investigación", detalle: "Proyecto 1", unidadIds: [] },
          { id: 2, tipo: "Académico", detalle: "Proyecto 2", unidadIds: [] },
        ],
      },
      global: { stubs },
    });

    const deleteBtns = wrapper.findAll("button").filter((b) => b.attributes("title") === "Quitar proyecto");
    expect(deleteBtns.length).toBe(2);

    await deleteBtns[0].trigger("click");
    expect(wrapper.emitted("update:modelValue")[0][0]).toHaveLength(1);
    expect(wrapper.emitted("update:modelValue")[0][0][0].id).toBe(2);
  });

  it("valida que las filas tengan tipo y detalle no vacíos", () => {
    const wrapper = mount(UnidadProyectoTable, {
      props: {
        modelValue: [
          { id: null, tipo: "", detalle: "" },
        ],
      },
      global: { stubs },
    });

    expect(wrapper.vm.validate()).toBe(false);

    const validWrapper = mount(UnidadProyectoTable, {
      props: {
        modelValue: [
          { id: null, tipo: "Investigación", detalle: "Laboratorio de IA" },
        ],
      },
      global: { stubs },
    });

    expect(validWrapper.vm.validate()).toBe(true);
  });
});
