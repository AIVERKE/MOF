import { describe, it, expect, beforeEach, vi } from "vitest";

const mostrarMock = vi.fn();

vi.mock("@/composables/useSnackbar", () => ({
  useSnackbar: () => ({ mostrar: mostrarMock }),
}));

import { apiFetch, parseApiError } from "../api";

describe("api.js - apiFetch y parseApiError", () => {
  beforeEach(() => {
    localStorage.clear();
    mostrarMock.mockClear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("apiFetch", () => {
    it("debe agregar Cache-Control: no-store y Content-Type: application/json por defecto", async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
      globalThis.fetch = mockFetch;

      await apiFetch("http://localhost:3000/test");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("http://localhost:3000/test");
      expect(options.headers.get("Cache-Control")).toBe("no-store");
      expect(options.headers.get("Content-Type")).toBe("application/json");
      expect(options.headers.get("Authorization")).toBeNull();
    });

    it("debe inyectar Authorization: Bearer <token> si existe token en localStorage", async () => {
      localStorage.setItem("token", "jwt-token-123");
      const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
      globalThis.fetch = mockFetch;

      await apiFetch("http://localhost:3000/test");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.get("Authorization")).toBe("Bearer jwt-token-123");
    });

    it("no debe forzar Content-Type application/json si el body es FormData", async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
      globalThis.fetch = mockFetch;
      const formData = new FormData();
      formData.append("file", "test");

      await apiFetch("http://localhost:3000/upload", {
        method: "POST",
        body: formData,
      });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.get("Content-Type")).toBeNull();
    });

    it("debe respetar cabeceras personalizadas", async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
      globalThis.fetch = mockFetch;

      await apiFetch("http://localhost:3000/test", {
        headers: {
          "X-Custom-Header": "CustomValue",
        },
      });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.get("X-Custom-Header")).toBe("CustomValue");
      expect(options.headers.get("Cache-Control")).toBe("no-store");
    });

    it("en 401 limpia sesión y redirige al login (excepto /auth/login)", async () => {
      localStorage.setItem("token", "expired");
      localStorage.setItem("user", "{}");
      const assign = vi.fn();
      vi.stubGlobal("location", {
        pathname: "/dashboard",
        assign,
      });
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ errorCode: "UNAUTHORIZED" }), {
          status: 401,
        }),
      );

      await apiFetch("http://localhost:3000/api/v1/mof/unidades");

      expect(localStorage.getItem("token")).toBeNull();
      expect(localStorage.getItem("user")).toBeNull();
      expect(assign).toHaveBeenCalledWith("/");
    });

    it("en 403 muestra aviso de permisos", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ errorCode: "FORBIDDEN" }), {
          status: 403,
        }),
      );

      await apiFetch("http://localhost:3000/seguridad/usuarios");
      expect(mostrarMock).toHaveBeenCalledWith(
        "Sin permisos para realizar esta acción",
        "error",
      );
    });
  });

  describe("parseApiError", () => {
    it("debe extraer data.data.mensaje (formato UMSA-CORE)", async () => {
      const response = new Response(
        JSON.stringify({
          status: false,
          data: { mensaje: "Error de lógica de negocio UMSA" },
        }),
        { status: 400 }
      );

      const msg = await parseApiError(response);
      expect(msg).toBe("Error de lógica de negocio UMSA");
    });

    it("debe extraer data.mensaje", async () => {
      const response = new Response(
        JSON.stringify({
          mensaje: "Mensaje textual directo",
        }),
        { status: 422 }
      );

      const msg = await parseApiError(response);
      expect(msg).toBe("Mensaje textual directo");
    });

    it("debe extraer data.message cuando no es el genérico", async () => {
      const response = new Response(
        JSON.stringify({
          message: "El nombre del tipo ya existe en la base de datos",
        }),
        { status: 409 }
      );

      const msg = await parseApiError(response);
      expect(msg).toBe("El nombre del tipo ya existe en la base de datos");
    });

    it("debe formatear arrays de validación (NestJS class-validator)", async () => {
      const response = new Response(
        JSON.stringify({
          message: ["descripcion no debe estar vacío", "activo debe ser booleano"],
        }),
        { status: 400 }
      );

      const msg = await parseApiError(response);
      expect(msg).toBe("descripcion no debe estar vacío, activo debe ser booleano");
    });

    it("debe extraer y formatear data.errors tipo objeto", async () => {
      const response = new Response(
        JSON.stringify({
          errors: {
            nombre: ["El nombre es requerido"],
            codigo: ["El código es inválido"],
          },
        }),
        { status: 422 }
      );

      const msg = await parseApiError(response);
      expect(msg).toBe("El nombre es requerido, El código es inválido");
    });

    it("debe sustituir 'Hay errores en la solicitud' en status 400 por el mensaje por defecto", async () => {
      const response = new Response(
        JSON.stringify({
          status: false,
          message: "Hay errores en la solicitud",
        }),
        { status: 400 }
      );

      const msg = await parseApiError(response);
      expect(msg).toBe("No se puede realizar la acción: Existen dependencias o restricciones de integridad.");
    });

    it("debe permitir configurar el mensaje 400 para clases", async () => {
      const response = new Response(
        JSON.stringify({
          status: false,
          message: "Hay errores en la solicitud",
        }),
        { status: 400 }
      );

      const msg = await parseApiError(
        response,
        "No se puede realizar la acción: Existen dependencias activas en el organigrama."
      );
      expect(msg).toBe("No se puede realizar la acción: Existen dependencias activas en el organigrama.");
    });

    it("debe priorizar un error textual específico del backend sobre el fallback de 400", async () => {
      const response = new Response(
        JSON.stringify({
          message: "La clase contiene unidades asignadas: Dirección General",
        }),
        { status: 400 }
      );

      const msg = await parseApiError(
        response,
        "No se puede realizar la acción: Existen dependencias activas en el organigrama."
      );
      expect(msg).toBe("La clase contiene unidades asignadas: Dirección General");
    });

    it("debe funcionar cuando se le pasa un payload plano en lugar de Response", async () => {
      const payload = {
        message: "Error procesado previamente",
      };

      const msg = await parseApiError(payload, { status: 400 });
      expect(msg).toBe("Error procesado previamente");
    });

    it("prioriza errorCode del catálogo sobre message", async () => {
      const msg = await parseApiError({
        status: false,
        message: "texto genérico",
        errorCode: "UNIDAD_CODIGO_DUPLICADO",
      });
      expect(msg).toBe("Ya existe una unidad con ese código");
    });

    it("degrada al message si no hay errorCode", async () => {
      const msg = await parseApiError({
        status: false,
        message: "Mensaje legacy del backend",
      });
      expect(msg).toBe("Mensaje legacy del backend");
    });

    it("traduce mensajes class-validator en inglés", async () => {
      const msg = await parseApiError({
        errorCode: "VALIDATION_FAILED",
        message: "email must be an email, password must be longer than or equal to 6 characters",
      });
      expect(msg).toContain("debe ser un correo válido");
      expect(msg).toContain("debe tener al menos 6 caracteres");
    });
  });
});
