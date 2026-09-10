import { createCatalogStore } from "./factory";
import { ENDPOINTS } from "../config/api";

export const useAllNivelesMofStore = createCatalogStore({
  storeId: "niveles_mof",
  endpoint: ENDPOINTS.MOF.NIVELES,
  stateKey: "niveles",
  actionNames: {
    fetch: "getFetchNiveles",
    create: "createNivel",
    update: "updateNivel",
    delete: "deleteNivel",
  },
});