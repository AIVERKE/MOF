import {
  getNivelNombre,
  getTipoNombre,
  getRelacionNombre,
  getClaseNombre,
  getClaseColor,
  isUnidadOficial,
} from "@/utils/mofHelpers";

/**
 * Composable que centraliza los resolvers de catálogo MOF (nombres, colores y oficialidad).
 * Acepta stores como parámetros posicionales o como un objeto de opciones:
 * useMofResolvers(clasesStore, nivelesStore, tiposStore, relacionesStore)
 * useMofResolvers({ clasesStore, nivelesStore, tiposStore, relacionesStore })
 *
 * @param {object} clasesStore
 * @param {object} nivelesStore
 * @param {object} tiposStore
 * @param {object} relacionesStore
 */
export function useMofResolvers(
  clasesStore,
  nivelesStore,
  tiposStore,
  relacionesStore,
) {
  let cStore = clasesStore;
  let nStore = nivelesStore;
  let tStore = tiposStore;
  let rStore = relacionesStore;

  if (
    clasesStore &&
    typeof clasesStore === "object" &&
    !clasesStore.clases &&
    (clasesStore.clasesStore ||
      clasesStore.nivelesStore ||
      clasesStore.tiposStore ||
      clasesStore.relacionesStore)
  ) {
    cStore = clasesStore.clasesStore;
    nStore = clasesStore.nivelesStore;
    tStore = clasesStore.tiposStore;
    rStore = clasesStore.relacionesStore;
  }

  const resolveNivel = (val) => getNivelNombre(val, nStore?.niveles ?? []);
  const resolveTipo = (val) => getTipoNombre(val, tStore?.tipos ?? []);
  const resolveRelacion = (val) =>
    getRelacionNombre(val, rStore?.relaciones ?? []);
  const resolveClase = (val) => getClaseNombre(val, cStore?.clases ?? []);
  const resolveClaseColor = (val) => getClaseColor(val, cStore?.clases ?? []);
  const checkOficial = (u) => isUnidadOficial(u, cStore?.clases ?? []);

  return {
    resolveNivel,
    resolveTipo,
    resolveRelacion,
    resolveClase,
    resolveClaseColor,
    checkOficial,
  };
}
