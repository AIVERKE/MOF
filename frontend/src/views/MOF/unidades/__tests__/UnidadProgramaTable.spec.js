import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const apiFetch = vi.fn();
vi.mock("@/config/api", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, apiFetch: (...args) => apiFetch(...args) };
});

import UnidadProgramaTable from "../UnidadProgramaTable.vue";

const CATALOGO = [
  { id: 1, tipo: "Programa Académico", cantidad: 0 },
  { id: 2, tipo: "Programa Investigación", cantidad: 0 },
  { id: 3, tipo: "Programa Interacción Social y Extensión Universitaria", cantidad: 0 },
];

const jsonResponse = (data, ok = true, status = 200) => ({
  ok,
  status,
  json: () => Promise.resolve({ data }),
  text: () => Promise.resolve(JSON.stringify({ data })),
});

const stubs = {
  "v-card": { template: `<div class="v-card"><slot /></div>` },
  "v-row": { template: `<div class="v-row"><slot /></div>` },
  "v-col": { template: `<div class="v-col"><slot /></div>` },
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
    props: ["modelValue", "items", "itemTitle", "itemValue", "error"],
    emits: ["update:modelValue"],
    template: `
      <div class="v-autocomplete-stub" :data-item-title="itemTitle" :data-error="error">
        <select
          v-if="itemTitle === 'tipo'"
          class="tipo-select"
          :value="modelValue ?? ''"
          @change="$emit('update:modelValue', $event.target.value === '' ? null : Number($event.target.value))"
        >
          <option value=""></option>
          <option v-for="it in items" :key="it.id" :value="it.id">{{ it.tipo }}</option>
        </select>
        <slot name="append-item" />
      </div>
    `,
  },
  "v-list-item": {
    props: ["title"],
    emits: ["click"],
    template: `<button class="v-list-item-stub" @click="$emit('click')">{{ title }}</button>`,
  },
  "v-dialog": { template: `<div class="v-dialog-stub"><slot /></div>` },
  "v-text-field": {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: `<input class="text-field-input" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`,
  },
  "v-btn": {
    template: `<button @click="$emit('click')"><slot /></button>`,
  },
  "v-icon": { template: `<i><slot /></i>` },
  "v-chip": { template: `<span><slot /></span>` },
  "v-divider": { template: `<hr />` },
};

async function montar(modelValue = []) {
  const wrapper = mount(UnidadProgramaTable, {
    props: { modelValue },
    global: { stubs },
  });
  await flushPromises();
  return wrapper;
}

