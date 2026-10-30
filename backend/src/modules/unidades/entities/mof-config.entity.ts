import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type MofConfigDefaults = {
  tipo: number;
  nivel: number;
  relacion: number;
  clase: number;
  color: string;
  lado: string;
  oficial: boolean;
  es_troncal: boolean;
};

export type MofConfigReglas = {
  pesoNulo: number;
  pesoDefault: number;
  defaultClaseColor: string;
  staffRelacionCodigos: string[];
  ladoTroncalForzado: string;
};

export type MofPasswordPolicy = {
  minLength: number;
};

/** Fila única (id = 1) con la configuración dinámica del MOF. */
@Entity('mof_config')
export class MofConfig {
  @PrimaryColumn({ type: 'smallint', default: 1 })
  id: number;

  @Column({ type: 'jsonb' })
  defaults: MofConfigDefaults;

  @Column({ type: 'jsonb' })
  reglas: MofConfigReglas;

  @Column({ type: 'jsonb' })
  paleta: string[][];

  /** Colores de nodo por posición de Clase cuando ni la unidad ni la Clase tienen color. */
  @Column({
    name: 'paleta_nodos',
    type: 'jsonb',
    default: () =>
      `'["#1D4ED8","#B91C1C","#047857","#B45309","#6D28D9","#BE185D","#0369A1","#C2410C"]'`,
  })
  paletaNodos: string[];

  @Column({
    name: 'password_policy',
    type: 'jsonb',
    default: () => `'{"minLength":6}'`,
  })
  passwordPolicy: MofPasswordPolicy;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
