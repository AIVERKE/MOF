import { describe, it, expect } from "vitest";
import { mapPersonalToCargos, mapBackendToForm } from "@/utils/mofMappers";

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
