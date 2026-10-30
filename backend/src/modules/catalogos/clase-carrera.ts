/**
 * Una clase (`tipo_unidad`) es de Carrera cuando su descripción menciona
 * "CARRERA" (ej: "DIRECCIONES DE CARRERA"), igual que el grupo "Carreras" de
 * coordinación interna en el frontend. No depende del id del catálogo.
 */
export function esClaseCarrera(descripcion?: string | null): boolean {
  if (!descripcion) return false;
  return descripcion
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .includes('CARRERA');
}
