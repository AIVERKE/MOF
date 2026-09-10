import { describe, it, expect } from "vitest";
import { isUnidadOficial, isStaffNode } from "../mofHelpers";

describe("mofHelpers - isUnidadOficial", () => {
  const clases = [
    { id: 1, descripcion: "DIRECCIÓN", oficial: true },
    { id: 2, descripcion: "DEPARTAMENTO", oficial: false },
  ];

  it("retorna false si unidad es nula o indefinida", () => {
    expect(isUnidadOficial(null, clases)).toBe(false);
    expect(isUnidadOficial(undefined, clases)).toBe(false);
  });

  it("prioriza unidad.oficial si está definido explícitamente (incluso si es false y la clase es oficial)", () => {
    // Caso de bug reportado: la clase es oficial: true, pero la unidad tiene oficial: false
    const unidadNoOficial = {
      id: 10,
      nombre: "Unidad Prueba",
      oficial: false,
      clase: 1, // Clase 1 tiene oficial: true
    };
    expect(isUnidadOficial(unidadNoOficial, clases)).toBe(false);

    const unidadOficial = {
      id: 11,
      nombre: "Unidad Prueba 2",
      oficial: true,
      clase: 2, // Clase 2 tiene oficial: false
    };
    expect(isUnidadOficial(unidadOficial, clases)).toBe(true);
  });

  it("interpreta valores numéricos o strings para oficial", () => {
    expect(isUnidadOficial({ oficial: 1 }, clases)).toBe(true);
    expect(isUnidadOficial({ oficial: "true" }, clases)).toBe(true);
    expect(isUnidadOficial({ oficial: 0 }, clases)).toBe(false);
    expect(isUnidadOficial({ oficial: "false" }, clases)).toBe(false);
  });

  it("recurre a la clase si unidad.oficial no está definido", () => {
    expect(isUnidadOficial({ clase: 1 }, clases)).toBe(true);
    expect(isUnidadOficial({ clase: 2 }, clases)).toBe(false);
    expect(isUnidadOficial({ clase: { id: 1 } }, clases)).toBe(true);
    expect(isUnidadOficial({ clase: { id: 2 } }, clases)).toBe(false);
  });
});

describe("mofHelpers - isStaffNode", () => {
  const relaciones = [
    { id: 1, codigo: "L", descripcion: "Lineal" },
    { id: 2, codigo: "S", descripcion: "Staff" },
    { id: 3, codigo: "F", descripcion: "Funcional" },
  ];

  it("retorna false si unidad es nula", () => {
    expect(isStaffNode(null, relaciones)).toBe(false);
  });

  it("detecta staff por código string directo 'S' o 'STAFF' en unidad.relacion", () => {
    expect(isStaffNode({ relacion: "S" }, relaciones)).toBe(true);
    expect(isStaffNode({ relacion: "s" }, relaciones)).toBe(true);
    expect(isStaffNode({ relacion: "STAFF" }, relaciones)).toBe(true);
    expect(isStaffNode({ relacion: "L" }, relaciones)).toBe(false);
  });

  it("detecta staff por ID numérico buscando en el catálogo de relaciones", () => {
    expect(isStaffNode({ relacion: 2 }, relaciones)).toBe(true);
    expect(isStaffNode({ relacion: 1 }, relaciones)).toBe(false);
  });

  it("detecta staff si unidad.relacion es un objeto", () => {
    expect(isStaffNode({ relacion: { id: 2, codigo: "S", descripcion: "Staff" } }, relaciones)).toBe(true);
    expect(isStaffNode({ relacion: { id: 1, codigo: "L", descripcion: "Lineal" } }, relaciones)).toBe(false);
  });

  it("detecta staff mediante str_relacion o descripciones con ASESOR", () => {
    expect(isStaffNode({ str_relacion: "ASESORÍA JURÍDICA" }, relaciones)).toBe(true);
    expect(isStaffNode({ str_relacion: "STAFF" }, relaciones)).toBe(true);
    expect(isStaffNode({ str_relacion: "LINEAL" }, relaciones)).toBe(false);
  });
});
