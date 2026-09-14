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

describe("mofHelpers - buildHierarchyTree", () => {
  it("retorna arreglo vacío si la lista es vacía o nula", () => {
    const { buildHierarchyTree } = require("../mofHelpers");
    expect(buildHierarchyTree([])).toEqual([]);
    expect(buildHierarchyTree(null)).toEqual([]);
  });

  it("construye correctamente árbol con raíces e hijos anidados", () => {
    const { buildHierarchyTree } = require("../mofHelpers");
    const rawList = [
      { id: 1, nombre: "Rectorado", parent: null, clase: 1 },
      { id: 2, nombre: "Secretaría General", parent: 1, clase: 2 },
      { id: 3, nombre: "Archivo Central", parent: 2, clase: 3 },
      { id: 4, nombre: "Vicerrectorado", parent: { id: 1 }, clase: 1 },
      { id: 5, nombre: "Unidad Independiente", parent: null, denominacion: "Indep" },
    ];

    const tree = buildHierarchyTree(rawList);
    expect(tree).toHaveLength(2); // Rectorado e Independiente

    const rectorado = tree.find((r) => r.id === 1);
    expect(rectorado).toBeDefined();
    expect(rectorado.title).toBe("Rectorado");
    expect(rectorado.display_name).toBe("Rectorado");
    expect(rectorado.children).toHaveLength(2); // Secretaría General y Vicerrectorado

    const secGral = rectorado.children.find((c) => c.id === 2);
    expect(secGral).toBeDefined();
    expect(secGral.children).toHaveLength(1);
    expect(secGral.children[0].id).toBe(3);

    const indep = tree.find((r) => r.id === 5);
    expect(indep.title).toBe("Indep");
    expect(indep.children).toHaveLength(0);
  });
});
