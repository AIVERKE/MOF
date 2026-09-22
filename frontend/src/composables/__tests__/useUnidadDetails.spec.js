import { describe, it, expect, beforeEach, vi } from "vitest";

const mostrarMock = vi.fn();

vi.mock("@/composables/useSnackbar", () => ({
  useSnackbar: () => ({ mostrar: mostrarMock }),
}));

import { ENDPOINTS } from "@/config/api";
import { useUnidadDetails } from "../useUnidadDetails";

// El backend exige sesión también para LEER el organigrama, y abrir la URL
// del PDF con window.open(url) es una navegación: no lleva el header
// Authorization y el backend responde 401.
describe("useUnidadDetails - verReporte (PDF de la unidad)", () => {
  let pestana;

  beforeEach(() => {
    localStorage.clear();
    mostrarMock.mockClear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    pestana = { location: { href: "" }, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(pestana);
    URL.createObjectURL = vi.fn(() => "blob:pdf-de-prueba");
    URL.revokeObjectURL = vi.fn();
  });

  it("pide el PDF con el token de la sesión y lo muestra en la pestaña nueva", async () => {
    localStorage.setItem("token", "jwt-token-123");
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(new Blob(["%PDF-1.4"], { type: "application/pdf" }), {
        status: 200,
      }),
    );
    globalThis.fetch = mockFetch;
    const { verReporte } = useUnidadDetails({ unidadesStore: {} });

    await verReporte(7);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe(ENDPOINTS.MOF.PDF_UNIDAD(7));
    expect(options.headers.get("Authorization")).toBe("Bearer jwt-token-123");
    // la pestaña se abre vacía, dentro del clic (si no, el navegador la
    // bloquea como popup), y recién después se le carga el PDF
    expect(window.open).toHaveBeenCalledTimes(1);
    expect(window.open).toHaveBeenCalledWith("", "_blank");
    expect(pestana.location.href).toBe("blob:pdf-de-prueba");
    expect(mostrarMock).not.toHaveBeenCalled();
  });

  it("si el navegador bloquea la pestaña, abre el PDF igual al tenerlo", async () => {
    window.open.mockReturnValueOnce(null);
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(new Blob(["%PDF-1.4"]), { status: 200 }),
    );
    const { verReporte } = useUnidadDetails({ unidadesStore: {} });

    await verReporte(7);

    expect(window.open).toHaveBeenLastCalledWith("blob:pdf-de-prueba", "_blank");
  });

  it("si el backend responde con error, cierra la pestaña y avisa", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Unidad no encontrada" }), {
        status: 404,
      }),
    );
    const { verReporte } = useUnidadDetails({ unidadesStore: {} });

    await verReporte(7);

    expect(pestana.close).toHaveBeenCalled();
    expect(pestana.location.href).toBe("");
    expect(mostrarMock).toHaveBeenCalledWith("Unidad no encontrada", "error");
  });

  it("con la sesión vencida (401) cierra la pestaña sin otro aviso: apiFetch ya manda al login", async () => {
    localStorage.setItem("token", "vencido");
    const assign = vi.fn();
    vi.stubGlobal("location", { pathname: "/mof/listar-unidades", assign });
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errorCode: "UNAUTHORIZED" }), {
        status: 401,
      }),
    );
    const { verReporte } = useUnidadDetails({ unidadesStore: {} });

    await verReporte(7);

    expect(pestana.close).toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith("/");
    expect(mostrarMock).not.toHaveBeenCalled();
  });

  it("si la red falla, cierra la pestaña y avisa", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const { verReporte } = useUnidadDetails({ unidadesStore: {} });

    await verReporte(7);

    expect(pestana.close).toHaveBeenCalled();
    expect(mostrarMock).toHaveBeenCalledWith("Error al abrir el reporte", "error");
  });
});
