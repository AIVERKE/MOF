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
