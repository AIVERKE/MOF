import { describe, it, expect } from "vitest";
import { normalizeText, isStaffNode, isUnidadOficial } from "@/utils/mofHelpers";

describe("MOF-062: Filtro de Relación y KPIs en Organigrama", () => {
  const relacionesCatalogo = [
    { id: 1, codigo: "L", descripcion: "Lineal", activo: true },
    { id: 2, codigo: "S", descripcion: "Staff", activo: true },
    { id: 3, codigo: "F", descripcion: "Funcional", activo: true },
  ];

  const mockUnidades = [
    {
      id: 101,
      codigo: "1.0",
      nombre: "Rectorado",
      relacion: "L",
      str_relacion: "Lineal",
      relacion_id: 1,
      oficial: true,
      es_staff: false,
    },
    {
      id: 102,
      codigo: "1.1",
      nombre: "Asesoría Jurídica",
      relacion: "S",
      str_relacion: "Staff",
      relacion_id: 2,
      oficial: true,
      es_staff: true,
    },
    {
      id: 103,
      codigo: "1.2",
      nombre: "Auditoría Interna",
      relacion: "S",
      str_relacion: "Staff",
      relacion_id: 2,
      oficial: false,
      es_staff: true,
    },
    {
      id: 104,
      codigo: "2.0",
      nombre: "Secretaría General",
      relacion: "L",
      str_relacion: "Lineal",
      relacion_id: 1,
      oficial: false,
      es_staff: false,
    },
  ];

  /**
   * Lógica exacta de resolución de relación implementada en OrganigramaVueFlow.vue
   */
  function filtrarUnidades(unidades, filterRelacionVal) {
    const getFilterId = (val) =>
      val && typeof val === "object"
        ? String(val.id || "").trim()
        : String(val || "").trim();

    const activeRelacionId = getFilterId(filterRelacionVal);

    let expectedRelacionCode = "";
    let expectedRelacionDesc = "";
    let isFilterForStaff = false;
    if (activeRelacionId) {
      const item = relacionesCatalogo.find(
        (r) =>
          String(r.id) === activeRelacionId ||
          String(r.value) === activeRelacionId,
      );
      if (item) {
        expectedRelacionCode = normalizeText(item.codigo || item.value || "");
        expectedRelacionDesc = normalizeText(
          item.descripcion || item.description || item.nombre || "",
        );
        isFilterForStaff =
          expectedRelacionCode === "s" ||
          expectedRelacionDesc.includes("staff") ||
          expectedRelacionDesc.includes("asesor");
      }
    }

    return unidades.filter((u) => {
      if (activeRelacionId) {
        const uRelNorm = normalizeText(u.relacion);
        const uStrRelNorm = normalizeText(u.str_relacion);
        const uRelIdStr = String(u.relacion_id ?? u.relacionId ?? "");

        const matchesId =
          (uRelIdStr && uRelIdStr === activeRelacionId) ||
          (uRelNorm && uRelNorm === activeRelacionId);
        const matchesCode =
          expectedRelacionCode &&
          (uRelNorm === expectedRelacionCode ||
            uStrRelNorm === expectedRelacionCode);
        const matchesDesc =
          expectedRelacionDesc &&
          (uStrRelNorm === expectedRelacionDesc ||
            uRelNorm === expectedRelacionDesc);
        const matchesStaff =
          isFilterForStaff && isStaffNode(u, relacionesCatalogo);

        if (!matchesId && !matchesCode && !matchesDesc && !matchesStaff) {
          return false;
        }
      }
      return true;
    });
  }

  function calcularKPIs(unidades, unidadesFiltradas, hasAnyFilter) {
    const baseList = hasAnyFilter ? unidadesFiltradas : unidades;
    const oficiales = baseList.filter((u) => isUnidadOficial(u));
    return {
      total: baseList.length,
      oficiales: oficiales.length,
      noOficiales: baseList.length - oficiales.length,
      staff: baseList.filter((u) => isStaffNode(u, relacionesCatalogo)).length,
    };
  }

  it("filtra correctamente por relación Lineal (id: 1) comparando código L / descripción", () => {
    // SelectAllRelaciones emite id numérico: 1
    const filtradas = filtrarUnidades(mockUnidades, 1);
    expect(filtradas).toHaveLength(2);
    expect(filtradas.map((u) => u.codigo)).toEqual(["1.0", "2.0"]);
  });

  it("filtra correctamente por relación Staff (id: 2)", () => {
    // SelectAllRelaciones emite id numérico: 2
    const filtradas = filtrarUnidades(mockUnidades, 2);
    expect(filtradas).toHaveLength(2);
    expect(filtradas.map((u) => u.codigo)).toEqual(["1.1", "1.2"]);
  });

  it("restaura todas las unidades al limpiar el filtro (null)", () => {
    const filtradas = filtrarUnidades(mockUnidades, null);
    expect(filtradas).toHaveLength(4);
  });

  it("los KPIs reflejan el total filtrado cuando hay filtros activos", () => {
    // Filtro activo: Staff (id: 2) -> 2 unidades (1 oficial, 1 no oficial, 2 staff)
    const filtradas = filtrarUnidades(mockUnidades, 2);
    const kpis = calcularKPIs(mockUnidades, filtradas, true);

    expect(kpis.total).toBe(2);
    expect(kpis.oficiales).toBe(1);
    expect(kpis.noOficiales).toBe(1);
    expect(kpis.staff).toBe(2);
  });

  it("los KPIs reflejan el total filtrado cuando se filtra por Lineal", () => {
    // Filtro activo: Lineal (id: 1) -> 2 unidades (1 oficial, 1 no oficial, 0 staff)
    const filtradas = filtrarUnidades(mockUnidades, 1);
    const kpis = calcularKPIs(mockUnidades, filtradas, true);

    expect(kpis.total).toBe(2);
    expect(kpis.oficiales).toBe(1);
    expect(kpis.noOficiales).toBe(1);
    expect(kpis.staff).toBe(0);
  });

  it("los KPIs reflejan el total global cuando no hay filtros activos", () => {
    const filtradas = filtrarUnidades(mockUnidades, null);
    const kpis = calcularKPIs(mockUnidades, filtradas, false);

    expect(kpis.total).toBe(4);
    expect(kpis.oficiales).toBe(2);
    expect(kpis.noOficiales).toBe(2);
    expect(kpis.staff).toBe(2);
  });
});
