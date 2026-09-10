import { createCatalogStore } from "./factory";
import { ENDPOINTS } from "../config/api";

const normalizeDescription = (descripcion) =>
  descripcion == null || String(descripcion).trim() === ""
    ? null
    : String(descripcion).trim();

const buildCreateCargoPayload = (nombre, descripcion = null, activo = true, parentId = null) => {
  const body = {
    nombre: String(nombre).trim(),
    descripcion: normalizeDescription(descripcion),
    activo,
  };
  if (parentId != null) {
    body.parentId = parentId;
  }
  return body;
};

const buildUpdateCargoPayload = (nombre, descripcion = null, activo = true) => ({
  nombre: String(nombre).trim(),
  descripcion: normalizeDescription(descripcion),
  activo,
});

export const useAllCargosMofStore = createCatalogStore({
  storeId: "cargos_mof",
  endpoint: ENDPOINTS.UNIDADES.CARGOS,
  stateKey: "cargos",
  actionNames: {
    fetch: "getFetchCargos",
    create: "createCargo",
    update: "updateCargo",
    delete: "deleteCargo",
  },
  buildCreatePayload: buildCreateCargoPayload,
  buildUpdatePayload: buildUpdateCargoPayload,
  extraActions: ({ endpoint, fetchItems, executeWithLoading, apiFetch, parseApiError, error400Message }) => ({
    setParentCargo: (id, parentId, razon) =>
      executeWithLoading(async () => {
        const body = { parentId: parentId == null ? null : Number(parentId) };
        if (razon) body.razon = razon;

        const response = await apiFetch(`${endpoint}/${id}/setparent`, {
          method: "PUT",
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response, error400Message));
        }

        await fetchItems();
        return true;
      }),
  }),
});
