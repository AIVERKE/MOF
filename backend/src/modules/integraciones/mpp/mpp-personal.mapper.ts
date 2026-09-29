export interface MofPersonalRow {
  nombre: string;
  descripcion: string | null;
  cargoId: number;
}

export interface MppPersonal {
  id: number;
  descripcion: string;
  detalle: string;
}

/** Una fila por cargo: una unidad puede tener varias asignaciones del mismo cargo. */
export const toMppPersonal = (rows: MofPersonalRow[]): MppPersonal[] => [
  ...new Map(
    rows.map((r) => [
      r.cargoId,
      { id: r.cargoId, descripcion: r.nombre, detalle: r.descripcion ?? '' },
    ]),
  ).values(),
];
