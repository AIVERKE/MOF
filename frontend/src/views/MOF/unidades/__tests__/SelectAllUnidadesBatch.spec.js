import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import SelectAllUnidades from "../SelectAllUnidades.vue";
import { useAllUnidadesMofStore } from "@/stores/unidades_mof";
import { useAllClasesMofStore } from "@/stores/clases_mof";

const stubs = {
  "v-autocomplete": {
    props: ["modelValue", "items", "itemTitle", "itemValue", "customFilter", "loading", "label"],
    template: `
      <div class="v-autocomplete-stub">
        <slot name="prepend-item" />
        <div v-for="item in items" :key="item.id || item" class="item-wrapper">
          <slot name="item" :props="{}" :item="{ raw: item }">
            <span>{{ typeof itemTitle === 'function' ? itemTitle(item) : item.nombre }}</span>
          </slot>
        </div>
        <div v-for="sel in (Array.isArray(modelValue) ? modelValue : [modelValue])" :key="'chip-' + sel" class="chip-wrapper">
          <slot name="chip" :props="{}" :item="{ raw: items ? items.find(i => String(i.id) === String(sel)) : {} }">
            <span>{{ sel }}</span>
          </slot>
        </div>
      </div>
    `,
  },
  "v-select": {
    props: ["modelValue", "items"],
    template: `<div class="v-select-stub"><slot /></div>`,
  },
  "v-chip": {
    props: ["color", "variant", "size"],
    template: `<button class="v-chip" :data-color="color" :data-variant="variant" @click="$emit('click', $event)"><slot /></button>`,
  },
  "v-icon": {
    props: ["icon", "start", "size", "color"],
    template: `<i class="v-icon" :data-icon="icon"><slot /></i>`,
  },
  "v-list-item": {
    props: ["title", "subtitle"],
    template: `
      <div class="v-list-item" @click="$emit('click', $event)">
        <slot name="prepend" />
        <slot name="title">{{ title }}</slot>
        <slot name="subtitle">{{ subtitle }}</slot>
        <slot />
      </div>
    `,
  },
  "v-menu": {
    template: `<div class="v-menu"><slot name="activator" :props="{}" /><slot /></div>`,
  },
  "v-list": {
    template: `<div class="v-list"><slot /></div>`,
  },
  "v-list-item-title": {
    template: `<div class="v-list-item-title"><slot /></div>`,
  },
  "v-btn": {
    props: ["color", "variant", "size"],
    template: `<button class="v-btn" @click="$emit('click', $event)"><slot /></button>`,
  },
};

const mockUnidades = [
  // 3 Facultades (tipoUnidad = 24)
  { id: 56, nombre: "FACULTAD DE AGRONOMÍA", sigla: "FAD", tipoUnidad: 24, clase: "DECANATOS" },
  { id: 70, nombre: "FACULTAD DE MEDICINA", sigla: "FMED", tipoUnidad: 24, clase: "DECANATOS" },
  { id: 83, nombre: "FACULTAD DE INGENIERÍA", sigla: "FID", tipoUnidad: 24, clase: "DECANATOS" },

  // 2 Carreras (tipoUnidad = 28)
  { id: 241, nombre: "CARRERA DE INGENIERÍA CIVIL", sigla: "CIVIL", tipoUnidad: 28, clase: "DIRECCIONES DE CARRERA" },
  { id: 248, nombre: "CARRERA DE ELECTRÓNICA", sigla: "ELEC", tipoUnidad: 28, clase: "DIRECCIONES DE CARRERA" },

  // 2 Institutos (tipoUnidad = 29)
  { id: 301, nombre: "INSTITUTO DE INVESTIGACIONES QUÍMICAS", sigla: "IIQ", tipoUnidad: 29, clase: "DIRECCIONES DE INSTITUTOS" },
  { id: 302, nombre: "INSTITUTO DE INVESTIGACIONES FÍSICAS", sigla: "IIF", tipoUnidad: 29, clase: "DIRECCIONES DE INSTITUTOS" },
];

const mockClases = [
  { id: 24, descripcion: "DECANATOS", color: "#C62828" },
  { id: 28, descripcion: "DIRECCIONES DE CARRERA", color: "#03A9F4" },
  { id: 29, descripcion: "DIRECCIONES DE INSTITUTOS", color: "#1A237E" },
];

