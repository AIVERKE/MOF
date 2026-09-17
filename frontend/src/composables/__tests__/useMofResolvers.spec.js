import { describe, it, expect } from "vitest";
import { useMofResolvers } from "../useMofResolvers";

describe("useMofResolvers", () => {
  const clasesStore = {
    clases: [
      { id: 1, descripcion: "DIRECCIÓN", color: "#1976D2", oficial: true },
      { id: 2, descripcion: "DEPARTAMENTO", color: "#4CAF50", oficial: false },
    ],
  };

  const nivelesStore = {
    niveles: [
      { id: 1, descripcion: "Nivel 1" },
      { id: 2, descripcion: "Nivel 2" },
    ],
  };

  const tiposStore = {
    tipos: [
      { id: 1, descripcion: "Tipo A" },
      { id: 2, descripcion: "Tipo B" },
    ],
  };

  const relacionesStore = {
    relaciones: [
      { id: 1, codigo: "L", descripcion: "Lineal" },
      { id: 2, codigo: "S", descripcion: "Staff" },
    ],
  };

  it("resuelve nombres y colores pasando argumentos posicionales", () => {
    const resolvers = useMofResolvers(
      clasesStore,
      nivelesStore,
      tiposStore,
      relacionesStore,
    );

    expect(resolvers.resolveClase(1)).toBe("DIRECCIÓN");
    expect(resolvers.resolveClaseColor(1)).toBe("#1976D2");
    expect(resolvers.resolveNivel(1)).toBe("Nivel 1");
    expect(resolvers.resolveTipo(2)).toBe("Tipo B");
    expect(resolvers.resolveRelacion(2)).toBe("Staff");
    expect(resolvers.checkOficial({ oficial: false, clase: 1 })).toBe(false);
    expect(resolvers.checkOficial({ oficial: true, clase: 2 })).toBe(true);
  });

  it("resuelve nombres pasando un objeto de opciones", () => {
    const resolvers = useMofResolvers({
      clasesStore,
      nivelesStore,
      tiposStore,
      relacionesStore,
    });

    expect(resolvers.resolveClase(2)).toBe("DEPARTAMENTO");
    expect(resolvers.resolveClaseColor(2)).toBe("#4CAF50");
    expect(resolvers.resolveNivel(2)).toBe("Nivel 2");
    expect(resolvers.resolveTipo(1)).toBe("Tipo A");
  });

  it("maneja stores nulos o indefinidos de forma segura sin lanzar excepción", () => {
    const resolvers = useMofResolvers(null, null, null, null);
    expect(resolvers.resolveClase(1)).toBe(1);
    expect(resolvers.resolveNivel(1)).toBe(1);
    expect(resolvers.resolveTipo(1)).toBe(1);
    expect(resolvers.resolveRelacion(1)).toBe(1);
    expect(resolvers.resolveClase(null)).toBe("---");
    expect(resolvers.checkOficial(null)).toBe(false);
  });

  it("permite overrideColorblind en resolveClaseColor", () => {
    const resolvers = useMofResolvers({ clasesStore });
    // Sin modo daltónico
    expect(resolvers.resolveClaseColor(1, false)).toBe("#1976D2");
    // Con modo daltónico
    expect(resolvers.resolveClaseColor(1, true)).toBe("#0072B2");
    expect(resolvers.resolveClaseColor(2, true)).toBe("#E69F00");
  });
});
