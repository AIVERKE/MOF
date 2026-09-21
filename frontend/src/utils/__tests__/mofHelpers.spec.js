import { describe, it, expect, beforeEach } from "vitest";
import {
  isUnidadOficial,
  isStaffNode,
  buildHierarchyTree,
  normalizeText,
  clearNormalizeCache,
  toBoolean,
  resolveCatalogItem,
  getClaseNombre,
  getClaseColor,
  getIntenseNodeColor,
  getCampoClase,
  getPesoReal,
  getHighlightSegments,
  getContrastingTextColor,
  PESO_NULO,
  PESO_DEFAULT,
  DEFAULT_CLASE_COLOR,
  OKABE_ITO_PALETTE,
  INTENSE_NODE_PALETTE,
  PROTANOPIA_PALETTE,
  DEUTERANOPIA_PALETTE,
  TRITANOPIA_PALETTE,
} from "../mofHelpers";

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

describe("mofHelpers - normalizeText", () => {
  beforeEach(() => {
    clearNormalizeCache();
  });

  it("convierte a minúsculas y elimina tildes y diacríticos", () => {
    expect(normalizeText("DIRECCIÓN DE INVESTIGACIÓN")).toBe("direccion de investigacion");
    expect(normalizeText("Árbol Jerárquico Único")).toBe("arbol jerarquico unico");
    expect(normalizeText("Él Señor Ñandú")).toBe("el senor nandu");
  });

  it("recorta espacios en blanco en extremos", () => {
    expect(normalizeText("   facultad de ingenieria   ")).toBe("facultad de ingenieria");
  });

  it("retorna string vacío para valores nulos o indefinidos", () => {
    expect(normalizeText(null)).toBe("");
    expect(normalizeText(undefined)).toBe("");
    expect(normalizeText("")).toBe("");
  });

  it("convierte números u otros tipos a string normalizado", () => {
    expect(normalizeText(123)).toBe("123");
    expect(normalizeText(0)).toBe("0");
  });

  it("memoiza resultados y maneja LRU con tope de tamaño", () => {
    const firstCall = normalizeText("MEMORIZADO");
    const secondCall = normalizeText("MEMORIZADO");
    expect(firstCall).toBe("memorizado");
    expect(secondCall).toBe("memorizado");

    // Insertar más de 1000 elementos para verificar que el tope de cache no truene
    for (let i = 0; i < 1050; i++) {
      normalizeText(`item_${i}`);
    }
    expect(normalizeText("item_1049")).toBe("item_1049");
  });
});

describe("mofHelpers - toBoolean", () => {
  it("interpreta valores verdaderos de múltiples tipos", () => {
    expect(toBoolean(true)).toBe(true);
    expect(toBoolean(1)).toBe(true);
    expect(toBoolean("1")).toBe(true);
    expect(toBoolean("true")).toBe(true);
    expect(toBoolean("TRUE")).toBe(true);
    expect(toBoolean("t")).toBe(true);
    expect(toBoolean("si")).toBe(true);
    expect(toBoolean("sí")).toBe(true);
    expect(toBoolean("yes")).toBe(true);
    expect(toBoolean("y")).toBe(true);
  });

  it("interpreta valores falsos de múltiples tipos", () => {
    expect(toBoolean(false)).toBe(false);
    expect(toBoolean(0)).toBe(false);
    expect(toBoolean("0")).toBe(false);
    expect(toBoolean("false")).toBe(false);
    expect(toBoolean("FALSE")).toBe(false);
    expect(toBoolean("f")).toBe(false);
    expect(toBoolean("no")).toBe(false);
    expect(toBoolean("n")).toBe(false);
    expect(toBoolean("")).toBe(false);
    expect(toBoolean(null)).toBe(false);
    expect(toBoolean(undefined)).toBe(false);
  });
});

