import { describe, it, expect } from "vitest";
import { mapPersonalToCargos, mapBackendToForm, mapFormToBackend } from "@/utils/mofMappers";

describe("mapPersonalToCargos", () => {
  const catalog = [
    { id: 10, nombre: "PORTERO I", descripcion: "PORTERO I", nivelOrden: 10 },
    { id: 11, nombre: "PORTERO I", descripcion: "PORTERO I", nivelOrden: 12 },
    { id: 20, nombre: "DECANO/A", descripcion: null, nivelOrden: 22 },
  ];

  it("empareja por cargoId y no por texto (homónimos con ids distintos)", () => {
    const personal = [
      { id: 1, cargoId: 10, nombre: "PORTERO I", descripcion: "PORTERO I", nivelOrden: 10 },
      { id: 2, cargoId: 11, nombre: "PORTERO I", descripcion: "PORTERO I", nivelOrden: 14 },
      { id: 3, cargoId: 20, nombre: "DECANO/A", descripcion: null, nivelOrden: null },
    ];

    expect(mapPersonalToCargos(personal, catalog)).toEqual([
      { assignmentId: "1", cargoId: "10", nombre: "PORTERO I", nivelOrden: 10 },
      { assignmentId: "2", cargoId: "11", nombre: "PORTERO I", nivelOrden: 14 },
      { assignmentId: "3", cargoId: "20", nombre: "DECANO/A", nivelOrden: null },
    ]);
  });

  it("no repite un cargo aunque el backend devuelva filas duplicadas", () => {
    const personal = [
      { id: 1, cargoId: 10, nombre: "PORTERO I" },
      { id: 2, cargoId: 10, nombre: "PORTERO I" },
    ];

    const result = mapPersonalToCargos(personal, catalog);
    expect(result).toHaveLength(1);
    expect(result[0].assignmentId).toBe("1");
  });

  it("ignora filas sin cargoId y toma el nombre del catálogo si falta", () => {
    const personal = [{ id: 1, descripcion: null }, { id: 2, cargoId: 20 }];

    expect(mapPersonalToCargos(personal, catalog)).toEqual([
      { assignmentId: "2", cargoId: "20", nombre: "DECANO/A", nivelOrden: null },
    ]);
  });
});

describe("mapBackendToForm - cargos", () => {
  it("copia las filas mapeadas sin compartir referencias", () => {
    const mappedCargos = [
      { assignmentId: "1", cargoId: "10", nombre: "PORTERO I", nivelOrden: 10 },
    ];
    const form = mapBackendToForm({ id: 5, nombre: "X" }, { mappedCargos });

    expect(form.cargos).toEqual(mappedCargos);
    expect(form.cargos[0]).not.toBe(mappedCargos[0]);
  });
});

describe("relaciones internas", () => {
  it("mapFormToBackend deduplica y descarta ids inválidos", () => {
    const payload = mapFormToBackend({
      relacionesInternas: [
        { id: 900, relacionadaId: 20, tipo: "A" },
        { id: 901, relacionadaId: 20, tipo: "B" },
        { id: 902, relacionadaId: "21" },
        { id: 903 },
        { relacionadaId: 0 },
        { relacionadaId: "abc" },
        22,
      ],
    });

    expect(payload.relacionesInternas).toEqual([
      { relacionadaId: 20, tipo: "A" },
      { relacionadaId: 21, tipo: null },
      { relacionadaId: 22, tipo: null },
    ]);
  });

  it("mapBackendToForm no usa el id de la fila como unidad relacionada", () => {
    const form = mapBackendToForm({
      id: 5,
      nombre: "X",
      relacionesInternas: [
        { id: 900, relacionadaId: 20, nombre: "A" },
        { id: 901, nombre: "sin unidad" },
        { id: 902, relacionadaId: 20, nombre: "A repetida" },
      ],
    });

    expect(form.relacionesInternas.map((r) => r.relacionadaId)).toEqual([20]);
  });
});

describe("mapeo de color propio y herencia de clase", () => {
  it("mapBackendToForm mapea colorPropio si existe, o null si hereda", () => {
    const withCustomColor = mapBackendToForm({
      id: 1,
      nombre: "Unidad Personalizada",
      colorPropio: "#00897B",
      colorClase: "#C62828",
      color: "#00897B",
    });
    expect(withCustomColor.color).toBe("#00897B");
    expect(withCustomColor.colorPropio).toBe("#00897B");
    expect(withCustomColor.colorClase).toBe("#C62828");

    const inheriting = mapBackendToForm({
      id: 2,
      nombre: "Unidad Heredada",
      colorPropio: null,
      colorClase: "#C62828",
      color: "#C62828",
    });
    expect(inheriting.color).toBeNull();
    expect(inheriting.colorPropio).toBeNull();
    expect(inheriting.colorClase).toBe("#C62828");
  });

  it("mapFormToBackend normaliza a mayúsculas o envía null si no hay color personalizado", () => {
    const custom = mapFormToBackend({
      nombre: "Test",
      color: "#00897b",
    });
    expect(custom.color).toBe("#00897B");

    const inheriting = mapFormToBackend({
      nombre: "Test",
      color: null,
    });
    expect(inheriting.color).toBeNull();

    const empty = mapFormToBackend({
      nombre: "Test",
      color: "",
    });
    expect(empty.color).toBeNull();
  });
});
