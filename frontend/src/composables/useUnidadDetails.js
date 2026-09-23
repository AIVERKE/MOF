import { ref } from "vue";
import { ENDPOINTS, apiFetch, parseApiError } from "@/config/api";
import { useSnackbar } from "@/composables/useSnackbar";

/**
 * Shared helpers for loading unidad detail drawer data and opening the PDF report.
 * @param {{ unidadesStore: object }} options
 */
export function useUnidadDetails({ unidadesStore }) {
  const { mostrar } = useSnackbar();
  const detailsDrawer = ref(false);
  const detailData = ref(null);
  const loadingDetail = ref(false);
  const initialOpenPanels = ref([]);

  async function loadUnidadDetails(unidadId, { openPanels = [] } = {}) {
    loadingDetail.value = true;
    detailsDrawer.value = true;
    detailData.value = null;
    initialOpenPanels.value = openPanels;
    try {
      const [data, personal] = await Promise.all([
        unidadesStore.getUnidadById(unidadId),
        unidadesStore.getPersonalUnidad(unidadId),
      ]);
      if (data) {
        const dependenciasDetalle = (data.dependenciasFuncionales || []).map(
          (dep) => {
            if (typeof dep === "object" && (dep.denominacion || dep.nombre)) {
              return dep.denominacion || dep.nombre;
            }
            const id = typeof dep === "object" ? dep.id : dep;
            const unidadFound = unidadesStore.unidades.find(
              (u) => String(u.id) === String(id),
            );
            return unidadFound
              ? unidadFound.nombre || unidadFound.denominacion
              : "ID: " + id;
          },
        );
        const mappedRelInternas = (data.relacionesInternas || []).map((r) => {
          const relId = r.relacionadaId || r.unidadDestinoId || r.id;
          const found = (unidadesStore.unidades || []).find(
            (u) => String(u.id) === String(relId),
          );
          return {
            id: r.id,
            relacionadaId: relId,
            codigo: r.codigo || found?.codigo || "",
            sigla: r.sigla || found?.sigla || "",
            nombre:
              r.nombre ||
              r.denominacion ||
              r.unidadDestinoNombre ||
              found?.nombre ||
              found?.denominacion ||
              (relId ? `Unidad #${relId}` : "Sin denominación"),
            tipo: r.tipo || r.descripcion || null,
          };
        });

        detailData.value = {
          ...data,
          nombre_display: data.denominacion || data.nombre,
          objetivo_display: data.objetivo_puesto || data.objetivo,
          dependencias_nombres: dependenciasDetalle,
          cargos_detalle: Array.isArray(personal) ? personal : [],
          dependencia_lineal_nombre: data.parent?.nombre || data.dependencia || null,
          hijas_lineales: Array.isArray(data.hijasLineales) ? data.hijasLineales : [],
          hijas_funcionales: Array.isArray(data.hijasFuncionales) ? data.hijasFuncionales : [],
          relaciones_internas: mappedRelInternas,
          relaciones_externas: Array.isArray(data.relacionesExternas) ? data.relacionesExternas : [],
          tramites_atendidos: data.tramitesAtendidos || data.tramites_atendidos || null,
          ejecucion_poa: data.ejecucionPoa || data.ejecucion_poa || null,
          ejecucion_presupuestaria: data.ejecucionPresupuestaria || data.ejecucion_presupuestaria || null,
          carga_horaria_programada: data.cargaHorariaProgramada || data.carga_horaria_programada || null,
          carga_horaria_ejecutada: data.cargaHorariaEjecutada || data.carga_horaria_ejecutada || null,
          infraestructura: data.infraestructura || data.infraestructura_fisica || null,
          ubicacion: data.ubicacion || null,
          fec_creacion: data.fecCreacion || data.fec_creacion || null,
        };
      }
    } catch (e) {
      mostrar("Error al cargar detalles", "error");
    } finally {
      loadingDetail.value = false;
    }
  }

  function showDetails(unidadId) {
    return loadUnidadDetails(unidadId, { openPanels: [] });
  }

  function showDependenciasInDrawer(unidadId) {
    return loadUnidadDetails(unidadId, { openPanels: ["dependencias"] });
  }

  /**
   * Abre el PDF de la unidad en una pestaña nueva.
   *
   * El backend exige sesión también para leer, y window.open(url) es una
   * navegación: no lleva el header Authorization. Por eso el PDF se pide con
   * apiFetch (que manda el token) y se abre como blob. La pestaña se abre
   * vacía ANTES de esperar la respuesta, dentro del clic: abierta después, el
   * navegador la bloquea como popup.
   */
  async function verReporte(id) {
    const pestana = window.open("", "_blank");
    try {
      const response = await apiFetch(ENDPOINTS.MOF.PDF_UNIDAD(id));
      if (!response.ok) {
        pestana?.close();
        // 401 y 403 ya los atiende apiFetch (login y aviso de permisos)
        if (response.status !== 401 && response.status !== 403) {
          mostrar(await parseApiError(response), "error");
        }
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      if (pestana) {
        pestana.location.href = url;
      } else {
        window.open(url, "_blank");
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      pestana?.close();
      mostrar("Error al abrir el reporte", "error");
    }
  }

  return {
    detailsDrawer,
    detailData,
    loadingDetail,
    initialOpenPanels,
    loadUnidadDetails,
    showDetails,
    showDependenciasInDrawer,
    verReporte,
  };
}