describe("mofHelpers - resolveCatalogItem", () => {
  const catalogo = [
    { id: 1, codigo: "DIR", descripcion: "DIRECCIÓN CENTRAL", color: "#1976D2" },
    { id: 2, codigo: "DEP", descripcion: "DEPARTAMENTO ACADÉMICO", color: "#4CAF50" },
    { id: 3, codigo: "SEC", descripcion: "SECCIÓN ADMINISTRATIVA", color: "#FF9800" },
  ];

  it("resuelve por id numérico o string", () => {
    expect(resolveCatalogItem(1, catalogo)).toEqual(catalogo[0]);
    expect(resolveCatalogItem("2", catalogo)).toEqual(catalogo[1]);
  });

  it("resuelve por texto normalizado sin importar mayúsculas ni tildes", () => {
    expect(resolveCatalogItem("direccion central", catalogo)).toEqual(catalogo[0]);
    expect(resolveCatalogItem("DIRECCION CENTRAL", catalogo)).toEqual(catalogo[0]);
    expect(resolveCatalogItem("departamento academico", catalogo)).toEqual(catalogo[1]);
  });

  it("resuelve por código exacto o normalizado", () => {
    expect(resolveCatalogItem("DIR", catalogo)).toEqual(catalogo[0]);
    expect(resolveCatalogItem("dep", catalogo)).toEqual(catalogo[1]);
  });

  it("resuelve cuando se le pasa un objeto", () => {
    expect(resolveCatalogItem({ id: 3 }, catalogo)).toEqual(catalogo[2]);
    expect(resolveCatalogItem({ descripcion: "SECCIÓN ADMINISTRATIVA" }, catalogo)).toEqual(catalogo[2]);
  });

  it("retorna null si no coincide o el catálogo está vacío", () => {
    expect(resolveCatalogItem("INEXISTENTE", catalogo)).toBeNull();
    expect(resolveCatalogItem(999, catalogo)).toBeNull();
    expect(resolveCatalogItem(1, [])).toBeNull();
    expect(resolveCatalogItem(null, catalogo)).toBeNull();
  });
});

describe("mofHelpers - consistencia getClaseNombre y getClaseColor", () => {
  const clases = [
    { id: 1, descripcion: "DIRECCIÓN", color: "#1976D2" },
    { id: 2, descripcion: "DEPARTAMENTO", color: "#4CAF50" },
  ];

  it("garantiza que getClaseNombre y getClaseColor resuelven la misma clase para el mismo val", () => {
    const testCases = [
      1,
      "1",
      "DIRECCIÓN",
      "direccion",
      { id: 2 },
      { clase: 1 },
      { tipo_unidad: 2 },
      { tipoUnidad: "direccion" },
    ];

    for (const val of testCases) {
      const nombre = getClaseNombre(val, clases);
      const color = getClaseColor(val, clases);

      if (nombre === "DIRECCIÓN") {
        expect(color).toBe("#1976D2");
      } else if (nombre === "DEPARTAMENTO") {
        expect(color).toBe("#4CAF50");
      }
    }
  });

  it("usa DEFAULT_CLASE_COLOR para valores desconocidos", () => {
    expect(getClaseColor("DESCONOCIDO", clases)).toBe(DEFAULT_CLASE_COLOR);
    expect(getClaseColor(null, clases)).toBe(DEFAULT_CLASE_COLOR);
  });

  it("en modo daltónico (isColorblind: true), remapea clases a la paleta Okabe-Ito sin alterar el dato", () => {
    // Clase 0 -> OKABE_ITO_PALETTE[0]
    expect(getClaseColor(1, clases, true)).toBe(OKABE_ITO_PALETTE[0]);
    expect(getClaseColor("DIRECCIÓN", clases, true)).toBe(OKABE_ITO_PALETTE[0]);

    // Clase 1 -> OKABE_ITO_PALETTE[1]
    expect(getClaseColor(2, clases, true)).toBe(OKABE_ITO_PALETTE[1]);
    expect(getClaseColor("DEPARTAMENTO", clases, true)).toBe(OKABE_ITO_PALETTE[1]);

    // Comprueba que los objetos originales no se alteraron
    expect(clases[0].color).toBe("#1976D2");
    expect(clases[1].color).toBe("#4CAF50");

    // Con isColorblind: false, mantiene el color guardado intacto
    expect(getClaseColor(1, clases, false)).toBe("#1976D2");
    expect(getClaseColor(2, clases, false)).toBe("#4CAF50");
  });
});

describe("mofHelpers - getCampoClase", () => {
  it("extrae la clase de diferentes estructuras de datos", () => {
    expect(getCampoClase(5)).toBe(5);
    expect(getCampoClase("facultad")).toBe("facultad");
    expect(getCampoClase({ clase: 10 })).toBe(10);
    expect(getCampoClase({ tipoUnidad: 11 })).toBe(11);
    expect(getCampoClase({ tipo_unidad: 12 })).toBe(12);
    expect(getCampoClase({ clase: { id: 15 } })).toBe(15);
    expect(getCampoClase({ id: 20 })).toBe(20);
    expect(getCampoClase(null)).toBeNull();
  });
});