describe("SelectAllUnidades - Batch Group Selection (S-MAU)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const uStore = useAllUnidadesMofStore();
    uStore.unidades = [...mockUnidades];
    const cStore = useAllClasesMofStore();
    cStore.clases = [...mockClases];
  });

  it("does not render batch toolbar when enableBatchGroups is false (default)", () => {
    const wrapper = mount(SelectAllUnidades, {
      props: {
        modelValue: [],
        type: "autocomplete",
        enableBatchGroups: false,
      },
      global: { stubs },
    });

    expect(wrapper.find(".batch-groups-toolbar").exists()).toBe(false);
  });

  it("renders batch toolbar when enableBatchGroups is true", () => {
    const wrapper = mount(SelectAllUnidades, {
      props: {
        modelValue: [],
        type: "autocomplete",
        enableBatchGroups: true,
      },
      global: { stubs },
    });

    const toolbar = wrapper.find(".batch-groups-toolbar");
    expect(toolbar.exists()).toBe(true);
    expect(toolbar.text()).toContain("Seleccionar grupo:");
    // Should show Facultades (3), Carreras (2), Institutos (2)
    expect(toolbar.text()).toContain("Facultades (0/3)");
    expect(toolbar.text()).toContain("Carreras (0/2)");
    expect(toolbar.text()).toContain("Institutos (0/2)");
  });

  it("excludes excludeId from available group units and counts", () => {
    // If we exclude FMED (id: 70), Facultades should only have 2 units available (56, 83)
    const wrapper = mount(SelectAllUnidades, {
      props: {
        modelValue: [],
        type: "autocomplete",
        enableBatchGroups: true,
        excludeId: 70,
      },
      global: { stubs },
    });

    const toolbar = wrapper.find(".batch-groups-toolbar");
    expect(toolbar.text()).toContain("Facultades (0/2)");
  });

  it("selects all units in a group when clicked from 0 selected (none -> all)", async () => {
    const wrapper = mount(SelectAllUnidades, {
      props: {
        modelValue: [],
        type: "autocomplete",
        enableBatchGroups: true,
      },
      global: { stubs },
    });

    // Find the Facultades chip in the toolbar
    const chips = wrapper.findAll(".batch-groups-toolbar .v-chip");
    const facultadesChip = chips.find((c) => c.text().includes("Facultades"));
    expect(facultadesChip).toBeDefined();

    await facultadesChip.trigger("click");

    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    const lastEmitted = emitted[emitted.length - 1][0];
    expect(lastEmitted).toEqual([56, 70, 83]);
  });

  it("deselects all units in a group when clicked from all selected (all -> none)", async () => {
    // All 3 faculties are currently in modelValue
    const wrapper = mount(SelectAllUnidades, {
      props: {
        modelValue: [56, 70, 83],
        type: "autocomplete",
        enableBatchGroups: true,
      },
      global: { stubs },
    });

    const chips = wrapper.findAll(".batch-groups-toolbar .v-chip");
    const facultadesChip = chips.find((c) => c.text().includes("Facultades"));
    expect(facultadesChip.text()).toContain("Facultades (3/3)");

    await facultadesChip.trigger("click");

    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    const lastEmitted = emitted[emitted.length - 1][0];
    // Facultades removed, resulting in empty array
    expect(lastEmitted).toEqual([]);
  });

  it("completes the group when partially selected (partial -> all)", async () => {
    // Only 1 faculty is currently selected, plus 1 carrera
    const wrapper = mount(SelectAllUnidades, {
      props: {
        modelValue: [56, 241],
        type: "autocomplete",
        enableBatchGroups: true,
      },
      global: { stubs },
    });

    const chips = wrapper.findAll(".batch-groups-toolbar .v-chip");
    const facultadesChip = chips.find((c) => c.text().includes("Facultades"));
    expect(facultadesChip.text()).toContain("Facultades (1/3)");

    await facultadesChip.trigger("click");

    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    const lastEmitted = emitted[emitted.length - 1][0];
    // Preserves 241 (carrera) and completes faculties (56, 70, 83)
    expect(lastEmitted).toContain(241);
    expect(lastEmitted).toContain(56);
    expect(lastEmitted).toContain(70);
    expect(lastEmitted).toContain(83);
    expect(lastEmitted.length).toBe(4);
  });

  it("does not select excludeId when selecting a group", async () => {
    const wrapper = mount(SelectAllUnidades, {
      props: {
        modelValue: [],
        type: "autocomplete",
        enableBatchGroups: true,
        excludeId: 70, // Unit being edited (e.g. Medicina)
      },
      global: { stubs },
    });

    const chips = wrapper.findAll(".batch-groups-toolbar .v-chip");
    const facultadesChip = chips.find((c) => c.text().includes("Facultades"));

    await facultadesChip.trigger("click");

    const emitted = wrapper.emitted("update:modelValue");
    const lastEmitted = emitted[emitted.length - 1][0];
    // Should contain 56 and 83, but NOT 70!
    expect(lastEmitted).toContain(56);
    expect(lastEmitted).toContain(83);
    expect(lastEmitted).not.toContain(70);
  });

  it("includes macro-groups in dropdown items", () => {
    const wrapper = mount(SelectAllUnidades, {
      props: {
        modelValue: [],
        type: "autocomplete",
        enableBatchGroups: true,
      },
      global: { stubs },
    });

    const autocomplete = wrapper.findComponent(".v-autocomplete-stub");
    const items = autocomplete.props("items");
    const groupItems = items.filter((i) => i.isGroup);

    expect(groupItems.length).toBe(3); // Facultades, Carreras, Institutos
    expect(groupItems.some((g) => g.nombre.includes("Facultades"))).toBe(true);
    expect(groupItems.some((g) => g.nombre.includes("Carreras"))).toBe(true);
    expect(groupItems.some((g) => g.nombre.includes("Institutos"))).toBe(true);
  });

  it("clears all selections when clicking 'Limpiar todas'", async () => {
    const wrapper = mount(SelectAllUnidades, {
      props: {
        modelValue: [56, 70, 241],
        type: "autocomplete",
        enableBatchGroups: true,
      },
      global: { stubs },
    });

    const clearBtn = wrapper.findAll(".v-btn").find((b) => b.text().includes("Limpiar"));
    expect(clearBtn).toBeDefined();

    await clearBtn.trigger("click");

    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted[emitted.length - 1][0]).toEqual([]);
  });
});
