import { ref } from "vue";
import { ENDPOINTS } from "@/config/api";
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
            const id = typeof dep === "object" ? dep.id : dep;
            const unidadFound = unidadesStore.unidades.find(
              (u) => String(u.id) === String(id),
            );
            return unidadFound
              ? unidadFound.nombre || unidadFound.denominacion
              : "ID: " + id;
          },
        );
        detailData.value = {
          ...data,
          nombre_display: data.denominacion || data.nombre,
          objetivo_display: data.objetivo_puesto || data.objetivo,
          dependencias_nombres: dependenciasDetalle,
          cargos_detalle: Array.isArray(personal) ? personal : [],
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

  function verReporte(id) {
    window.open(ENDPOINTS.MOF.PDF_UNIDAD(id), "_blank");
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