describe("UnidadProgramaTable.vue", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiFetch.mockResolvedValue(jsonResponse(CATALOGO));
  });

  it("renderiza lista vacía cuando no hay programas", async () => {
    const wrapper = await montar([]);
    expect(wrapper.text()).toContain("No hay programas registrados");
  });

  it("carga el catálogo de tipos con los tres programas", async () => {
    const wrapper = await montar([{ id: null, tipoId: null, detalle: "", unidadIds: [] }]);
    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining("/mof/programas/tipos"));
    const opciones = wrapper.findAll(".tipo-select option").map((o) => o.text()).filter(Boolean);
    expect(opciones).toEqual([
      "Programa Académico",
      "Programa Investigación",
      "Programa Interacción Social y Extensión Universitaria",
    ]);
  });

  it("permite añadir un nuevo programa sin tipo seleccionado", async () => {
    const wrapper = await montar([]);
    const addBtn = wrapper.findAll("button").find((b) => b.text().includes("Añadir programa"));
    expect(addBtn).toBeDefined();
    await addBtn.trigger("click");

    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toEqual([
      { id: null, tipoId: null, tipo: "", nombre: "", detalle: "", resolucion: "", unidadIds: [] },
    ]);
  });

  it("al elegir un tipo emite su id y su nombre", async () => {
    const wrapper = await montar([
      { id: 1, tipoId: 1, tipo: "Programa Académico", detalle: "Programa inicial", unidadIds: [] },
    ]);
    await wrapper.find(".tipo-select").setValue("2");

    const fila = wrapper.emitted("update:modelValue")[0][0][0];
    expect(fila.tipoId).toBe(2);
    expect(fila.tipo).toBe("Programa Investigación");
  });

  it("muestra el nombre del tipo en el encabezado de la tarjeta", async () => {
    const wrapper = await montar([
      { id: 1, tipoId: 3, detalle: "Brigadas", unidadIds: [] },
    ]);
    expect(wrapper.text()).toContain("Programa Interacción Social y Extensión Universitaria");
  });

  it("si el programa tiene nombre, lo usa como encabezado de la tarjeta", async () => {
    const wrapper = await montar([
      { id: 1, tipoId: 3, nombre: "Brigadas de Salud", detalle: "Brigadas", unidadIds: [] },
    ]);
    expect(wrapper.find(".programa-card").text()).toContain("Brigadas de Salud");
  });

  it("edita nombre y resolución de la fila", async () => {
    const wrapper = await montar([
      { id: 1, tipoId: 1, nombre: "", detalle: "x", resolucion: "", unidadIds: [] },
    ]);
    await wrapper.find('[data-test="input-nombre-programa-0"]').setValue("Programa de Becas");
    await wrapper.find('[data-test="input-resolucion-programa-0"]').setValue("Res. HCU 45/2026");

    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted[0][0][0]).toMatchObject({ nombre: "Programa de Becas" });
    expect(emitted[1][0][0]).toMatchObject({ resolucion: "Res. HCU 45/2026" });
  });

  it("ofrece como unidades conjuntas todas las unidades recibidas", async () => {
    const unidades = [
      { id: 1, nombre: "RECTORADO", sigla: "REC" },
      { id: 10, nombre: "FCS - DECANATO", sigla: "FCS" },
    ];
    const wrapper = mount(UnidadProgramaTable, {
      props: {
        modelValue: [{ id: 1, tipoId: 1, nombre: "P", detalle: "x", unidadIds: [] }],
        unidadesDisponibles: unidades,
      },
      global: { stubs },
    });
    await flushPromises();
    const select = wrapper
      .findAllComponents(stubs["v-autocomplete"])
      .find((c) => c.props("itemTitle") === "nombre");
    expect(select.props("items")).toEqual(unidades);
  });

  it("permite eliminar una fila de programa", async () => {
    const wrapper = await montar([
      { id: 1, tipoId: 2, detalle: "Programa 1", unidadIds: [] },
      { id: 2, tipoId: 1, detalle: "Programa 2", unidadIds: [] },
    ]);

    const deleteBtns = wrapper.findAll("button").filter((b) => b.attributes("title") === "Quitar programa");
    expect(deleteBtns.length).toBe(2);

    await deleteBtns[0].trigger("click");
    expect(wrapper.emitted("update:modelValue")[0][0]).toHaveLength(1);
    expect(wrapper.emitted("update:modelValue")[0][0][0].id).toBe(2);
  });

  it("valida que las filas tengan tipo, nombre y detalle; la resolución es opcional", async () => {
    const wrapper = await montar([{ id: null, tipoId: null, nombre: "P", detalle: "Algo" }]);
    expect(wrapper.vm.validate()).toBe(false);

    const sinNombre = await montar([{ id: null, tipoId: 1, nombre: "  ", detalle: "Algo" }]);
    expect(sinNombre.vm.validate()).toBe(false);

    const sinDetalle = await montar([{ id: null, tipoId: 1, nombre: "P", detalle: "  " }]);
    expect(sinDetalle.vm.validate()).toBe(false);

    const valido = await montar([
      { id: null, tipoId: 2, nombre: "IA", detalle: "Laboratorio de IA", resolucion: "" },
    ]);
    expect(valido.vm.validate()).toBe(true);
  });

  it("añade un tipo nuevo al catálogo y lo asigna a la fila", async () => {
    const wrapper = await montar([{ id: null, tipoId: null, detalle: "", unidadIds: [] }]);
    apiFetch.mockResolvedValueOnce(
      jsonResponse({ id: 5, tipo: "Programa de Posgrado", cantidad: 0 }, true, 201),
    );

    const abrir = wrapper.findAll(".v-list-item-stub").find((b) => b.text().includes("Añadir tipo de programa"));
    expect(abrir).toBeDefined();
    await abrir.trigger("click");
    await wrapper.find('[data-test="input-nuevo-tipo-programa"]').setValue("  Programa   de Posgrado ");
    const guardar = wrapper.findAll("button").find((b) => b.text() === "Añadir");
    await guardar.trigger("click");
    await flushPromises();

    const [url, opts] = apiFetch.mock.calls.at(-1);
    expect(url).toContain("/mof/programas/tipos");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ tipo: "Programa de Posgrado" });

    expect(wrapper.vm.tipos.map((t) => t.id)).toEqual([1, 2, 3, 5]);
    const fila = wrapper.emitted("update:modelValue").at(-1)[0][0];
    expect(fila).toMatchObject({ tipoId: 5, tipo: "Programa de Posgrado" });
  });

  it("si el alta del tipo falla no modifica el catálogo ni la fila", async () => {
    const wrapper = await montar([{ id: null, tipoId: null, detalle: "", unidadIds: [] }]);
    apiFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: () => Promise.resolve(JSON.stringify({ errorCode: "FORBIDDEN" })),
    });

    wrapper.vm.abrirNuevoTipo(0);
    wrapper.vm.nuevoTipo = "Otro";
    await wrapper.vm.crearTipo();
    await flushPromises();

    expect(wrapper.vm.tipos).toHaveLength(3);
    expect(wrapper.emitted("update:modelValue")).toBeFalsy();
  });

  it("en modo lectura no ofrece añadir tipos", async () => {
    const wrapper = mount(UnidadProgramaTable, {
      props: { modelValue: [{ id: 1, tipoId: 1, detalle: "x" }], readonly: true },
      global: { stubs },
    });
    await flushPromises();
    expect(wrapper.text()).not.toContain("Añadir tipo de programa");
  });
});
