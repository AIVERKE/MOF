import { createCatalogStore } from "./factory";
import { ENDPOINTS } from "../config/api";

const buildClasePayload = (descripcion, color, activo = true, oficial = true) => ({
  descripcion,
  color,
  activo: !!activo,
  oficial: !!oficial,
});

export const useAllClasesMofStore = createCatalogStore({
  storeId: "clases_mof",
  endpoint: ENDPOINTS.MOF.CLASES,
  stateKey: "clases",
  actionNames: {
    fetch: "getFetchClases",
    create: "createClase",
    update: "updateClase",
    delete: "deleteClase",
  },
  buildCreatePayload: buildClasePayload,
  buildUpdatePayload: buildClasePayload,
  error400Message:
    "No se puede realizar la acción: Existen dependencias activas en el organigrama.",
  extraActions: ({ endpoint, fetchItems, executeWithLoading, apiFetch, parseApiError, error400Message }) => ({
    subirClase: (id) =>
      executeWithLoading(async () => {
        const response = await apiFetch(`${endpoint}/${id}/subir`, {
          method: "PUT",
        });
        if (!response.ok) {
          throw new Error(await parseApiError(response, error400Message));
        }
        await fetchItems();
        return true;
      }),
    bajarClase: (id) =>
      executeWithLoading(async () => {
        const response = await apiFetch(`${endpoint}/${id}/bajar`, {
          method: "PUT",
        });
        if (!response.ok) {
          throw new Error(await parseApiError(response, error400Message));
        }
        await fetchItems();
        return true;
      }),
  }),
});