import { createCatalogStore } from "./factory";
import { ENDPOINTS } from "../config/api";

const normalizeDescription = (descripcion) =>
  descripcion == null || String(descripcion).trim() === ""
    ? null
    : String(descripcion).trim();

const normalizeNivelOrden = (nivelOrden) =>
  nivelOrden == null || String(nivelOrden).trim() === ""
    ? null
    : Number(nivelOrden);

const buildCreateCargoPayload = (nombre, descripcion = null, activo = true, parentId = null, nivelOrden = null) => {
  const body = {
    nombre: String(nombre).trim(),
    descripcion: normalizeDescription(descripcion),
    activo,
    nivelOrden: normalizeNivelOrden(nivelOrden),
  };
  if (parentId != null) {
    body.parentId = parentId;
  }
  return body;
};

// nivelOrden undefined = no enviarlo, para no borrar el nivel desde vistas que no lo editan
const buildUpdateCargoPayload = (nombre, descripcion = null, activo = true, nivelOrden = undefined) => {
  const body = {
    nombre: String(nombre).trim(),
    descripcion: normalizeDescription(descripcion),
    activo,
  };
  if (nivelOrden !== undefined) {
    body.nivelOrden = normalizeNivelOrden(nivelOrden);
  }
  return body;
};

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
