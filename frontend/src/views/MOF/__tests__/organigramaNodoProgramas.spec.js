import { describe, it, expect } from "vitest";
import {
  programasVisibles,
  getProgramaIcon,
  formatProgramaTexto,
  progTooltip,
} from "@/utils/mofHelpers";
import {
  NODE_WIDTH,
  NODE_HEIGHT,
  V_GAP,
  getNodeHeight,
  getLayoutedElements,
} from "@/utils/organigramaLayout";

describe("MOF-095: Programas en nodo solo si existen, íconos y layout", () => {
  describe("Criterio 1, 2 y 3: Visibilidad estricta de programas (> 0) y sin filas en 0", () => {
    it("En una unidad sin programas registrados, la lista visible queda vacía", () => {
      const programasPorTipo = [];
      const visibles = programasVisibles(programasPorTipo);
      expect(visibles).toHaveLength(0);
    });

    it("En una unidad con categorías en cantidad 0, no se pinta ninguna fila (descarta filas en 0)", () => {
      const programasPorTipo = [
        { tipo: "Programa Académico", cantidad: 0, nombres: [] },
        { tipo: "Programa Investigación", cantidad: 0, nombres: [] },
        { tipo: "Programa Interacción Social y Extensión Universitaria", cantidad: 0, nombres: [] },
      ];
      const visibles = programasVisibles(programasPorTipo);
      expect(visibles).toHaveLength(0);
      expect(visibles.some((p) => p.cantidad === 0)).toBe(false);
    });

    it("En una unidad con un único tipo con cantidad > 0, se renderiza exclusivamente esa fila", () => {
      const programasPorTipo = [
        { tipo: "Programa Académico", cantidad: 0 },
        { tipo: "Programa Interacción Social y Extensión Universitaria", cantidad: 1, nombres: ["Proyecto Comunitario"] },
        { tipo: "Programa Investigación", cantidad: 0 },
      ];
      const visibles = programasVisibles(programasPorTipo);
      expect(visibles).toHaveLength(1);
      expect(visibles[0].tipo).toBe("Programa Interacción Social y Extensión Universitaria");
      expect(visibles[0].cantidad).toBe(1);
      expect(getProgramaIcon(visibles[0].tipo)).toBe("mdi-account-group-outline");
      expect(formatProgramaTexto(visibles[0])).toBe("Programa Interacción Social y Extensión Universitaria: Proyecto Comunitario");
    });

    it("Soporta múltiples tipos con cantidad > 0 preservando orden y datos", () => {
      const programasPorTipo = [
        { tipo: "Programa Académico", cantidad: 2, nombres: ["Maestría 1", "Diplomado"] },
        { tipo: "Programa Investigación", cantidad: 3, nombres: ["Inv A", "Inv B", "Inv C"] },
        { tipo: "Programa Interacción Social y Extensión Universitaria", cantidad: 0 },
      ];
      const visibles = programasVisibles(programasPorTipo);
      expect(visibles).toHaveLength(2);
      expect(visibles.map((p) => p.tipo)).toEqual([
        "Programa Académico",
        "Programa Investigación",
      ]);
    });
  });

  describe("Criterio 4: Íconos institucionales de los 3 programas oficiales", () => {
    it("Preserva mdi-school-outline para programas Académicos", () => {
      expect(getProgramaIcon("Programa Académico")).toBe("mdi-school-outline");
      expect(getProgramaIcon("académico")).toBe("mdi-school-outline");
    });

    it("Preserva mdi-microscope para programas de Investigación", () => {
      expect(getProgramaIcon("Programa Investigación")).toBe("mdi-microscope");
      expect(getProgramaIcon("investigación")).toBe("mdi-microscope");
    });

    it("Preserva mdi-account-group-outline para programas de Interacción Social y Extensión", () => {
      expect(getProgramaIcon("Programa Interacción Social y Extensión Universitaria")).toBe("mdi-account-group-outline");
      expect(getProgramaIcon("interacción")).toBe("mdi-account-group-outline");
      expect(getProgramaIcon("extensión")).toBe("mdi-account-group-outline");
    });

    it("Usa mdi-folder-outline como fallback para otros programas", () => {
      expect(getProgramaIcon("Otro Tipo")).toBe("mdi-folder-outline");
      expect(getProgramaIcon(null)).toBe("mdi-folder-outline");
    });
  });

  describe("Criterio 5: Estabilidad geométrica del layout y anclaje de conectores", () => {
    it("Las constantes NODE_WIDTH, NODE_HEIGHT y V_GAP son coherentes y estables", () => {
      expect(NODE_WIDTH).toBe(320);
      expect(NODE_HEIGHT).toBe(235);
      expect(V_GAP).toBe(140);
      expect(getNodeHeight()).toBe(235);
    });

    it("Calcula layout ortogonal limpio con separación garantizada sin solapes", () => {
      const mockNodes = [
        {
          id: "33",
          parentId: null,
          data: {
            orden: 5,
            nombre: "RECTORADO",
            sigla: "REC",
            programasPorTipo: [],
            programasCount: 0,
          },
        },
        {
          id: "44",
          parentId: "33",
          data: {
            orden: 6,
            nombre: "VICERRECTORADO",
            sigla: "VR",
            programasPorTipo: [
              { tipo: "Programa Investigación", cantidad: 2 },
            ],
            programasCount: 2,
          },
        },
      ];

      const mockEdges = [
        { id: "e-33-44", source: "33", target: "44" },
      ];

      const { nodes, edges } = getLayoutedElements(mockNodes, mockEdges);

      expect(nodes).toHaveLength(2);
      expect(edges).toHaveLength(1);

      const rectorado = nodes.find((n) => n.id === "33");
      const vicerrectorado = nodes.find((n) => n.id === "44");

      // La distancia vertical entre rectorado y vicerrectorado respeta NODE_HEIGHT + V_GAP
      const distY = vicerrectorado.position.y - rectorado.position.y;
      expect(distY).toBe(NODE_HEIGHT + V_GAP);

      // El bus ortogonal está centrado verticalmente en el canal inter-nodo
      expect(edges[0].data?.busY).toBe(rectorado.position.y + NODE_HEIGHT + V_GAP / 2);
    });
  });

  describe("Criterio 6: Regla de filtrado visual en PDF", () => {
    it("Aplica la misma regla de progsVisibles con cantidad > 0 y fallback de programasCount", () => {
      function resolverLineasPdf(nodeData) {
        const progsVisibles = programasVisibles(nodeData?.programasPorTipo);
        const hasProgramasFallback =
          progsVisibles.length === 0 && Number(nodeData?.programasCount || 0) > 0;
        const hasTipo = Boolean(nodeData?.tipo && nodeData.tipo !== "---");
        const hasNivel = Boolean(nodeData?.nivel && nodeData.nivel !== "---");

        return {
          progsVisibles,
          hasProgramasFallback,
          totalLines:
            (hasTipo ? 1 : 0) +
            (hasNivel ? 1 : 0) +
            (progsVisibles.length > 0 ? progsVisibles.length : (hasProgramasFallback ? 1 : 0)),
        };
      }

      // Nodo sin programas
      const resSinProg = resolverLineasPdf({
        tipo: "Sustantivo",
        nivel: "Directivo",
        programasPorTipo: [{ tipo: "Académico", cantidad: 0 }],
        programasCount: 0,
      });
      expect(resSinProg.progsVisibles).toHaveLength(0);
      expect(resSinProg.hasProgramasFallback).toBe(false);
      expect(resSinProg.totalLines).toBe(2); // Solo tipo y nivel

      // Nodo con 1 programa
      const resConProg = resolverLineasPdf({
        tipo: "Sustantivo",
        nivel: "Directivo",
        programasPorTipo: [
          { tipo: "Programa Investigación", cantidad: 1 },
          { tipo: "Programa Académico", cantidad: 0 },
        ],
        programasCount: 1,
      });
      expect(resConProg.progsVisibles).toHaveLength(1);
      expect(resConProg.totalLines).toBe(3); // tipo + nivel + 1 programa

      // Nodo con programasCount pero sin desglose detallado
      const resFallback = resolverLineasPdf({
        tipo: "Sustantivo",
        nivel: "Directivo",
        programasPorTipo: [],
        programasCount: 4,
      });
      expect(resFallback.progsVisibles).toHaveLength(0);
      expect(resFallback.hasProgramasFallback).toBe(true);
      expect(resFallback.totalLines).toBe(3); // tipo + nivel + fallback
    });
  });
});
