import { useSnackbar } from "@/composables/useSnackbar";

/**
 * Encapsula los handlers CRUD repetidos (confirmAddItem y confirmDelete)
 * en las vistas de unidades (OrganigramaVueFlow, ListarUnidades, TreeUnidades).
 *
 * @param {object} options
 * @param {object} options.unidadesStore - Store de unidades
 * @param {Function} options.saveUnidad - Función de guardado proveniente de useUnidadForm
 * @param {Function} [options.onRefresh] - Callback de refresco (ej: refreshChart o getFetchUnidades)
 * @param {import('vue').Ref<boolean>} options.addDialog - Ref del diálogo de creación/edición
 * @param {import('vue').Ref<boolean>} options.deleteDialog - Ref del diálogo de eliminación
 * @param {import('vue').Ref<object>} [options.selectedNode] - Ref de la unidad seleccionada para borrar
 * @param {import('vue').Ref<object>} [options.itemToDelete] - Ref alternativo de la unidad a borrar
 */
export function useUnidadActions({
  unidadesStore,
  saveUnidad,
  onRefresh,
  addDialog,
  deleteDialog,
  selectedNode,
  itemToDelete,
}) {
  const { mostrar } = useSnackbar();

  async function confirmAddItem() {
    mostrar("Procesando...", "info");
    const result = await saveUnidad();
    if (result?.success) {
      if (addDialog) addDialog.value = false;
      mostrar("¡Operación realizada con éxito!", "success");
      if (typeof onRefresh === "function") {
        await onRefresh();
      } else if (unidadesStore?.getFetchUnidades) {
        await unidadesStore.getFetchUnidades();
      }
    } else {
      mostrar("Error: " + (result?.error || "Error al guardar"), "error");
    }
    return result;
  }

  async function confirmDelete(targetNode = null) {
    const node = targetNode || selectedNode?.value || itemToDelete?.value;
    if (!node || !node.id) return;

    const id = node.id;
    const list = unidadesStore?.unidades || [];
    const hasChildren = list.some((u) => {
      let pId = null;
      if (u.parent) {
        pId = typeof u.parent === "object" ? u.parent.id : u.parent;
      }
      return String(pId) === String(id);
    });

    if (hasChildren) {
      mostrar("No se puede eliminar: tiene unidades dependientes.", "error");
      if (deleteDialog) deleteDialog.value = false;
      return;
    }

    if (unidadesStore?.deletePersonalUnidad) {
      await unidadesStore.deletePersonalUnidad(id);
    }
    if (unidadesStore?.deleteUnidad) {
      await unidadesStore.deleteUnidad(id);
    }

    if (!unidadesStore?.error) {
      if (deleteDialog) deleteDialog.value = false;
      mostrar("¡Unidad eliminada!", "success");
      if (typeof onRefresh === "function") {
        await onRefresh();
      } else if (unidadesStore?.getFetchUnidades) {
        await unidadesStore.getFetchUnidades();
      }
    } else {
      mostrar("Error: " + unidadesStore.error, "error");
      if (deleteDialog) deleteDialog.value = false;
    }
  }

  return {
    confirmAddItem,
    confirmDelete,
  };
}
