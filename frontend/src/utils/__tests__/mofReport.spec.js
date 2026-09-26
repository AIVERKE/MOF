import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { exportToCsv, formatReportDate } from "../mofReport";

describe("exportToCsv", () => {
  let capturedBlob;
  let createObjectURLSpy;
  let revokeObjectURLSpy;
  let clickSpy;

  beforeEach(() => {
    capturedBlob = null;
    createObjectURLSpy = vi.fn((blob) => {
      capturedBlob = blob;
      return "blob:csv-test";
    });
    revokeObjectURLSpy = vi.fn();
    URL.createObjectURL = createObjectURLSpy;
    URL.revokeObjectURL = revokeObjectURLSpy;

    clickSpy = vi.fn();
    const originalCreateElement = Document.prototype.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "a") {
        return {
          setAttribute: vi.fn(),
          style: {},
          click: clickSpy,
        };
      }
      return originalCreateElement(tag);
    });
    vi.spyOn(document.body, "appendChild").mockImplementation(() => {});
    vi.spyOn(document.body, "removeChild").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function readCsvText() {
    expect(capturedBlob).toBeInstanceOf(Blob);
    return capturedBlob.text();
  }

  it("retorna false si no hay columnas o filas", () => {
    expect(exportToCsv({ columns: [], rows: [{ a: 1 }] })).toBe(false);
    expect(exportToCsv({ columns: [{ header: "A", key: "a" }], rows: [] })).toBe(false);
    expect(createObjectURLSpy).not.toHaveBeenCalled();
  });

  it("genera CSV con BOM UTF-8, delimitador ; y bloque de contexto", async () => {
    const ok = exportToCsv({
      filename: "test.csv",
      title: "Reporte de Prueba",
      activeFilters: [],
      columns: [
        { header: "CÓDIGO", key: "codigo" },
        { header: "UNIDAD", getter: (r) => r.nombre },
      ],
      rows: [{ codigo: "1.0", nombre: "Rectorado" }],
    });

    expect(ok).toBe(true);
    expect(clickSpy).toHaveBeenCalled();

    const text = await readCsvText();
    expect(text.startsWith("\uFEFF")).toBe(true);

    const body = text.slice(1);
    const lines = body.split("\r\n");

    expect(lines[0]).toBe('"TÍTULO";"Reporte de Prueba"');
    expect(lines[1]).toMatch(/^"FECHA DE EMISIÓN";"\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}"$/);
    expect(lines[2]).toBe('"FILTROS ACTIVOS";"Sin filtros"');
    expect(lines[3]).toBe("");
    expect(lines[4]).toBe('"CÓDIGO";"UNIDAD"');
    expect(lines[5]).toBe('"1.0";"Rectorado"');

    // Delimitador de columnas es ; (no coma entre campos)
    expect(lines[4].includes(";")).toBe(true);
    expect(lines[4].split(";")).toHaveLength(2);
  });

  it("incluye filtros activos con el mismo formato que el PDF", async () => {
    exportToCsv({
      filename: "filtros.csv",
      title: "Árbol",
      activeFilters: [
        { label: "Término de Búsqueda", value: "rectorado" },
        { label: "Nivel Jerárquico", value: "Ejecutivo" },
      ],
      columns: [{ header: "CÓDIGO", key: "codigo" }],
      rows: [{ codigo: "1" }],
    });

    const text = await readCsvText();
    expect(text).toContain(
      '"FILTROS ACTIVOS";"Término de Búsqueda: rectorado | Nivel Jerárquico: Ejecutivo"'
    );
  });

  it("omite la fila TÍTULO si no se proporciona título", async () => {
    exportToCsv({
      filename: "sin_titulo.csv",
      columns: [{ header: "A", key: "a" }],
      rows: [{ a: "x" }],
    });

    const text = await readCsvText();
    const lines = text.slice(1).split("\r\n");
    expect(lines[0]).toMatch(/^"FECHA DE EMISIÓN";/);
    expect(lines.some((l) => l.startsWith('"TÍTULO"'))).toBe(false);
  });

  it("formatReportDate produce DD/MM/YYYY HH:mm", () => {
    const fixed = new Date(2026, 8, 24, 14, 22, 0);
    expect(formatReportDate(fixed)).toBe("24/09/2026 14:22");
  });
});
