import { describe, it, expect } from "vitest";
import { hints } from "../hints";

describe("hints configuration", () => {
  it("contiene los conceptos clave del dominio MOF", () => {
    expect(hints.conceptos).toBeDefined();
    expect(hints.conceptos.clase).toBeTruthy();
    expect(hints.conceptos.nivel).toBeTruthy();
    expect(hints.conceptos.tipo).toBeTruthy();
    expect(hints.conceptos.relacion).toBeTruthy();
    expect(hints.conceptos.baseLegal).toBeTruthy();
  });

  it("todos los conceptos tienen una longitud adecuada para tooltips (~90 a 140 caracteres)", () => {
    Object.entries(hints.conceptos).forEach(([key, text]) => {
      expect(typeof text).toBe("string");
      expect(text.length).toBeGreaterThanOrEqual(50);
      expect(text.length).toBeLessThanOrEqual(200);
    });
  });

  it("contiene hints para todos los campos de unidadForm", () => {
    const requiredFields = [
      "nombre",
      "sigla",
      "codigo",
      "resCreacion",
      "fecCreacion",
      "objetivo",
      "dependenciasFuncionales",
      "tipo",
      "nivel",
      "relacion",
      "cargos",
      "clase",
      "funcion",
      "baseLegal",
    ];

    requiredFields.forEach((field) => {
      expect(hints.unidadForm[field]).toBeTruthy();
      expect(typeof hints.unidadForm[field]).toBe("string");
    });
  });

  it("contiene hints para unidadDependency", () => {
    expect(hints.unidadDependency.unidadACambiar).toBeTruthy();
    expect(hints.unidadDependency.unidadDestino).toBeTruthy();
    expect(hints.unidadDependency.razon).toBeTruthy();
  });

  it("contiene hints para los 5 catálogos (clases, niveles, tipos, relaciones, cargos)", () => {
    expect(hints.clases.select).toBeTruthy();
    expect(hints.clases.nombre).toBeTruthy();

    expect(hints.niveles.select).toBeTruthy();
    expect(hints.niveles.nombre).toBeTruthy();

    expect(hints.tipos.select).toBeTruthy();
    expect(hints.tipos.nombre).toBeTruthy();

    expect(hints.relaciones.select).toBeTruthy();
    expect(hints.relaciones.nombre).toBeTruthy();

    expect(hints.cargos.select).toBeTruthy();
    expect(hints.cargos.nombre).toBeTruthy();
    expect(hints.cargos.descripcion).toBeTruthy();
  });

  it("contiene hints para login y usuarios", () => {
    expect(hints.login.email).toBeTruthy();
    expect(typeof hints.login.password).toBe("function");
    expect(hints.login.password(10)).toContain("10");
    expect(hints.login.ci).toBeTruthy();
    expect(typeof hints.login.passwordNueva).toBe("function");
    expect(hints.login.passwordNueva(10)).toContain("10");
    expect(hints.login.passwordConfirmacion).toBeTruthy();

    expect(hints.usuarios.ci).toBeTruthy();
    expect(hints.usuarios.nombres).toBeTruthy();
    expect(hints.usuarios.apellidoPaterno).toBeTruthy();
    expect(hints.usuarios.apellidoMaterno).toBeTruthy();
    expect(hints.usuarios.email).toBeTruthy();
    expect(hints.usuarios.passwordEdit).toBeTruthy();
    expect(hints.usuarios.rol).toBeTruthy();
    expect(hints.usuarios.estado).toBeTruthy();
  });

  it("contiene textos para dashboards", () => {
    expect(hints.dashboards.ejecutivo.title).toBeTruthy();
    expect(hints.dashboards.ejecutivo.text).toBeTruthy();
    expect(hints.dashboards.facultativo.title).toBeTruthy();
    expect(hints.dashboards.facultativo.text).toBeTruthy();
  });
});
