import { ref, computed } from "vue";
import { getActivePinia } from "pinia";
import { 
  getSafeId, 
  getPesoReal,
  isClaseCarrera,
  checkUnidadAplicaProyectos,
} from "@/utils/mofHelpers";
import {
  getEmptyFormData,
  mapBackendToForm,
  mapFormToBackend,
  mapPersonalToCargos,
  toRelId,
} from "@/utils/mofMappers";
import { useConfigMofStore } from "@/stores/config_mof";

/**
 * Composable para gestionar la lógica del formulario de Unidades Administrativas (MOF)
 * Centraliza validaciones, carga de datos y sincronización delta (Cargos, Funciones, Dependencias)
 */
export function useUnidadForm(stores) {
  const { 
    unidadesStore, 
    cargosStore, 
    clasesStore, 
    nivelesStore, 
    tiposStore, 
    relacionesStore,
  } = stores;

  const configStore =
    stores.configStore ||
    (getActivePinia() ? useConfigMofStore() : null);

  // --- ESTADO DEL FORMULARIO (Sincronizado con backend NestJS) ---
  const formData = ref(getEmptyFormData(null, configStore?.defaults));

  const isEditMode = ref(false);
  const formValid = ref(false);
  const loading = ref(false);
  const saving = ref(false);
  const isCarrera = computed(() => isClaseCarrera(formData.value?.clase, clasesStore?.clases));
  const isAplicaProyectos = computed(() =>
    checkUnidadAplicaProyectos({
      clase: formData.value?.clase,
      parentId: formData.value?.parentId,
      unidad: selectedNode.value,
      unidades: unidadesStore?.unidades,
      clases: clasesStore?.clases,
    }),
  );
  const selectedNode = ref(null);

  // Estados para deltas
  const cargosOriginales = ref([]);
  const funcionesOriginales = ref([]);
  const dependenciasOriginales = ref([]);

  // --- MÉTODOS DE CARGA ---

  /**
   * Inicializa el formulario para creación o edición
   */
  async function openForm(node = null, edit = false) {
    isEditMode.value = edit;
    selectedNode.value = node;
    loading.value = true;

    try {
      // 1. Asegurar catálogos cargados
      await Promise.all([
        unidadesStore.unidades.length === 0 ? unidadesStore.getFetchUnidades() : Promise.resolve(),
        clasesStore.clases.length === 0 ? clasesStore.getFetchClases() : Promise.resolve(),
        nivelesStore.niveles.length === 0 ? nivelesStore.getFetchNiveles() : Promise.resolve(),
        tiposStore.tipos.length === 0 ? tiposStore.getFetchTipos() : Promise.resolve(),
        relacionesStore.relaciones.length === 0 ? relacionesStore.getFetchRelaciones() : Promise.resolve(),
        cargosStore.cargos.length === 0 ? cargosStore.getFetchCargos() : Promise.resolve(),
        configStore?.fetchConfig ? configStore.fetchConfig() : Promise.resolve(),
      ]);

      if (edit && node) {
        // Carga de datos extendidos para edición
        const [fullData, personalData, funcionesData] = await Promise.all([
          unidadesStore.getUnidadById(node.id),
          unidadesStore.getPersonalUnidad(node.id),
          unidadesStore.getFunciones(node.id)
        ]);

        if (fullData) {
          const mappedCargos = mapPersonalToCargos(personalData, cargosStore.cargos);

          formData.value = mapBackendToForm(fullData, {
            catalogs: {
              clases: clasesStore.clases,
              niveles: nivelesStore.niveles,
              tipos: tiposStore.tipos,
              relaciones: relacionesStore.relaciones,
            },
            funcionesData,
            mappedCargos,
          });

          cargosOriginales.value = mappedCargos.map((c) => ({ ...c }));
          funcionesOriginales.value = [...(funcionesData || [])];
          dependenciasOriginales.value = [...formData.value.dependenciasFuncionales];
          formValid.value = true;
        }
      } else {
        // Reset para creación con defaults dinámicos del backend
        formData.value = getEmptyFormData(node ? getSafeId(node.id) : null, configStore?.defaults);
        cargosOriginales.value = [];
        funcionesOriginales.value = [];
        dependenciasOriginales.value = [];
        formValid.value = false;
      }
    } finally {
      loading.value = false;
    }
  }

  // --- LÓGICA DE PERSISTENCIA ---

  /**
   * Guarda o actualiza la unidad y sincroniza sus relaciones
   */
  async function saveUnidad() {
    // Un segundo clic mientras se guarda reenviaría todos los cargos nuevos con el mismo snapshot original.
    if (saving.value) return { success: false, busy: true };
    saving.value = true;
    try {
      return await doSaveUnidad();
    } finally {
      saving.value = false;
    }
  }

  async function doSaveUnidad() {
    if (!formValid.value) return { success: false, error: "Formulario inválido" };

    const pIdVal = formData.value.parentId;

    // 0. Bloqueo de creación de raíces sueltas cuando la estructura ya tiene unidades
    if (!isEditMode.value && !pIdVal && unidadesStore.unidades?.length > 0) {
      return {
        success: false,
        error: "No se puede crear una unidad raíz suelta cuando ya existe una estructura cargada. Debe registrarla como dependiente de una unidad existente.",
      };
    }

    // 1. Validación de Jerarquía
    if (pIdVal) {
      const parentNode = unidadesStore.unidades.find(u => String(u.id) === String(pIdVal));
      if (parentNode) {
        const parentWeight = getPesoReal(parentNode, clasesStore.clases);
        const currentWeight = getPesoReal({ clase: formData.value.clase }, clasesStore.clases);

        if (currentWeight <= parentWeight) {
          const claseNombre = clasesStore.clases.find(c => String(c.id) === String(formData.value.clase))?.descripcion || "seleccionada";
          const padreNombre = clasesStore.clases.find(c => String(c.id) === String(parentNode.clase))?.descripcion || "del padre";
          return { 
            success: false, 
            error: `Inconsistencia Jerárquica: Una unidad de clase "${claseNombre}" (Nivel ${currentWeight}) no puede depender de una "${padreNombre}" (Nivel ${parentWeight}).` 
          };
        }
      }
    }

    // Validación de inventarios: si una fila tiene descripción, su cantidad debe ser un entero >= 1
    if (Array.isArray(formData.value?.inventarios)) {
      const invalidInventario = formData.value.inventarios.find(
        (i) =>
          i &&
          typeof i.descripcion === "string" &&
          i.descripcion.trim().length > 0 &&
          (i.cantidad === "" ||
            i.cantidad == null ||
            Number(i.cantidad) < 1 ||
            !Number.isInteger(Number(i.cantidad)))
      );
      if (invalidInventario) {
        return {
          success: false,
          error: `El ítem de inventario "${invalidInventario.descripcion}" debe tener una cantidad mayor o igual a 1.`,
        };
      }
    }

    const isAplicaProy = checkUnidadAplicaProyectos({
      clase: formData.value.clase,
      parentId: formData.value.parentId,
      unidad: selectedNode.value,
      unidades: unidadesStore.unidades,
      clases: clasesStore?.clases,
    });

    const dataToSend = mapFormToBackend(formData.value, {
      isCarrera: isCarrera.value,
      aplicaProyectos: isAplicaProy,
      clasesCatalog: clasesStore?.clases,
    });

    let success = false;
    let unidadId = formData.value.id;

    try {
      if (isEditMode.value) {
        await unidadesStore.updateUnidad(unidadId, dataToSend);
        success = !unidadesStore.error;
      } else {
        const created = await unidadesStore.createUnidad(dataToSend);
        if (created) {
          success = true;
          unidadId = created.id || created;
        }
      }

      if (success && unidadId) {
        // --- SINCRONIZACIÓN DE CARGOS ---
        const oldByCargo = new Map(
          cargosOriginales.value.map((m) => [String(m.cargoId), m]),
        );
        const newByCargo = new Map(
          (formData.value.cargos || []).map((c) => [String(c.cargoId), c]),
        );

        for (const [cargoId, old] of oldByCargo) {
          if (!newByCargo.has(cargoId) && old.assignmentId) {
            await unidadesStore.deleteCargoDeUnidad(unidadId, old.assignmentId);
          }
        }
        for (const [cargoId, row] of newByCargo) {
          const old = oldByCargo.get(cargoId);
          const nivelOrden = row.nivelOrden ?? null;
          if (!old) {
            await unidadesStore.updatePersonalUnidad(unidadId, cargoId, nivelOrden);
          } else if (old.assignmentId && (old.nivelOrden ?? null) !== nivelOrden) {
            await unidadesStore.updateNivelCargoUnidad(unidadId, old.assignmentId, nivelOrden);
          }
        }

        // --- SINCRONIZACIÓN DE FUNCIONES (MOF-013) ---
        // Regla de oro: Blindar IDs. Nunca delete+create de filas existentes.
        const oldFuncs = funcionesOriginales.value || [];
        const newFuncs = formData.value.funciones || [];
        const newIdsSet = new Set(
          newFuncs
            .filter((f) => f.id != null && f.id !== "")
            .map((f) => String(f.id)),
        );

        // 1. Eliminar únicamente las funciones que el usuario removió de la tabla
        for (const f of oldFuncs) {
          if (f.id != null && !newIdsSet.has(String(f.id))) {
            await unidadesStore.deleteFuncion(unidadId, f.id);
          }
        }

        // 2. Crear las nuevas o actualizar existentes preservando orden
        for (const f of newFuncs) {
          if (!f.id) {
            // Fila nueva sin ID
            await unidadesStore.createFuncion(unidadId, {
              funcion: f.funcion,
              baseLegal: f.baseLegal || null,
            });
          } else {
            // Fila persistida: Actualizar contenido solo si fue modificado (preservando ID y orden)
            const orig = oldFuncs.find((of) => String(of.id) === String(f.id));
            if (
              orig &&
              (orig.funcion !== f.funcion || orig.baseLegal !== f.baseLegal)
            ) {
              await unidadesStore.updateFuncion(unidadId, f.id, {
                funcion: f.funcion,
                baseLegal: f.baseLegal || null,
              });
            }
          }
        }

        return { success: true, unidadId };
      }

      return {
        success: false,
        error: unidadesStore.error || "Error desconocido al guardar",
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // --- HELPERS PARA UI (MOF-013) ---
  function addFuncion(funcion, baseLegal) {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    formData.value.funciones.push({
      id: null,
      tempId,
      funcion,
      baseLegal: baseLegal || "",
    });
  }

  function updateFuncion(index, funcion, baseLegal) {
    if (index >= 0 && index < formData.value.funciones.length) {
      const existing = formData.value.funciones[index];
      formData.value.funciones[index] = {
        ...existing,
        funcion,
        baseLegal: baseLegal || "",
      };
    }
  }

  function removeFuncion(index) {
    if (index >= 0 && index < formData.value.funciones.length) {
      formData.value.funciones.splice(index, 1);
    }
  }

  async function moverFuncionArriba(index) {
    if (index <= 0 || !formData.value.funciones?.length) return;
    const current = formData.value.funciones[index];
    const prev = formData.value.funciones[index - 1];

    // Reordenamiento local reactivo
    formData.value.funciones[index] = prev;
    formData.value.funciones[index - 1] = current;

    // Persistencia inmediata en BD si ambas filas ya están guardadas en el backend
    const unidadId = formData.value.id || selectedNode.value?.id;
    if (isEditMode.value && current?.id && prev?.id && unidadId) {
      await unidadesStore.subirFuncion(unidadId, current.id);
    }
  }

  async function moverFuncionAbajo(index) {
    if (
      index < 0 ||
      !formData.value.funciones?.length ||
      index >= formData.value.funciones.length - 1
    )
      return;
    const current = formData.value.funciones[index];
    const next = formData.value.funciones[index + 1];

    // Reordenamiento local reactivo
    formData.value.funciones[index] = next;
    formData.value.funciones[index + 1] = current;

    // Persistencia inmediata en BD si ambas filas ya están guardadas en el backend
    const unidadId = formData.value.id || selectedNode.value?.id;
    if (isEditMode.value && current?.id && next?.id && unidadId) {
      await unidadesStore.bajarFuncion(unidadId, current.id);
    }
  }

  function addRelacionInterna(relacionadaId, tipo = null) {
    if (toRelId(relacionadaId) == null) return;
    const exists = formData.value.relacionesInternas.some(
      (r) => Number(typeof r === "object" && r !== null ? r.relacionadaId : r) === Number(relacionadaId)
    );
    if (!exists) {
      const encontrada = unidadesStore.unidades.find(
        (u) => String(u.id) === String(relacionadaId)
      );
      formData.value.relacionesInternas.push({
        relacionadaId: Number(relacionadaId),
        codigo: encontrada?.codigo || "",
        nombre: encontrada?.nombre || encontrada?.denominacion || `Unidad ${relacionadaId}`,
        sigla: encontrada?.sigla || "",
        tipo: tipo || null,
      });
    }
  }

  function removeRelacionInterna(index) {
    if (index >= 0 && index < formData.value.relacionesInternas.length) {
      formData.value.relacionesInternas.splice(index, 1);
    }
  }

  function addRelacionExterna(descripcion) {
    const desc = (descripcion || "").trim();
    if (!desc) return;
    formData.value.relacionesExternas.push({
      descripcion: desc,
    });
  }

  function removeRelacionExterna(index) {
    if (index >= 0 && index < formData.value.relacionesExternas.length) {
      formData.value.relacionesExternas.splice(index, 1);
    }
  }

  return {
    formData,
    isEditMode,
    formValid,
    loading,
    saving,
    isCarrera,
    isAplicaProyectos,
    selectedNode,
    openForm,
    saveUnidad,
    addFuncion,
    updateFuncion,
    removeFuncion,
    moverFuncionArriba,
    moverFuncionAbajo,
    addRelacionInterna,
    removeRelacionInterna,
    addRelacionExterna,
    removeRelacionExterna,
  };
}