describe("mofHelpers - getPesoReal con constantes nombradas", () => {
  const clases = [
    { id: 1, descripcion: "RECTORADO", peso: 1, orden: 1 },
    { id: 2, descripcion: "FACULTAD", peso: 2 },
    { id: 3, descripcion: "DEPARTAMENTO" }, // sin peso ni orden, toma índice + 1 = 3
  ];

  it("retorna PESO_NULO si unidad es nula", () => {
    expect(getPesoReal(null, clases)).toBe(PESO_NULO);
    expect(PESO_NULO).toBe(99);
  });

  it("prioriza orden y peso directos de la unidad", () => {
    expect(getPesoReal({ peso: 5 }, clases)).toBe(5);
    expect(getPesoReal({ orden: 4 }, clases)).toBe(4);
  });

  it("obtiene el peso desde el catálogo de clases", () => {
    expect(getPesoReal({ clase: 1 }, clases)).toBe(1);
    expect(getPesoReal({ tipo_unidad: 2 }, clases)).toBe(2);
    expect(getPesoReal({ tipoUnidad: "DEPARTAMENTO" }, clases)).toBe(3);
  });

  it("retorna PESO_DEFAULT si no encuentra la clase", () => {
    expect(getPesoReal({ clase: 999 }, clases)).toBe(PESO_DEFAULT);
    expect(PESO_DEFAULT).toBe(10);
  });
});

describe("mofHelpers - getHighlightSegments", () => {
  it("no cuelga ni lanza con query tipo ReDoS", () => {
    const started = Date.now();
    const segs = getHighlightSegments(
      "Rectorado Universitario",
      "((((a+)+)+)+",
    );
    expect(Date.now() - started).toBeLessThan(500);
    expect(Array.isArray(segs)).toBe(true);
    expect(segs.some((s) => s.match)).toBe(false);
    expect(segs.map((s) => s.text).join("")).toBe("Rectorado Universitario");
  });

  it("resalta RECTORADO / rectorado en el nombre", () => {
    const segs = getHighlightSegments(
      "Rectorado Universitario",
      "RECTORADO",
    );
    expect(segs.some((s) => s.match && /rectorado/i.test(s.text))).toBe(true);
    expect(segs.map((s) => s.text).join("")).toBe("Rectorado Universitario");

    const segsLower = getHighlightSegments(
      "Rectorado Universitario",
      "rectorado",
    );
    expect(segsLower.some((s) => s.match)).toBe(true);
  });

  it("con query vacía devuelve un segmento sin match", () => {
    expect(getHighlightSegments("Rectorado", "")).toEqual([
      { text: "Rectorado", match: false },
    ]);
    expect(getHighlightSegments("Rectorado", "   ")).toEqual([
      { text: "Rectorado", match: false },
    ]);
  });
});

describe("mofHelpers - getIntenseNodeColor con INTENSE_NODE_PALETTE", () => {
  const clases = [
    { id: 1, descripcion: "RECTORADO", color: "#9E9E9E" }, // Color gris legacy
    { id: 2, descripcion: "FACULTAD", color: "#CCCCCC" }, // Color gris legacy
    { id: 3, descripcion: "CARRERA" }, // Sin color
  ];

  it("asigna colores de INTENSE_NODE_PALETTE a clases según su posición", () => {
    expect(getIntenseNodeColor(1, clases)).toBe(INTENSE_NODE_PALETTE[0]);
    expect(getIntenseNodeColor(2, clases)).toBe(INTENSE_NODE_PALETTE[1]);
    expect(getIntenseNodeColor(3, clases)).toBe(INTENSE_NODE_PALETTE[2]);
  });

  it("en modo daltónico delega a la paleta daltónica correspondiente", () => {
    expect(getIntenseNodeColor(1, clases, true)).toBe(OKABE_ITO_PALETTE[0]);
    expect(getIntenseNodeColor(2, clases, true)).toBe(OKABE_ITO_PALETTE[1]);
  });
});

describe("mofHelpers - getContrastingTextColor y cumplimiento WCAG AA", () => {
  function sRGBtoLin(c) {
    c = c / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  function getLuminance(hex) {
    hex = hex.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return 0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b);
  }
  function calcContrast(hex1, hex2) {
    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  it("todos los colores de INTENSE_NODE_PALETTE superan el ratio WCAG AA (>= 4.5:1)", () => {
    for (const color of INTENSE_NODE_PALETTE) {
      const textColor = getContrastingTextColor(color);
      const ratio = calcContrast(color, textColor);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("todos los colores de OKABE_ITO_PALETTE superan el ratio WCAG AA (>= 4.5:1)", () => {
    for (const color of OKABE_ITO_PALETTE) {
      const textColor = getContrastingTextColor(color);
      const ratio = calcContrast(color, textColor);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });
});

