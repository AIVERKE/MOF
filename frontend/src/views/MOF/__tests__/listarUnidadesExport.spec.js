import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import ListarUnidades from "../ListarUnidades.vue";
import * as mofReport from "@/utils/mofReport";

vi.mock("vue-router", () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("vuetify", () => ({
  useTheme: () => ({
    global: {
      current: {
        value: { dark: false },
      },
    },
  }),
  useDisplay: () => ({
    smAndDown: { value: false },
    xs: { value: false },
    sm: { value: false },
    mdAndUp: { value: true },
    mobile: { value: false },
  }),
}));

describe("ListarUnidades - Exportaciones PDF y CSV (MOF-051 fix)", () => {
  let pinia;
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
  });

  const stubs = {
    MofReportMenu: {
      props: ["loading", "hasPdf", "hasCsv"],
      template: `
        <div class="mof-report-menu-stub" :data-loading="loading">
          <button id="btn-pdf" @click="$emit('export-pdf')">Export PDF</button>
          <button id="btn-csv" @click="$emit('export-csv')">Export CSV</button>
        </div>
      `,
    },
    MofLoadingOverlay: {
      props: ["modelValue", "message", "submessage", "contained"],
      template: `
        <div class="mof-loading-overlay-stub" :data-active="modelValue" :data-message="message"></div>
      `,
    },
    UnidadFormDialog: true,
    UnidadDeleteDialog: true,
    UnidadDetailsDrawer: true,
    UnidadActionsMenu: true,
    HighlightedText: true,
    "v-container": { template: "<div><slot /></div>" },
    "v-card": { template: "<div><slot /></div>" },
    "v-card-title": { template: "<div><slot /></div>" },
    "v-card-text": { template: "<div><slot /></div>" },
    "v-btn": { template: "<button><slot /></button>" },
    "v-btn-toggle": { template: "<div><slot /></div>" },
    "v-icon": true,
    "v-tooltip": true,
    "v-divider": true,
    "v-spacer": true,
    "v-row": { template: "<div><slot /></div>" },
    "v-col": { template: "<div><slot /></div>" },
    "v-progress-linear": true,
    "v-progress-circular": true,
    "v-text-field": true,
    "v-data-table": true,
    "v-chip": true,
  };

  it("exporta PDF sin ReferenceError y restablece el overlay de carga", async () => {
    const exportPdfSpy = vi.spyOn(mofReport, "exportListarUnidadesPdf").mockImplementation(() => {});

    const wrapper = mount(ListarUnidades, {
      global: {
        plugins: [pinia],
        stubs,
      },
    });

    const pdfBtn = wrapper.find("#btn-pdf");
    expect(pdfBtn.exists()).toBe(true);
    await pdfBtn.trigger("click");

    await new Promise((r) => setTimeout(r, 200));
    await flushPromises();

    expect(exportPdfSpy).toHaveBeenCalledTimes(1);

    const overlay = wrapper.find(".mof-loading-overlay-stub");
    expect(overlay.attributes("data-active")).toBe("false");
  });

  it("exporta CSV sin ReferenceError y restablece el overlay de carga", async () => {
    const exportCsvSpy = vi.spyOn(mofReport, "exportToCsv").mockImplementation(() => true);

    const wrapper = mount(ListarUnidades, {
      global: {
        plugins: [pinia],
        stubs,
      },
    });

    const csvBtn = wrapper.find("#btn-csv");
    expect(csvBtn.exists()).toBe(true);
    await csvBtn.trigger("click");

    await new Promise((r) => setTimeout(r, 200));
    await flushPromises();

    expect(exportCsvSpy).toHaveBeenCalledTimes(1);

    const overlay = wrapper.find(".mof-loading-overlay-stub");
    expect(overlay.attributes("data-active")).toBe("false");
  });

  it("apaga el overlay de carga en finally incluso si la función de exportación falla", async () => {
    vi.spyOn(mofReport, "exportListarUnidadesPdf").mockImplementation(() => {
      throw new Error("Simulated export error");
    });

    const wrapper = mount(ListarUnidades, {
      global: {
        plugins: [pinia],
        stubs,
      },
    });

    const pdfBtn = wrapper.find("#btn-pdf");
    await pdfBtn.trigger("click");

    await new Promise((r) => setTimeout(r, 200));
    await flushPromises();

    const overlay = wrapper.find(".mof-loading-overlay-stub");
    expect(overlay.attributes("data-active")).toBe("false");
  });
});
