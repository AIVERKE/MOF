import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import UnidadInventarioTable from "../UnidadInventarioTable.vue";

const stubs = {
  "v-table": { template: `<div class="v-table"><slot /></div>` },
  "v-text-field": {
    props: ["modelValue", "error", "errorMessages", "placeholder", "disabled"],
    emits: ["update:modelValue"],
    template: `
      <div class="v-text-field-stub" :data-error="error" :data-error-messages="JSON.stringify(errorMessages || [])">
        <input
          :value="modelValue"
          @input="$emit('update:modelValue', $event.target.value)"
        />
      </div>
    `,
  },
  "v-btn": {
    template: `<button @click="$emit('click')"><slot /></button>`,
  },
  "v-icon": { template: `<i><slot /></i>` },
  "v-chip": { template: `<span><slot /></span>` },
  "v-tooltip": { template: `<span><slot /></span>` },
};

describe("UnidadInventarioTable.vue", () => {
  it("permite añadir fila nueva con aviso de descripción y sin bloquear", async () => {
    const wrapper = mount(UnidadInventarioTable, {
      props: {
        modelValue: [],
      },
      global: { stubs },
    });

    const addBtn = wrapper.find('[data-test="btn-add-inventario-row"]');
    expect(addBtn.exists()).toBe(true);

    await addBtn.trigger("click");

    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toEqual([
      { id: null, descripcion: "", cantidad: 1 },
    ]);
  });

  it("muestra el aviso de descripción requerida cuando la fila no tiene descripción", () => {
    const wrapper = mount(UnidadInventarioTable, {
      props: {
        modelValue: [{ id: null, descripcion: "", cantidad: 1 }],
      },
      global: { stubs },
    });

    const aviso = wrapper.find('[data-test="inventario-aviso-descripcion"]');
    expect(aviso.exists()).toBe(true);
    expect(aviso.text()).toContain("Descripción requerida para registrar este ítem");
  });

  it("oculta el aviso de descripción cuando la descripción ya fue completada", () => {
    const wrapper = mount(UnidadInventarioTable, {
      props: {
        modelValue: [{ id: 1, descripcion: "Escritorio de madera", cantidad: 1 }],
      },
      global: { stubs },
    });

    const aviso = wrapper.find('[data-test="inventario-aviso-descripcion"]');
    expect(aviso.exists()).toBe(false);
  });

  it("permite borrar el 1 de la cantidad sin que se reponga automáticamente con cada tecla", async () => {
    const wrapper = mount(UnidadInventarioTable, {
      props: {
        modelValue: [{ id: 1, descripcion: "Escritorio", cantidad: 1 }],
      },
      global: { stubs },
    });

    const cantField = wrapper.find('[data-test="inventario-input-cantidad-0"] input');
    expect(cantField.exists()).toBe(true);

    // Simular que el usuario borra el campo (deja vacío)
    await cantField.setValue("");

    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    // La cantidad debe emitirse vacía "" en lugar de ser forzada a 1
    expect(emitted[0][0][0].cantidad).toBe("");
  });

  it("permite ingresar cualquier número válido en cantidad", async () => {
    const wrapper = mount(UnidadInventarioTable, {
      props: {
        modelValue: [{ id: 1, descripcion: "Escritorio", cantidad: 1 }],
      },
      global: { stubs },
    });

    const cantField = wrapper.find('[data-test="inventario-input-cantidad-0"] input');
    await cantField.setValue("25");

    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    expect(emitted[0][0][0].cantidad).toBe(25);
  });

  it("avisa en el campo cantidad al guardar (validate()) si la cantidad queda vacía o en cero", async () => {
    const wrapper = mount(UnidadInventarioTable, {
      props: {
        modelValue: [{ id: 1, descripcion: "Escritorio", cantidad: "" }],
      },
      global: { stubs },
    });

    // Antes de validar, no muestra error en la cantidad vacía
    expect(wrapper.vm.getCantidadError(wrapper.props("modelValue")[0])).toBe("");

    // Al pulsar guardar / ejecutar validate()
    const valid = wrapper.vm.validate();
    expect(valid).toBe(false);
    await wrapper.vm.$nextTick();

    // Ahora muestra el aviso en el campo
    expect(wrapper.vm.getCantidadError(wrapper.props("modelValue")[0])).toBe("Entero ≥ 1");
    expect(wrapper.vm.isCantidadInvalid(wrapper.props("modelValue")[0])).toBe(true);
  });

  it("avisa en el campo cantidad al guardar si la cantidad es 0", async () => {
    const wrapper = mount(UnidadInventarioTable, {
      props: {
        modelValue: [{ id: 1, descripcion: "Escritorio", cantidad: 0 }],
      },
      global: { stubs },
    });

    const valid = wrapper.vm.validate();
    expect(valid).toBe(false);

    expect(wrapper.vm.getCantidadError(wrapper.props("modelValue")[0])).toBe("Entero ≥ 1");
  });

  it("validate() es true si una fila añadida quedó sin descripción (no bloquea el resto de la unidad)", () => {
    const wrapper = mount(UnidadInventarioTable, {
      props: {
        modelValue: [{ id: null, descripcion: "", cantidad: 1 }],
      },
      global: { stubs },
    });

    // Una fila vacía nueva no bloquea el guardado del resto de la unidad
    const valid = wrapper.vm.validate();
    expect(valid).toBe(true);
  });

  it("permite eliminar una fila de inventario", async () => {
    const wrapper = mount(UnidadInventarioTable, {
      props: {
        modelValue: [
          { id: 1, descripcion: "Escritorio", cantidad: 1 },
          { id: 2, descripcion: "Silla", cantidad: 2 },
        ],
      },
      global: { stubs },
    });

    const removeBtn = wrapper.find('[data-test="btn-remove-inventario-0"]');
    await removeBtn.trigger("click");

    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toEqual([
      { id: 2, descripcion: "Silla", cantidad: 2 },
    ]);
  });
});
