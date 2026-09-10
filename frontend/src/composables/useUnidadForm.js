import { ref } from "vue";
import { 
  getSafeId, 
  parseDateFromApi, 
  formatDateToString,
  getPesoReal 
} from "@/utils/mofHelpers";

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
    relacionesStore 
  } = stores;

  // --- ESTADO DEL FORMULARIO (Sincronizado con backend NestJS) ---
  const formData = ref({
    id: null,
    nombre: "",
    codigo: "",
    sigla: "",
    baseLegal: "",
    resCreacion: "",
    objetivo: "",
    fecCreacion: null,
    relacion: null,
    cargos: [],
    funciones: [],
    dependenciasFuncionales: [],
    tipo: null,
    nivel: null,
    clase: null,
    parentId: null,
    color: "#1976D2",
    oficial: true,
    es_troncal: false,
    lado: "AUTOMATICO",
    tramitesAtendidos: "",
    ejecucionPoa: "",
    ejecucionPresupuestaria: "",
    cargaHorariaProgramada: "",
    cargaHorariaEjecutada: "",
    infraestructura: "",
    ubicacion: "",
    relacionesInternas: [],
    relacionesExternas: []
  });

  const isEditMode = ref(false);
  const formValid = ref(false);
  const loading = ref(false);
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
        cargosStore.cargos.length === 0 ? cargosStore.getFetchCargos() : Promise.resolve()
      ]);

      if (edit && node) {
        // Carga de datos extendidos para edición
        const [fullData, personalData, funcionesData] = await Promise.all([
          unidadesStore.getUnidadById(node.id),
          unidadesStore.getPersonalUnidad(node.id),
          unidadesStore.getFunciones(node.id)
        ]);

        if (fullData) {
          const personalArray = Array.isArray(personalData) ? personalData : (personalData ? [personalData] : []);
          const mappedCargos = personalArray.map(p => {
            const cat = cargosStore.cargos.find(c => c.descripcion === p.descripcion);
            return cat ? { catalogId: String(cat.id), assignmentId: String(p.id) } : null;
          }).filter(Boolean);

          // Helper para resolver IDs desde texto (usado en ListarUnidades)
          const findIdByText = (catalog, text) => {
            if (!text) return null;
            const search = String(text).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const item = catalog.find(i => 
              String(i.value || i.id).trim().toLowerCase() === search ||
              (i.description || i.descripcion || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(search)
            );
            return item ? (item.value || item.id) : text;
          };

          formData.value = {
            id: fullData.id,
            nombre: fullData.nombre || fullData.denominacion || "",
            codigo: fullData.codigo || "",
            sigla: fullData.sigla || "",
            baseLegal: fullData.base_legal || fullData.baseLegal || "",
            resCreacion: fullData.res_creacion || fullData.resCreacion || "",
            objetivo: fullData.objetivo || fullData.objetivo_puesto || "",
            funciones: (funcionesData || []).map(f => ({
              id: f.id,
              tempId: f.id ? String(f.id) : `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              funcion: f.funcion,
              baseLegal: f.baseLegal || "",
              orden: f.orden
            })),
            fecCreacion: parseDateFromApi(fullData.fec_creacion || fullData.fecCreacion),
            dependenciasFuncionales: (fullData.dependenciasFuncionales || []).map(d => getSafeId(d)).filter(id => id !== null),
            clase: getSafeId(fullData.clase) || findIdByText(clasesStore.clases, fullData.clase),
            nivel: getSafeId(fullData.nivel) || findIdByText(nivelesStore.niveles, fullData.nivel),
            tipo: getSafeId(fullData.tipo) || findIdByText(tiposStore.tipos, fullData.tipo),
            relacion: getSafeId(fullData.relacion) || findIdByText(relacionesStore.relaciones, fullData.relacion),
            parentId: getSafeId(fullData.parent || fullData.parentId),
            cargos: mappedCargos.map(m => m.catalogId),
            color: fullData.color || "#1976D2",
            oficial: fullData.oficial !== false,
            es_troncal: fullData.es_troncal === true,
            lado: fullData.lado || "AUTOMATICO",
            tramitesAtendidos: fullData.tramitesAtendidos || fullData.tramites_atendidos || "",
            ejecucionPoa: fullData.ejecucionPoa || fullData.ejecucion_poa || "",
            ejecucionPresupuestaria: fullData.ejecucionPresupuestaria || fullData.ejecucion_presupuestaria || "",
            cargaHorariaProgramada: fullData.cargaHorariaProgramada || fullData.carga_horaria_programada || "",
            cargaHorariaEjecutada: fullData.cargaHorariaEjecutada || fullData.carga_horaria_ejecutada || "",
            infraestructura: fullData.infraestructura || fullData.infraestructura_fisica || "",
            ubicacion: fullData.ubicacion || "",
            relacionesInternas: (fullData.relacionesInternas || []).map(r => ({
              id: r.id,
              relacionadaId: r.relacionadaId || r.unidadDestinoId || r.id,
              codigo: r.codigo,
              nombre: r.nombre || r.unidadDestinoNombre,
              sigla: r.sigla,
              tipo: r.tipo || null,
              descripcion: r.descripcion || null,
            })),
            relacionesExternas: (fullData.relacionesExternas || []).map(r => ({
              id: r.id,
              entidadExterna: r.entidadExterna || "",
              descripcion: r.descripcion || (typeof r === "string" ? r : ""),
            }))
          };

          cargosOriginales.value = [...mappedCargos];
          funcionesOriginales.value = [...(funcionesData || [])];
          dependenciasOriginales.value = [...formData.value.dependenciasFuncionales];
          formValid.value = true;
        }
      } else {
        // Reset para creación
        formData.value = {
          id: null,
          nombre: "",
          codigo: "",
          sigla: "",
          baseLegal: "",
          resCreacion: "",
          objetivo: "",
          fecCreacion: null,
          relacion: null,
          cargos: [],
          funciones: [],
          dependenciasFuncionales: [],
          tipo: null,
          nivel: null,
          clase: null,
          parentId: node ? getSafeId(node.id) : null,
          color: "#1976D2",
          oficial: true,
          es_troncal: false,
          lado: "AUTOMATICO",
          tramitesAtendidos: "",
          ejecucionPoa: "",
          ejecucionPresupuestaria: "",
          cargaHorariaProgramada: "",
          cargaHorariaEjecutada: "",
          infraestructura: "",
          ubicacion: "",
          relacionesInternas: [],
          relacionesExternas: []
        };
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
    if (!formValid.value) return { success: false, error: "Formulario inválido" };

    const pIdVal = formData.value.parentId;

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

    const isTroncal = formData.value.es_troncal === true;
    const dataToSend = {
      codigo: formData.value.codigo?.trim() || "",
      sigla: formData.value.sigla?.trim() || "",
      nombre: formData.value.nombre?.trim() || "",
      baseLegal: formData.value.baseLegal?.trim() || "",
      parentId: pIdVal || null,
      tipo: getSafeId(formData.value.tipo) || 1,
      nivel: getSafeId(formData.value.nivel) || 1,
      relacion: getSafeId(formData.value.relacion) || 1,
      resCreacion: formData.value.resCreacion?.trim() || "",
      fecCreacion: formatDateToString(formData.value.fecCreacion) || null,
      objetivo: formData.value.objetivo?.trim() || "",
      color: formData.value.color || "#1976D2",
      tipoUnidad: getSafeId(formData.value.clase) || 1,
      oficial: formData.value.oficial !== false,
      esTroncal: isTroncal,
      lado: isTroncal ? "CENTRO" : (formData.value.lado || "AUTOMATICO"),
      dependenciasFuncionales: (formData.value.dependenciasFuncionales || []).map(d => getSafeId(d)).filter(id => id !== null),
      tramitesAtendidos: formData.value.tramitesAtendidos?.trim() || null,
      ejecucionPoa: formData.value.ejecucionPoa?.trim() || null,
      ejecucionPresupuestaria: formData.value.ejecucionPresupuestaria?.trim() || null,
      cargaHorariaProgramada: formData.value.cargaHorariaProgramada?.trim() || null,
      cargaHorariaEjecutada: formData.value.cargaHorariaEjecutada?.trim() || null,
      infraestructura: formData.value.infraestructura?.trim() || null,
      ubicacion: formData.value.ubicacion?.trim() || null,
      relacionesInternas: (formData.value.relacionesInternas || []).map(r => ({
        relacionadaId: Number(r.relacionadaId || r.id || r),
        tipo: r.tipo || null,
      })),
      relacionesExternas: (formData.value.relacionesExternas || [])
        .map(r => typeof r === 'object' ? r.descripcion?.trim() : String(r).trim())
        .filter(Boolean),
    };

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
        const oldIds = cargosOriginales.value.map(m => String(m.catalogId));
        const newIds = (formData.value.cargos || []).map(c => String(c));
        
        const toAdd = newIds.filter(id => !oldIds.includes(id));
        const toRem = oldIds.filter(id => !newIds.includes(id));

        for (const id of toRem) {
          const m = cargosOriginales.value.find(x => x.catalogId === id);
          if (m?.assignmentId) await unidadesStore.deleteCargoDeUnidad(unidadId, m.assignmentId);
        }
        for (const id of toAdd) await unidadesStore.updatePersonalUnidad(unidadId, id);

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
    if (!relacionadaId) return;
    const exists = formData.value.relacionesInternas.some(
      (r) => String(r.relacionadaId || r.id || r) === String(relacionadaId)
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
