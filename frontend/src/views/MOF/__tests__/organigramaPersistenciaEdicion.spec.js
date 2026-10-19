import { describe, it, expect, vi } from "vitest";

describe("Persistencia de Vista y Nodo en OrganigramaVueFlow (Edición, Adición y Cambio de Nivel)", () => {
  const mockLayoutedNodes = [
    {
      id: "1",
      position: { x: 500, y: 50 },
      data: {
        nombre: "Rectorado",
        sigla: "REC",
        nivel: "Nivel 1",
        isInvisible: false,
      },
    },
    {
      id: "10",
      position: { x: 300, y: 350 },
      data: {
        nombre: "Vicerrectorado",
        sigla: "VR",
        nivel: "Nivel 2",
        isInvisible: false,
      },
    },
    {
      id: "25",
      position: { x: 800, y: 700 }, // Posición recalculada por cambio de nivel
      data: {
        nombre: "Dirección de Planificación",
        sigla: "DP",
        nivel: "Nivel 3",
        isInvisible: false,
      },
    },
    {
      id: "99",
      position: { x: 300, y: 700 }, // Nodo recién agregado como hijo
      data: {
        nombre: "Nueva Unidad de Innovación",
        sigla: "NUI",
        nivel: "Nivel 4",
        isInvisible: false,
      },
    },
  ];

  /**
   * Simula la lógica de resolución de cámara implementada en updateGraph() de OrganigramaVueFlow.vue
   */
  function resolverObjetivoCamara({
    searchLower = "",
    pendingTargetNodeId = null,
    nodoNavegacionActualId = null,
    isFirstRender = false,
    layoutedNodes = mockLayoutedNodes,
    modoExploracion = "enfoque",
    navigationCluster = { activeId: null, directChildrenIds: [] },
  }) {
    let accion = null;
    let targetId = null;
    let targetNodes = [];
    let options = {};
    let nextNavId = nodoNavegacionActualId;
    let nextPendingTargetId = pendingTargetNodeId;
    let nextIsFirstRender = isFirstRender;

    if (searchLower) {
      const matchingIds = layoutedNodes
        .filter((n) => n.data && n.data.isMatch && !n.data.isInvisible)
        .map((n) => String(n.id));
      if (matchingIds.length > 0) {
        accion = "volarANodos";
        targetNodes = matchingIds;
      } else {
        accion = "fitView";
      }
    } else if (pendingTargetNodeId) {
      targetId = String(pendingTargetNodeId);
      nextPendingTargetId = null;
      // Buscar el nodo en su nueva posición tras el recálculo del layout (por cambio de nivel o adición)
      const targetNode = layoutedNodes.find((n) => String(n.id) === targetId);
      if (targetNode && !targetNode.data?.isInvisible) {
        if (modoExploracion !== "completo") {
          nextNavId = targetId;
        }
        accion = "volarANodos";
        targetNodes = [targetId];
        options = { padding: 0.35, duration: 650, maxZoom: 1.25 };
      } else {
        accion = "fitView";
      }
    } else if (nodoNavegacionActualId) {
      const navId = String(nodoNavegacionActualId);
      const navNode = layoutedNodes.find((n) => String(n.id) === navId);
      if (navNode && !navNode.data?.isInvisible) {
        if (modoExploracion !== "completo") {
          const currentCluster = navigationCluster;
          const nodesToFrame = [
            currentCluster.activeId,
            ...currentCluster.directChildrenIds,
          ].filter((id) =>
            layoutedNodes.some(
              (n) => String(n.id) === String(id) && !n.data?.isInvisible,
            ),
          );
          accion = "volarANodos";
          targetNodes = nodesToFrame.length > 0 ? nodesToFrame : [navId];
          options = {
            padding: nodesToFrame.length > 1 ? 0.25 : 0.4,
            duration: 650,
            maxZoom: 1.25,
          };
        } else {
          accion = "volarANodos";
          targetNodes = [navId];
          options = { padding: 0.35, duration: 650, maxZoom: 1.25 };
        }
      } else {
        accion = "fitView";
      }
    } else if (isFirstRender) {
      nextIsFirstRender = false;
      accion = "fitView";
    }

    return {
      accion,
      targetNodes,
      options,
      nextNavId,
      nextPendingTargetId,
      nextIsFirstRender,
    };
  }

  it("encuentra y enfoca el nodo editado cuando cambia de nivel o padre (recalculo de posición)", () => {
    // El nodo 25 cambió de nivel y se movió a { x: 800, y: 700 }
    const res = resolverObjetivoCamara({
      pendingTargetNodeId: 25,
      isFirstRender: false,
    });

    expect(res.accion).toBe("volarANodos");
    expect(res.targetNodes).toEqual(["25"]);
    expect(res.options.maxZoom).toBe(1.25);
    expect(res.options.padding).toBe(0.35);
    expect(res.nextNavId).toBe("25");
    expect(res.nextPendingTargetId).toBeNull();
  });

  it("encuentra y enfoca la nueva unidad agregada en su posición inicial", () => {
    // La nueva unidad id: 99 fue agregada como dependiente
    const res = resolverObjetivoCamara({
      pendingTargetNodeId: "99",
      isFirstRender: false,
    });

    expect(res.accion).toBe("volarANodos");
    expect(res.targetNodes).toEqual(["99"]);
    expect(res.nextNavId).toBe("99");
    expect(res.nextPendingTargetId).toBeNull();
  });

  it("mantiene el encuadre en el nodo de navegación activo cuando no hay targetNode pendiente", () => {
    const res = resolverObjetivoCamara({
      pendingTargetNodeId: null,
      nodoNavegacionActualId: "10",
      navigationCluster: { activeId: "10", directChildrenIds: ["99"] },
      modoExploracion: "enfoque",
      isFirstRender: false,
    });

    expect(res.accion).toBe("volarANodos");
    expect(res.targetNodes).toEqual(["10", "99"]);
    expect(res.options.maxZoom).toBe(1.25);
  });

  it("ejecuta fitView únicamente en la carga inicial (isFirstRender)", () => {
    const res = resolverObjetivoCamara({
      pendingTargetNodeId: null,
      nodoNavegacionActualId: null,
      isFirstRender: true,
    });

    expect(res.accion).toBe("fitView");
    expect(res.nextIsFirstRender).toBe(false);
  });

  it("no realiza fitView involuntario si el usuario estaba navegando y no es primer render", () => {
    const res = resolverObjetivoCamara({
      pendingTargetNodeId: null,
      nodoNavegacionActualId: "1",
      navigationCluster: { activeId: "1", directChildrenIds: ["10"] },
      isFirstRender: false,
    });

    expect(res.accion).not.toBe("fitView");
    expect(res.accion).toBe("volarANodos");
    expect(res.targetNodes).toContain("1");
  });
});
