import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @Column({
    name: 'password_policy',
    type: 'jsonb',
    default: () => `'{"minLength":6}'`,
  })
  passwordPolicy: MofPasswordPolicy;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
