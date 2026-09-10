import { createCatalogStore } from "./factory";
import { ENDPOINTS } from "../config/api";

export const useAllTiposMofStore = createCatalogStore({
  storeId: "tipos_mof",
  endpoint: ENDPOINTS.MOF.TIPOS,
  stateKey: "tipos",
  actionNames: {
    fetch: "getFetchTipos",
    create: "createTipo",
    update: "updateTipo",
    delete: "deleteTipo",
  },
});