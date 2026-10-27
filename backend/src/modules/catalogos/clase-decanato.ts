/**
 * Una clase (`tipo_unidad`) es de Decanato cuando su descripción menciona
 * "DECANATO" (ej: "DECANATOS", "VICEDECANATOS"). Sus unidades y todas las que
 * dependen linealmente de ellas llevan el bloque de Proyectos.
 */
export function esClaseDecanato(descripcion?: string | null): boolean {
  if (!descripcion) return false;
  return descripcion
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .includes('DECANATO');
}
