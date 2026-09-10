import { createCatalogStore } from "./factory";
import { ENDPOINTS } from "../config/api";

export const useAllRelacionesMofStore = createCatalogStore({
  storeId: "relaciones_mof",
  endpoint: ENDPOINTS.MOF.RELACIONES,
  stateKey: "relaciones",
  actionNames: {
    fetch: "getFetchRelaciones",
    create: "createRelacion",
    update: "updateRelacion",
    delete: "deleteRelacion",
  },
});